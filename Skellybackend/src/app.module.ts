// src/app.module.ts
import { Module } from '@nestjs/common';
import { SpotifyModule } from './spotify/spotify.module';

@Module({
  imports: [SpotifyModule], // Importa SpotifyModule aquí
})
export class AppModule {}