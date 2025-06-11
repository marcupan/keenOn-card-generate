import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import config from 'config';
import * as cron from 'node-cron';
import { Service } from 'typedi';

import Logger from '../utils/logger';

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
}

@Service()
export class BackupService {
	private dbConfig: DatabaseConfig;
	private backupDir: string;

	constructor(private readonly logger = Logger.getLogger('ArchiveService')) {
		this.dbConfig = {
			host: config.get<string>('database.host'),
			port: config.get<number>('database.port'),
			username: config.get<string>('database.username'),
			password: config.get<string>('database.password'),
			database: config.get<string>('database.name'),
		};
		this.backupDir = config.get<string>('backup.directory') || 'backups';
	}

	/**
	 * Initialize backup service and schedule backups
	 */
	public async initialize(): Promise<void> {
		await this.ensureBackupDirectoryExists();
		this.scheduleBackups();
	}

	/**
	 * Schedule automatic backups
	 */
	private scheduleBackups(): void {
		cron.schedule('0 2 * * *', async () => {
			try {
				await this.createBackup();
				this.logger.info('Scheduled backup completed successfully');
			} catch (error) {
				this.logger.error('Scheduled backup failed', { error });
			}
		});

		this.logger.info('Backup schedule initialized');
	}

	/**
	 * Ensure a backup directory exists
	 */
	private async ensureBackupDirectoryExists(): Promise<void> {
		try {
			await mkdirAsync(this.backupDir, { recursive: true });
			this.logger.info(`Backup directory created: ${this.backupDir}`);
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error('Failed to create backup', {
					error: error.message,
				});
			} else {
				this.logger.error('Failed to create backup', {
					error: String(error),
				});
			}
		}
	}

	/**
	 * Create a database backup
	 * @param customFilename Optional custom filename for the backup
	 * @returns Path to the created backup file
	 */
	public async createBackup(customFilename?: string): Promise<string> {
		try {
			const timestamp = new Date().toISOString().replace(/:/g, '-');
			const filename = customFilename ?? `backup-${timestamp}.sql`;
			const filePath = path.join(this.backupDir, filename);

			const command = `pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f ${filePath}`;

			const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

			await execAsync(command, { env });

			this.logger.info(`Database backup created: ${filePath}`);
			return filePath;
		} catch (error) {
			this.logger.error('Database backup failed', { error });
			throw error;
		}
	}

	/**
	 * Restore database from a backup file
	 * @param filePath Path to the backup file
	 */
	public async restoreBackup(filePath: string): Promise<void> {
		try {
			if (!fs.existsSync(filePath)) {
				throw new Error(`Backup file not found: ${filePath}`);
			}

			const command = `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f ${filePath}`;

			const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

			await execAsync(command, { env });

			this.logger.info(`Database restored from backup: ${filePath}`);
		} catch (error) {
			this.logger.error('Database restore failed', { error });
			throw error;
		}
	}

	/**
	 * List all available backups
	 * @returns Array of backup file paths
	 */
	public async listBackups(): Promise<string[]> {
		try {
			const files = await fs.promises.readdir(this.backupDir);
			const backupFiles = files.filter((file) => file.endsWith('.sql'));
			return backupFiles.map((file) => path.join(this.backupDir, file));
		} catch (error) {
			this.logger.error('Failed to list backups', { error });
			throw error;
		}
	}

	/**
	 * Delete a backup file
	 * @param filePath Path to the backup file
	 */
	public async deleteBackup(filePath: string): Promise<void> {
		try {
			if (!fs.existsSync(filePath)) {
				throw new Error(`Backup file not found: ${filePath}`);
			}

			await fs.promises.unlink(filePath);
			this.logger.info(`Backup deleted: ${filePath}`);
		} catch (error) {
			this.logger.error('Failed to delete backup', { error });
			throw error;
		}
	}
}
