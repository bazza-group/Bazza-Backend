import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root', 
  password: process.env.DB_PASS || '',     
  database: process.env.DB_NAME || 'bazza_db',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  migrations: [path.join(__dirname, '../migrations/*.ts')],
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  timezone: process.env.TIMEZONE || '+00:00',
  // Disable foreign key checks during schema sync to avoid constraint conflicts
  extra: {
    connectionLimit: 10,
  },
});
