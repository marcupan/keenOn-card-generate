import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { User, Card, Folder } from '../entities';
import Logger from '../utils/logger';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

@Service()
export class ArchiveService {
	constructor(
		@InjectRepository(User) private userRepository: Repository<User>,
		@InjectRepository(Card) private cardRepository: Repository<Card>,
		@InjectRepository(Folder) private folderRepository: Repository<Folder>,
		private readonly logger = Logger.getLogger('ArchiveService')
	) {}

	/**
	 * Archive old records to JSON files
	 * @param olderThanDays Number of days to consider a record as old
	 * @param archivePath Path to store archive files
	 */
	public async archiveOldRecords(
		olderThanDays: number = 365,
		archivePath: string = 'archives'
	): Promise<void> {
		try {
			const date = new Date();
			date.setDate(date.getDate() - olderThanDays);

			await this.ensureArchiveDirectoryExists(archivePath);

			const timestamp = new Date().toISOString().replace(/:/g, '-');

			await this.archiveUsers(date, archivePath, timestamp);

			await this.archiveFolders(date, archivePath, timestamp);

			await this.archiveCards(date, archivePath, timestamp);

			this.logger.info(
				`Successfully archived records older than ${olderThanDays} days`
			);
		} catch (error) {
			this.logger.error('Failed to archive old records', { error });
			throw error;
		}
	}

	/**
	 * Ensure the archive directory exists
	 * @param archivePath Path to store archive files
	 */
	private async ensureArchiveDirectoryExists(
		archivePath: string
	): Promise<void> {
		try {
			await mkdirAsync(archivePath, { recursive: true });
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error('Failed to archive data', {
					error: error.message,
				});
			} else {
				this.logger.error('Failed to archive data', {
					error: String(error),
				});
			}
		}
	}

	/**
	 * Archive old users
	 * @param date Date threshold for archiving
	 * @param archivePath Path to store archive files
	 * @param timestamp Timestamp for filename
	 */
	private async archiveUsers(
		date: Date,
		archivePath: string,
		timestamp: string
	): Promise<void> {
		const users = await this.userRepository
			.createQueryBuilder('user')
			.where('user.created_at < :date', { date })
			.getMany();

		if (users.length > 0) {
			const filePath = path.join(archivePath, `users_${timestamp}.json`);
			await writeFileAsync(filePath, JSON.stringify(users, null, 2));

			this.logger.info(`Archived ${users.length} users to ${filePath}`);
		}
	}

	/**
	 * Archive old folders
	 * @param date Date threshold for archiving
	 * @param archivePath Path to store archive files
	 * @param timestamp Timestamp for filename
	 */
	private async archiveFolders(
		date: Date,
		archivePath: string,
		timestamp: string
	): Promise<void> {
		const folders = await this.folderRepository
			.createQueryBuilder('folder')
			.where('folder.created_at < :date', { date })
			.getMany();

		if (folders.length > 0) {
			const filePath = path.join(
				archivePath,
				`folders_${timestamp}.json`
			);
			await writeFileAsync(filePath, JSON.stringify(folders, null, 2));
			this.logger.info(
				`Archived ${folders.length} folders to ${filePath}`
			);
		}
	}

	/**
	 * Archive old cards
	 * @param date Date threshold for archiving
	 * @param archivePath Path to store archive files
	 * @param timestamp Timestamp for filename
	 */
	private async archiveCards(
		date: Date,
		archivePath: string,
		timestamp: string
	): Promise<void> {
		const cards = await this.cardRepository
			.createQueryBuilder('card')
			.where('card.created_at < :date', { date })
			.getMany();

		if (cards.length > 0) {
			const filePath = path.join(archivePath, `cards_${timestamp}.json`);
			await writeFileAsync(filePath, JSON.stringify(cards, null, 2));
			this.logger.info(`Archived ${cards.length} cards to ${filePath}`);
		}
	}
}
