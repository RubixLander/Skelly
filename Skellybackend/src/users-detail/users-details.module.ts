// src/users-details/users-details.module.ts
import { forwardRef, Module } from "@nestjs/common";
import { UsersDetailsController } from "./users-details.controller";
import { UsersDetailsService } from "./users-details.service";
import { DatabaseModule } from "../database/database.module"; 
import { UserFavoritesModule } from "../user-favorites/user.favorites.module";
import { CommentsModule } from "../comments/comments.module"; // 👈 IMPORTA COMENTARIOS

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => UserFavoritesModule),
    forwardRef(() => CommentsModule), // 👈 AGREGA ESTO
  ],
  controllers: [UsersDetailsController],
  providers: [UsersDetailsService],
  exports: [UsersDetailsService],
})
export class UsersDetailsModule {}
