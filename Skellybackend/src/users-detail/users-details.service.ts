import { Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { Pool } from "pg";
import { FollowUserDto } from "./dto/follow-user.dto";
import { UserFavoritesService } from "../user-favorites/user.favorites.service";
import { CommentsService } from "../comments/comments.service"; // ✅ importamos CommentsService

@Injectable()
export class UsersDetailsService {
  constructor(
    @Inject("PG_CONNECTION") private readonly pool: Pool,
    @Inject(forwardRef(() => UserFavoritesService))
    private readonly favoritesService: UserFavoritesService,
    private readonly commentsService: CommentsService, // ✅ inyección
  ) {}

  async getUserDetails(userId: string) {
    const client = await this.pool.connect();
    try {
      const userRes = await client.query(
        `SELECT user_id, nickname, display_email, custom_profile_image_url, bio 
         FROM users WHERE user_id = $1`,
        [userId],
      );
      if (userRes.rows.length === 0) {
        throw new NotFoundException("Usuario no encontrado");
      }
      const user = userRes.rows[0];

      const favorites = await this.favoritesService.getFavoritesByUser(userId);

      const followingRes = await client.query(
        `SELECT u.user_id, u.nickname, u.custom_profile_image_url
         FROM users_follows f
         JOIN users u ON f.following_id = u.user_id
         WHERE f.follower_id = $1`,
        [userId],
      );

      const followersRes = await client.query(
        `SELECT u.user_id, u.nickname, u.custom_profile_image_url
         FROM users_follows f
         JOIN users u ON f.follower_id = u.user_id
         WHERE f.following_id = $1`,
        [userId],
      );

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
        groups: groupsRes.rows,
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

  async getFollowingComments(userId: string) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `
        SELECT c.id AS comment_id,
               c.content_type,
               c.spotify_uri,
               c.comment,
               c.created_at,
               u.user_id,
               u.nickname,
               u.custom_profile_image_url
        FROM comments c
        JOIN users u ON u.user_id = c.user_id
        JOIN users_follows f ON f.following_id = c.user_id
        WHERE f.follower_id = $1
          AND c.parent_comment_id IS NULL
          AND c.content_type IN ('album','track','playlist')
        ORDER BY c.created_at DESC
        `,
        [userId],
      );

      const comments = res.rows;

      // 🔹 Para cada comentario, obtenemos detalles del contenido (reutilizamos CommentsService)
      const enriched = await Promise.all(
        comments.map(async (comment) => {
          const details = await this.commentsService.getCommentsBySpotifyUri(
            comment.spotify_uri,
            comment.content_type,
          );

          return {
            ...comment,
            content_details: details.length > 0 ? {
              // tomamos los datos del primer comentario que ya guarda info del contenido
              image_url: details[0].image_url ?? null,
              title: details[0].title ?? null,
              type: comment.content_type,
            } : null,
          };
        }),
      );

      return enriched;
    } finally {
      client.release();
    }
  }
}
