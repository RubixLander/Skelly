import { forwardRef, Module } from "@nestjs/common";
import { UsersDetailsController } from "./users-details.controller";
import { UsersDetailsService } from "./users-details.service";
import { DatabaseModule } from "../database/database.module"; // 👈 trae PG_CONNECTION
import { UserFavoritesModule } from "../user-favorites/user.favorites.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => UserFavoritesModule),
  ],
  controllers: [UsersDetailsController],
  providers: [UsersDetailsService],
  exports: [UsersDetailsService], // 👈 opcional, si lo usas en otros módulos
})
export class UsersDetailsModule {}
