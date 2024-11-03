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
	name: string;

	@Column({
		type: 'text',
		nullable: true,
	})
	description: string;

	@ManyToOne(() => User, (user) => user.folders, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	user: User;

	@OneToMany(() => Card, (card) => card.folder, {
		cascade: true,
		eager: true,
	})
	cards: Card[];
}
