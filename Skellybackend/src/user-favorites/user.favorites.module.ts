// src/user-favorites/user-favorites.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { UserFavoritesController } from "./user.favorites.controller";
import { UserFavoritesService } from "./user.favorites.service";
import { DatabaseModule } from "../database/database.module"; // 👈 necesario
import { UsersDetailsModule } from "../users-detail/users-details.module";

@Module({
  imports: [
    DatabaseModule, // 👈 ahora sí tiene PG_CONNECTION
    forwardRef(() => UsersDetailsModule), // por si quieres relaciones cruzadas
  ],
  controllers: [UserFavoritesController],
  providers: [UserFavoritesService],
  exports: [UserFavoritesService],
})
export class UserFavoritesModule {}
