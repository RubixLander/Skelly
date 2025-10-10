import { Module, forwardRef } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsGateway } from './groups.gateway';
import { DatabaseModule } from '../database/database.module'; // Necesario para PG_CONNECTION
import { AuthModule } from '../auth/auth.module'; // Si usas autenticación JWT
import { UsersDetailsModule } from '../users-detail/users-details.module'; // Si los grupos usan info de usuario

@Module({
  imports: [
    DatabaseModule, // 👈 Necesario para acceder al pool de PostgreSQL
    forwardRef(() => AuthModule), // 👈 Si necesitas validar tokens en grupos
    forwardRef(() => UsersDetailsModule), // 👈 Si obtienes datos de usuario (nick, img, etc.)
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsGateway],
  exports: [GroupsService],
})
export class GroupsModule {}
