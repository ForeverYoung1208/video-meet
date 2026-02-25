import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const dataSourceOptions = registerAs(
  'data-source-options',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '', 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    entities: [__dirname + '/../../entities/**/*.entity.{js,ts}'],
    logging: process.env.TYPEORM_LOGGING === 'true',
    migrationsRun: false,
    synchronize: false,
    migrations: [__dirname + '/../../db/migrations/*{.ts,.js}'],
    extra: {
      cli: {
        migrationsDir: 'src/db/migrations',
      },
      logging: process.env.NODE_ENV === 'development',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    },
  }),
);
