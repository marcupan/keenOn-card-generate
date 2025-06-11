import { Type } from 'class-transformer';
import {
	IsString,
	IsOptional,
	MaxLength,
	MinLength,
	IsUrl,
	ValidateNested,
} from 'class-validator';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';

import { Folder } from './folder.entity';
import Model from './model.entity';
import { User } from './user.entity';

@Entity('cards')
export class Card extends Model {
	@Index('word_index')
	@Column({ type: 'varchar', length: 100, nullable: false })
	@IsString()
	@MinLength(1, { message: 'Word cannot be empty' })
	@MaxLength(100, { message: 'Word must be less than 100 characters' })
	word!: string;

	@Index('translation_index')
	@Column({ type: 'varchar', length: 100, nullable: false })
	@IsString()
	@MinLength(1, { message: 'Translation cannot be empty' })
	@MaxLength(100, { message: 'Translation must be less than 100 characters' })
	translation!: string;

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsUrl({}, { message: 'Image must be a valid URL' })
	image?: string;

	@Column({ type: 'text', nullable: false })
	@IsString()
	@MinLength(1, { message: 'Sentence cannot be empty' })
	sentence!: string;

	@ManyToOne(() => User, (user) => user.cards, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	@ValidateNested()
	@Type(() => User)
	user!: User;

	@ManyToOne(() => Folder, (folder) => folder.cards, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'folder_id' })
	@ValidateNested()
	@Type(() => Folder)
	folder!: Folder;
}
