// src/user-favorites/user-favorites.controller.ts
import { Controller, Post, Body, Get, Param, ConflictException, BadRequestException } from '@nestjs/common';
import { UserFavoritesService } from './user.favorites.service';
import { CreateFavoriteDto } from './dto/create.favorite.dto';

@Controller('user-favorites')
export class UserFavoritesController {
  constructor(private readonly favoritesService: UserFavoritesService) {}

  @Post()
  async addFavorite(@Body() dto: CreateFavoriteDto): Promise<{ message: string }> {
    try {
      await this.favoritesService.addFavorite(dto);
      return { message: 'Contenido agregado a favoritos' };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw new BadRequestException('Error inesperado');
    }
  }

  @Get(':user_id')
  async getFavorites(@Param('user_id') user_id: string) {
    return await this.favoritesService.getFavoritesByUser(user_id);
  }
}
