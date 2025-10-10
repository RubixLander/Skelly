// src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],  // 👈 NECESARIO para que otros módulos puedan usarlo
})
export class CommentsModule {}
