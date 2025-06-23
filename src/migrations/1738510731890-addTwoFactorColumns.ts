import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwoFactorColumns1738510731890 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add two-factor authentication columns to users table
		await queryRunner.query(`
            ALTER TABLE "users" ADD "twoFactorSecret" text DEFAULT NULL;
            ALTER TABLE "users" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false;
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Remove two-factor authentication columns from users table
		await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "twoFactorEnabled";
            ALTER TABLE "users" DROP COLUMN "twoFactorSecret";
        `);
	}
}
