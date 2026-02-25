import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdmin1770396213319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "users"("id","email", "password", "role") VALUES ('4683add1-7b99-438c-b2b5-9d7746a6b39a', 'admin@mail.com', '$2b$08$AGkSR13Bz/6vNHTALKme7.6huQFGhpOnvdLBliEr1C4ADhyPY3XxK', 'admin')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "users" WHERE "email" = 'admin@mail.com'`,
    );
  }
}
