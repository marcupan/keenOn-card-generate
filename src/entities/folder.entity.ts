import { Type } from 'class-transformer';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

import { Card } from './card.entity';
import Model from './model.entity';
import { User } from './user.entity';

@Entity('folders')
export class Folder extends Model {
	@Column({
		type: 'varchar',
		length: 100,
		nullable: false,
	})
	@IsString()
	@MinLength(1, { message: 'Folder name cannot be empty' })
	@MaxLength(100, { message: 'Folder name must be less than 100 characters' })
	name!: string;

	@Column({
		type: 'text',
		nullable: true,
	})
	@IsString()
	@IsOptional()
	@MaxLength(500, { message: 'Description must be less than 500 characters' })
	description?: string;

	@ManyToOne(() => User, (user) => user.folders, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	@Type(() => User)
	user!: User;

	@OneToMany(() => Card, (card) => card.folder, {
		cascade: true,
		eager: true,
	})
	@Type(() => Card)
	cards?: Card[];
}
