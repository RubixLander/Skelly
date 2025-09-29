// src/comments/comments.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(@Inject('PG_CONNECTION') private readonly pool: Pool) {}

  async addComment(dto: CreateCommentDto): Promise<void> {
    const { user_id, content_type, spotify_uri, comment, parent_comment_id } = dto;

    // Validación adicional si quieres asegurarte de que el user_id exista (opcional)
    const userCheck = await this.pool.query(`SELECT 1 FROM users WHERE user_id = $1`, [user_id]);
    if (userCheck.rowCount === 0) {
      throw new BadRequestException('El usuario no existe');
    }

    // Insertar el comentario
    const insertQuery = `
      INSERT INTO comments (content_type, spotify_uri, user_id, comment, parent_comment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await this.pool.query(insertQuery, [
      content_type,
      spotify_uri,
      user_id,
      comment,
      parent_comment_id ?? null,
    ]);
  }

  async getCommentsBySpotifyUri(spotify_uri: string, content_type: string) {
    const query = `
      SELECT 
        c.*, 
        u.nickname, 
        u.custom_profile_image_url
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.spotify_uri = $1 AND c.content_type = $2
      ORDER BY c.created_at ASC
    `;

    const result = await this.pool.query(query, [spotify_uri, content_type]);
    return result.rows;
  }
}