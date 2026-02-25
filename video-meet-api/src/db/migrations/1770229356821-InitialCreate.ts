import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCreate1770229356821 implements MigrationInterface {
  name = 'InitialCreate1770229356821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."recordings_status_enum" AS ENUM('processing', 'ready', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recordings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "s3Url" character varying NOT NULL, "duration" integer, "status" "public"."recordings_status_enum" NOT NULL DEFAULT 'processing', "meetingId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8c3247d5ee4551d59bb2115a484" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."meetings_status_enum" AS ENUM('active', 'ended', 'recording')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "sessionId" character varying NOT NULL, "status" "public"."meetings_status_enum" NOT NULL DEFAULT 'active', "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_e7356dffef7cbdbba112d54ff1c" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_72dde91307ae781a66625c087e4" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_72dde91307ae781a66625c087e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_e7356dffef7cbdbba112d54ff1c"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TYPE "public"."meetings_status_enum"`);
    await queryRunner.query(`DROP TABLE "recordings"`);
    await queryRunner.query(`DROP TYPE "public"."recordings_status_enum"`);
  }
}
