import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';

import { Folder } from './folder.entity';
import Model from './model.entity';
import { User } from './user.entity';

@Entity('cards')
export class Card extends Model {
	@Index('word_index')
	@Column({
		type: 'varchar',
		length: 100,
		nullable: false,
	})
	word: string;

	@Index('translation_index')
	@Column({
		type: 'varchar',
		length: 100,
		nullable: false,
	})
	translation: string;

	@Column({
		type: 'text',
		nullable: true,
	})
	image: string;

	@Column({
		type: 'text',
		nullable: false,
	})
	sentence: string;

	@ManyToOne(() => User, (user) => user.cards, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	user: User;

	@ManyToOne(() => Folder, (folder) => folder.cards, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'folder_id' })
	folder: Folder;
}
