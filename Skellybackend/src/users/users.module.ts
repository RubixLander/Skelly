// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module'; // ← IMPORTA esto
import { DatabaseModule } from '../database/database.module'; // si estás usando PG_CONNECTION

@Module({
  imports: [
    AuthModule,       // ← Asegura que AuthService esté disponible
    DatabaseModule    // ← Si usas PG_CONNECTION aquí también
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}