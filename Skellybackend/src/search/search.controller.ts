// src/search/search.controller.ts
import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  async searchUsers(@Query() query: SearchDto) {
    if (!query.q || query.q.trim() === '') {
      throw new BadRequestException('Search query is required');
    }

    return this.searchService.searchUsers(query.q);
  }
}
