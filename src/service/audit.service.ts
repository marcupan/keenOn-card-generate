import { Service } from 'typedi';
import { Repository, EntityManager } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { User } from '../entities';
import Logger from '../utils/logger';

/**
 * Audit action types
 */
export enum AuditActionType {
	CREATE = 'CREATE',
	READ = 'READ',
	UPDATE = 'UPDATE',
	DELETE = 'DELETE',
	LOGIN = 'LOGIN',
	LOGOUT = 'LOGOUT',
	FAILED_LOGIN = 'FAILED_LOGIN',
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
	id: string;
	timestamp: Date;
	userId: string | null;
	action: AuditActionType;
	entityType: string;
	entityId: string | null;
	details: Record<string, unknown>;
	ipAddress: string | null;
	userAgent: string | null;
}

/**
 * Service for creating and managing audit logs
 */
@Service()
export class AuditService {
	constructor(
		@InjectRepository(User) private userRepository: Repository<User>,
		private readonly logger = Logger.getLogger('ArchiveService')
	) {}

	/**
	 * Log an audit event
	 * @param params Audit log parameters
	 * @param entityManager Optional entity manager for transactions
	 */
	public async log(
		params: {
			userId: string | null;
			action: AuditActionType;
			entityType: string;
			entityId?: string | null;
			details?: Record<string, unknown>;
			ipAddress?: string | null;
			userAgent?: string | null;
		},
		entityManager?: EntityManager
	): Promise<void> {
		try {
			const {
				userId,
				action,
				entityType,
				entityId = null,
				details = {},
				ipAddress = null,
				userAgent = null,
			} = params;

			let userRecord: User | null = null;

			if (userId) {
				userRecord = await (
					entityManager
						? entityManager.getRepository(User)
						: this.userRepository
				).findOne({ where: { id: userId } });
			}

			const auditLog = {
				timestamp: new Date(),
				userId,
				userEmail: userRecord?.email ?? null,
				action,
				entityType,
				entityId,
				details,
				ipAddress,
				userAgent,
			};

			// TODO: add actual
			this.saveAuditLog(auditLog, entityManager);

			this.logger.info('Audit log entry created', { auditLog });
		} catch (error) {
			this.logger.error('Failed to create audit log entry', {
				error,
				params,
			});
		}
	}

	/**
	 * Save audit log to a database or external service
	 * @param auditLog Audit log entry
	 * @param entityManager Optional entity manager for transactions
	 */
	private saveAuditLog(
		auditLog: Omit<AuditLogEntry, 'id'>,
		entityManager?: EntityManager
	): void {
		try {
			// In a real implementation, this would save to a database table or external service
			// For now, we'll just log it to the console in a structured format

			// If we have an entity manager (transaction context), use it
			if (entityManager) {
				// Example of how to save to a database table if we had an AuditLog entity
				// await entityManager.save(AuditLog, auditLog);

				// For now, just log it
				console.log(JSON.stringify(auditLog));
			} else {
				console.log(JSON.stringify(auditLog));
			}
		} catch (error) {
			this.logger.error('Failed to save audit log', { error, auditLog });
		}
	}

	/**
	 * Log a data access event
	 * @param userId User ID
	 * @param action Action type
	 * @param entityType Entity type
	 * @param entityId Entity ID
	 * @param details Additional details
	 * @param ipAddress IP address
	 * @param userAgent User agent
	 * @param entityManager Optional entity manager for transactions
	 */
	public async logDataAccess(
		userId: string | null,
		action: AuditActionType,
		entityType: string,
		entityId: string | null,
		details: Record<string, unknown> = {},
		ipAddress: string | null = null,
		userAgent: string | null = null,
		entityManager?: EntityManager
	): Promise<void> {
		await this.log(
			{
				userId,
				action,
				entityType,
				entityId,
				details,
				ipAddress,
				userAgent,
			},
			entityManager
		);
	}

	/**
	 * Log a user authentication event
	 * @param userId User ID (null for failed logins)
	 * @param action Action type (LOGIN, LOGOUT, FAILED_LOGIN)
	 * @param details Additional details
	 * @param ipAddress IP address
	 * @param userAgent User agent
	 * @param entityManager Optional entity manager for transactions
	 */
	public async logAuthEvent(
		userId: string | null,
		action:
			| AuditActionType.LOGIN
			| AuditActionType.LOGOUT
			| AuditActionType.FAILED_LOGIN,
		details: Record<string, unknown> = {},
		ipAddress: string | null = null,
		userAgent: string | null = null,
		entityManager?: EntityManager
	): Promise<void> {
		await this.log(
			{
				userId,
				action,
				entityType: 'User',
				entityId: userId,
				details,
				ipAddress,
				userAgent,
			},
			entityManager
		);
	}
}
