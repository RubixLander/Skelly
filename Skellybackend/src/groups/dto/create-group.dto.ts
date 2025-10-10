import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  group_id?: string; // si no se pasa, lo genera el backend

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}
