import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDelete1738510731889 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE "users" ADD "deleted_at" TIMESTAMP DEFAULT NULL;
            ALTER TABLE "folders" ADD "deleted_at" TIMESTAMP DEFAULT NULL;
            ALTER TABLE "cards" ADD "deleted_at" TIMESTAMP DEFAULT NULL;
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "deleted_at";
            ALTER TABLE "folders" DROP COLUMN "deleted_at";
            ALTER TABLE "cards" DROP COLUMN "deleted_at";
        `);
	}
}
