// src/comments/dto/create-comment.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: 'El ID de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  user_id!: string;

  @IsString({ message: 'El tipo de contenido debe ser una cadena de texto' })
  @IsIn(['track', 'album', 'playlist'], {
    message: 'El tipo de contenido debe ser "track", "album" o "playlist"',
  })
  content_type!: 'track' | 'album' | 'playlist';

  @IsString({ message: 'La URI de Spotify debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URI de Spotify es obligatoria' })
  spotify_uri!: string;

  @IsString({ message: 'El comentario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El comentario es obligatorio' })
  comment!: string;

  @IsOptional()
  @IsInt({ message: 'El ID del comentario padre debe ser un número entero' })
  @Min(1, { message: 'El ID del comentario padre debe ser mayor que 0' })
  parent_comment_id?: number;
}
