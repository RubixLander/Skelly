// src/user-favorites/user-favorites.module.ts
import { Module } from '@nestjs/common';
import { UserFavoritesController } from './user.favorites.controller';
import { UserFavoritesService } from './user.favorites.service';

@Module({
  controllers: [UserFavoritesController],
  providers: [UserFavoritesService],
})
export class UserFavoritesModule {}