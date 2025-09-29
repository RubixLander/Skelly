// src/search/dto/search.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  q: string | undefined;
}