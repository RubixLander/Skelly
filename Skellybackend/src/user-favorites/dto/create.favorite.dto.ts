import { IsString, IsIn, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateFavoriteDto {
  @IsString({ message: 'El ID de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  user_id!: string;

  @IsString({ message: 'El tipo de contenido debe ser una cadena de texto' })
  @IsIn(['song', 'album', 'artist', 'playlist'], {
    message: 'El tipo de contenido debe ser "song", "album", "artist" o "playlist"',
  })
  content_type!: 'song' | 'album' | 'artist' | 'playlist';

  @IsString({ message: 'La URI de Spotify debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URI de Spotify es obligatoria' })
  spotify_uri!: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsUrl({}, { message: 'La URL de la imagen debe ser válida' })
  @IsNotEmpty({ message: 'La URL de la imagen es obligatoria' })
  image_url!: string;
}