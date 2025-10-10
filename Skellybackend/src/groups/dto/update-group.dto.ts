import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // imagen opcional (url). También el controller acepta un archivo con FileInterceptor.
  @IsOptional()
  @IsString()
  image_url?: string;
  user_id: any;
}
