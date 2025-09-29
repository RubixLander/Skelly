// src/comments/comments.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async addComment(@Body() dto: CreateCommentDto): Promise<{ message: string }> {
    try {
      await this.commentsService.addComment(dto);
      return { message: 'Comentario agregado exitosamente' };
    } catch (error) {
      this.logger.error(
        'Error al agregar comentario',
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof Error) {
        throw new BadRequestException(error.message || 'Error inesperado');
      }

      throw new BadRequestException('Error inesperado');
    }
  }

  @Get()
  async getComments(
    @Query('spotify_uri') spotify_uri: string,
    @Query('content_type') content_type: string,
  ) {
    if (!spotify_uri || !content_type) {
      throw new BadRequestException('spotify_uri y content_type son requeridos');
    }

    return await this.commentsService.getCommentsBySpotifyUri(spotify_uri, content_type);
  }
}