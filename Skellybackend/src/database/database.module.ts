// src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Global()
@Module({
  imports: [ConfigModule], // para usar variables de entorno
  providers: [
    {
      provide: 'PG_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        });
        return pool;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['PG_CONNECTION'],
})
export class DatabaseModule {}