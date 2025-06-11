import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedEntity1738510731888 implements MigrationInterface {
	name = 'AddedEntity1738510731888';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`
		);
		await queryRunner.query(
			`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "verified" boolean NOT NULL DEFAULT false, "verificationCode" text, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "email_index" ON "users" ("email") `
		);
		await queryRunner.query(
			`CREATE INDEX "verificationCode_index" ON "users" ("verificationCode") `
		);
		await queryRunner.query(
			`CREATE TABLE "cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "word" character varying(100) NOT NULL, "translation" character varying(100) NOT NULL, "image" text, "sentence" text NOT NULL, "user_id" uuid NOT NULL, "folder_id" uuid NOT NULL, CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "word_index" ON "cards" ("word") `
		);
		await queryRunner.query(
			`CREATE INDEX "translation_index" ON "cards" ("translation") `
		);
		await queryRunner.query(
			`CREATE TABLE "folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" text, "user_id" uuid NOT NULL, CONSTRAINT "PK_8578bd31b0e7f6d6c2480dbbca8" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "cards" ADD CONSTRAINT "FK_1c54b595af68cc3870b651e11c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "cards" ADD CONSTRAINT "FK_e33ea997f1ea1a5e486b23a9d11" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "folders" ADD CONSTRAINT "FK_71af7633de585b66b4db26734c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "folders" DROP CONSTRAINT "FK_71af7633de585b66b4db26734c9"`
		);
		await queryRunner.query(
			`ALTER TABLE "cards" DROP CONSTRAINT "FK_e33ea997f1ea1a5e486b23a9d11"`
		);
		await queryRunner.query(
			`ALTER TABLE "cards" DROP CONSTRAINT "FK_1c54b595af68cc3870b651e11c9"`
		);
		await queryRunner.query(`DROP TABLE "folders"`);
		await queryRunner.query(`DROP INDEX "public"."translation_index"`);
		await queryRunner.query(`DROP INDEX "public"."word_index"`);
		await queryRunner.query(`DROP TABLE "cards"`);
		await queryRunner.query(`DROP INDEX "public"."verificationCode_index"`);
		await queryRunner.query(`DROP INDEX "public"."email_index"`);
		await queryRunner.query(`DROP TABLE "users"`);
		await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
	}
}
