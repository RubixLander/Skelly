// src/user-favorites/user-favorites.service.ts
import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateFavoriteDto } from './dto/create.favorite.dto';

@Injectable()
export class UserFavoritesService {
  constructor(@Inject('PG_CONNECTION') private readonly pool: Pool) {}

  async addFavorite(createFavoriteDto: CreateFavoriteDto): Promise<void> {
    const { user_id, content_type, spotify_uri, name, image_url } = createFavoriteDto;

    // Verificar si ya existe ese favorito
    const checkQuery = `
      SELECT 1 FROM user_favorites
      WHERE user_id = $1 AND spotify_uri = $2
    `;
    const existing = await this.pool.query(checkQuery, [user_id, spotify_uri]);

    if ((existing.rowCount ?? 0) > 0) {
    throw new ConflictException('Este contenido ya está en tus favoritos');
    }


    const insertQuery = `
      INSERT INTO user_favorites (user_id, content_type, spotify_uri, name, image_url, added_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await this.pool.query(insertQuery, [user_id, content_type, spotify_uri, name, image_url]);
  }

  async getFavoritesByUser(user_id: string) {
    const query = `
      SELECT * FROM user_favorites
      WHERE user_id = $1
      ORDER BY added_at DESC
    `;
    const result = await this.pool.query(query, [user_id]);
    return result.rows;
  }
}