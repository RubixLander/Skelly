// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { SpotifyModule } from './spotify/spotify.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UserFavoritesModule } from './user-favorites/user.favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SpotifyModule, // mantiene tu API de Spotify
    UsersModule,
    AuthModule,
    UserFavoritesModule,
  ],
})
export class AppModule {}