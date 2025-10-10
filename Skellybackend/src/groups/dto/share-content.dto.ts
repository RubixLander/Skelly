import { IsString } from 'class-validator';

export class ShareContentDto {
  @IsString()
  spotify_uri!: string;

  @IsString()
  content_type!: string; // 'track'|'album'|'playlist'|'artist'

  @IsString()
  user_id!: string; // ✅ necesario para el backend
}
