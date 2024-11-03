import crypto from 'crypto';

import bcrypt from 'bcrypt';
import { Entity, Column, Index, BeforeInsert, OneToMany } from 'typeorm';

import { RoleEnumType } from '../types/role';

import { Card } from './card.entity';
import { Folder } from './folder.entity';
import Model from './model.entity';

@Entity('users')
export class User extends Model {
	@Column()
	name: string;

	@Index('email_index')
	@Column({
		unique: true,
	})
	email: string;

	@Column()
	password: string;

	@Column({
		type: 'enum',
		enum: RoleEnumType,
		default: RoleEnumType.USER,
	})
	role: RoleEnumType;

	@Column({
		default: false,
	})
	verified: boolean;

	@Index('verificationCode_index')
	@Column({
		type: 'text',
		nullable: true,
	})
	verificationCode!: string | null;

	@OneToMany(() => Folder, (folder) => folder.user)
	folders: Folder[];

	@OneToMany(() => Card, (card) => card.user)
	cards: Card[];

	@BeforeInsert()
	async hashPassword() {
		this.password = await bcrypt.hash(this.password, 12);
	}

	static async comparePasswords(
		candidatePassword: string,
		hashedPassword: string
	) {
		return await bcrypt.compare(candidatePassword, hashedPassword);
	}

	static createVerificationCode() {
		const verificationCode = crypto.randomBytes(32).toString('hex');

		const hashedVerificationCode = crypto
			.createHash('sha256')
			.update(verificationCode)
			.digest('hex');

		return { verificationCode, hashedVerificationCode };
	}
}
