import { IsDate, IsUUID, validateOrReject } from 'class-validator';
import {
	CreateDateColumn,
	UpdateDateColumn,
	PrimaryGeneratedColumn,
	BaseEntity,
	DeleteDateColumn,
	BeforeInsert,
	BeforeUpdate,
} from 'typeorm';

export default abstract class Model extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	@IsUUID()
	id!: string;

	@CreateDateColumn()
	@IsDate()
	created_at!: Date;

	@UpdateDateColumn()
	@IsDate()
	updated_at?: Date;

	@DeleteDateColumn({ nullable: true })
	@IsDate()
	deleted_at?: Date;

	@BeforeInsert()
	@BeforeUpdate()
	async validate(): Promise<void> {
		await validateOrReject(this, {
			skipMissingProperties: true,
			whitelist: true,
		});
	}
}
