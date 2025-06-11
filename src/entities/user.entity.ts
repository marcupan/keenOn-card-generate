import crypto from 'crypto';

import bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import {
	IsEmail,
	IsEnum,
	IsBoolean,
	IsString,
	MinLength,
	MaxLength,
	Matches,
	IsOptional,
} from 'class-validator';
import { Entity, Column, Index, BeforeInsert, OneToMany } from 'typeorm';

import { RoleEnumType } from '../types/role';

import { Card } from './card.entity';
import { Folder } from './folder.entity';
import Model from './model.entity';

@Entity('users')
export class User extends Model {
	@Column()
	@IsString()
	@MinLength(2, { message: 'Name must be at least 2 characters long' })
	@MaxLength(100, { message: 'Name must be less than 100 characters' })
	name!: string;

	@Index('email_index')
	@Column({
		unique: true,
	})
	@IsEmail({}, { message: 'Invalid email address' })
	email!: string;

	@Column()
	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@MaxLength(32, { message: 'Password must be less than 32 characters' })
	@Matches(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,32}$/,
		{
			message:
				'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @$!%*?&#)',
		}
	)
	@Exclude({ toPlainOnly: true })
	password!: string;

	@Column({
		type: 'enum',
		enum: RoleEnumType,
		default: RoleEnumType.USER,
	})
	@IsEnum(RoleEnumType)
	role!: RoleEnumType;

	@Column({
		default: false,
	})
	@IsBoolean()
	verified!: boolean;

	@Index('verificationCode_index')
	@Column({
		type: 'text',
		nullable: true,
	})
	@IsString()
	@IsOptional()
	verificationCode?: string | null;

	@OneToMany(() => Folder, (folder) => folder.user)
	folders!: Folder[];

	@OneToMany(() => Card, (card) => card.user)
	cards!: Card[];

	@BeforeInsert()
	async hashPassword(): Promise<void> {
		this.password = await bcrypt.hash(this.password, 12);
	}

	static async comparePasswords(
		candidatePassword: string,
		hashedPassword: string
	): Promise<boolean> {
		return bcrypt.compare(candidatePassword, hashedPassword);
	}

	static createVerificationCode(): {
		verificationCode: string;
		hashedVerificationCode: string;
	} {
		const verificationCode = crypto.randomBytes(32).toString('hex');

		const hashedVerificationCode = crypto
			.createHash('sha256')
			.update(verificationCode)
			.digest('hex');

		return { verificationCode, hashedVerificationCode };
	}
}
