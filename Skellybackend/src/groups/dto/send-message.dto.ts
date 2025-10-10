import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  spotify_uri?: string; // opcional si el mensaje contiene una URI
}
