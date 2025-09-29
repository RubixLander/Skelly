import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  ConflictException,
  BadRequestException,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserFavoritesService } from './user.favorites.service';
import { CreateFavoriteDto } from './dto/create.favorite.dto';

@Controller('user-favorites')
export class UserFavoritesController {
  private readonly logger = new Logger(UserFavoritesController.name);

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

  // DELETE alternativa (por si quieres usar DELETE con query param)
  @Delete(':user_id')
  async removeFavoriteDelete(
    @Param('user_id') user_id: string,
    @Query('spotify_uri') spotify_uri: string,
  ) {
    this.logger.log(`DELETE remove called - user_id=${user_id}, spotify_uri=${spotify_uri}`);
    if (!spotify_uri) {
      throw new BadRequestException('spotify_uri es requerido');
    }

    const deleted = await this.favoritesService.removeFavorite(user_id, spotify_uri);

    if (deleted === 0) {
      throw new NotFoundException('No se encontró el favorito para eliminar');
    }

    return { message: 'Favorito eliminado correctamente' };
  }
}