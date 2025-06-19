import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';

import { User } from './user.entity';

/**
 * API Key entity for service-to-service authentication
 */
@Entity('api_keys')
export class ApiKey {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column()
	@IsString()
	name!: string;

	@Column({ unique: true })
	@IsString()
	@Index('api_key_index')
	key!: string;

	@Column({ default: false })
	@IsBoolean()
	revoked!: boolean;

	@Column('simple-array', { nullable: true })
	@IsArray()
	@IsOptional()
	scopes?: string[];

	@Column()
	userId!: string;

	@ManyToOne(() => User, (user) => user.apiKeys)
	@JoinColumn({ name: 'userId' })
	user!: User;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;

	@DeleteDateColumn()
	deleted_at?: Date;
}
