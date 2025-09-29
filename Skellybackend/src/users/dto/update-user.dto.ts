import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nickname no puede superar los 100 caracteres' })
  nickname?: string;

  @IsOptional()
  @IsString()
  custom_profile_image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La bio no puede superar los 500 caracteres' })
  bio?: string;
}