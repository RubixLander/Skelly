// src/search/search.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { UserResultDto } from './dto/user-result.dto';

@Injectable()
export class SearchService {
  constructor(@Inject('PG_CONNECTION') private readonly pool: Pool) {}

  async searchUsers(query: string): Promise<UserResultDto[]> {
    const sql = `
      SELECT user_id, nickname, display_email, custom_profile_image_url, bio
      FROM users
      WHERE nickname ILIKE $1
         OR display_email ILIKE $1
         OR bio ILIKE $1
      LIMIT 20;
    `;
    const values = [`%${query}%`];
    const result = await this.pool.query(sql, values);
    return result.rows;
  }
}
