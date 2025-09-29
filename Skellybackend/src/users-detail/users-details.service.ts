import { Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { Pool } from "pg";
import { FollowUserDto } from "./dto/follow-user.dto";
import { UserFavoritesService } from "../user-favorites/user.favorites.service";

@Injectable()
export class UsersDetailsService {
  constructor(
    @Inject("PG_CONNECTION") private readonly pool: Pool,
    @Inject(forwardRef(() => UserFavoritesService)) // 👈 inyección del servicio
    private readonly favoritesService: UserFavoritesService,
  ) {}

  async getUserDetails(userId: string) {
    const client = await this.pool.connect();
    try {
      // Info básica del usuario
      const userRes = await client.query(
        `SELECT user_id, nickname, display_email, custom_profile_image_url, bio 
         FROM users WHERE user_id = $1`,
        [userId],
      );
      if (userRes.rows.length === 0) {
        throw new NotFoundException("Usuario no encontrado");
      }
      const user = userRes.rows[0];

      // ✅ Reutilizamos servicio de favoritos
      const favorites = await this.favoritesService.getFavoritesByUser(userId);

      // Seguidos (usuarios a los que sigue este user)
      const followingRes = await client.query(
        `SELECT u.user_id, u.nickname, u.custom_profile_image_url
         FROM users_follows f
         JOIN users u ON f.following_id = u.user_id
         WHERE f.follower_id = $1`,
        [userId],
      );

      // Seguidores (usuarios que siguen a este user)
      const followersRes = await client.query(
        `SELECT u.user_id, u.nickname, u.custom_profile_image_url
         FROM users_follows f
         JOIN users u ON f.follower_id = u.user_id
         WHERE f.following_id = $1`,
        [userId],
      );

    // ✅ Grupos donde participa
    const groupsRes = await client.query(
      `SELECT g.group_id, g.name, g.description, g.owner_id, g.created_at
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.group_id
       WHERE gm.member_id = $1`,
      [userId],
    );

      return {
        ...user,
        favorites,
        following: followingRes.rows,
        followers: followersRes.rows,
        groups: groupsRes.rows
      };
    } finally {
      client.release();
    }
  }

  async followUser(dto: FollowUserDto) {
    await this.pool.query(
      `INSERT INTO users_follows (follower_id, following_id) 
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [dto.follower_id, dto.following_id],
    );
    return { message: "Ahora sigues a este usuario" };
  }

  async unfollowUser(dto: FollowUserDto) {
    await this.pool.query(
      `DELETE FROM users_follows WHERE follower_id = $1 AND following_id = $2`,
      [dto.follower_id, dto.following_id],
    );
    return { message: "Dejaste de seguir a este usuario" };
  }
}