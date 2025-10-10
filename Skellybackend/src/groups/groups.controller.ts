import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
  Patch,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ShareContentDto } from './dto/share-content.dto';
import { SendMessageDto } from './dto/send-message.dto';

// Asumo que tenés un AuthGuard que añade req.user.user_id
// @UseGuards(AuthGuard) // aplica según tu setup

@Controller('api/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async create(@Body() dto: CreateGroupDto) {
    const { user_id, name, description, image_url } = dto;
    if (!user_id) throw new BadRequestException('Missing user_id');

    return this.groupsService.createGroup(user_id, name, description, image_url);
  }


  @Get(':groupId')
  async getOne(@Param('groupId') groupId: string) {
    return this.groupsService.getGroup(groupId);
  }

  // Editar grupo (owner). Permite subir archivo opcional que se convierte a base64 (memory)
    @Patch(':groupId')
    @UseInterceptors(FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Solo imágenes permitidas'), false);
        } else cb(null, true);
      }
    }))
    async update(
      @Req() req: any,
      @Param('groupId') groupId: string,
      @Body() dto: UpdateGroupDto,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      // 🔹 TOMA EL user_id del req.user o del body
      const userId = req.user?.user_id || dto.user_id;
      if (!userId) throw new BadRequestException('Missing user_id');

      if (file) {
        dto.image_url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      return this.groupsService.updateGroup(userId, groupId, dto);
    }

  // Unirse
  @Post(':groupId/join')
  async join(@Req() req: any, @Param('groupId') groupId: string, @Body() body: any) {
    const userId = req.user?.user_id || body.user_id; // ✅ fallback al body
    if (!userId) throw new BadRequestException('Missing user_id');
    return this.groupsService.joinGroup(userId, groupId);
  }

  // Salir
  @Post(':groupId/leave')
  async leave(@Req() req: any, @Param('groupId') groupId: string, @Body() body: any) {
    const userId = req.user?.user_id || body.user_id; // ✅ fallback al body
    if (!userId) throw new BadRequestException('Missing user_id');
    return this.groupsService.leaveGroup(userId, groupId);
  }

  // Listar miembros
  @Get(':groupId/members')
  async members(@Param('groupId') groupId: string) {
    return this.groupsService.listMembers(groupId);
  }

  // Compartir contenido
@Post(':groupId/shared')
async share(@Req() req: any, @Param('groupId') groupId: string, @Body() dto: ShareContentDto) {
  const userId = req.user?.user_id || dto.user_id;
  if (!userId) throw new BadRequestException('Missing user_id');

  const shared = await this.groupsService.shareContent(userId, groupId, dto.spotify_uri, dto.content_type);

  // ✅ Esto garantiza que Axios lo considere “éxito”
  return {
    ok: true,
    message: 'Contenido compartido correctamente',
    shared,
  };
}

  @Get(':groupId/shared')
  async listShared(@Param('groupId') groupId: string, @Query('limit') limit = '50', @Query('offset') offset = '0') {
    return this.groupsService.listShared(groupId, parseInt(limit, 10), parseInt(offset, 10));
  }

  // Mensajes
  @Post(':groupId/messages')
  async sendMessage(@Req() req: any, @Param('groupId') groupId: string, @Body() dto: SendMessageDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new BadRequestException('Auth required');
    return this.groupsService.sendMessage(userId, groupId, dto.message, dto.spotify_uri);
  }

  @Get(':groupId/messages')
  async listMessages(@Param('groupId') groupId: string, @Query('limit') limit = '50', @Query('offset') offset = '0') {
    return this.groupsService.listMessages(groupId, parseInt(limit, 10), parseInt(offset, 10));
  }

  @Get('user/:userId')
  async userGroups(@Param('userId') userId: string) {
    return this.groupsService.listUserGroups(userId);
  }

  @Get('discover/:userId')
  async discover(@Param('userId') userId: string) {
    return this.groupsService.discoverGroups(userId, 20);
  }


// Expulsar miembro (solo owner)
@Delete(':groupId/members/:memberId')
async kickMember(
  @Req() req: any,
  @Param('groupId') groupId: string,
  @Param('memberId') memberId: string,
  @Query('user_id') userId?: string,
) {
  const requesterId = req.user?.user_id || userId;
  if (!requesterId) throw new BadRequestException('Missing user_id');
  return this.groupsService.kickMember(requesterId, groupId, memberId);
}

// POST /api/groups/shared/broadcast
@Post('shared/broadcast')
async shareToMyGroups(@Req() req: any, @Body() dto: { spotify_uri: string; content_type: string; user_id?: string }) {
  const userId = req.user?.user_id || dto.user_id;
  if (!userId) throw new BadRequestException('Missing user_id');
  if (!dto.spotify_uri || !dto.content_type) throw new BadRequestException('spotify_uri and content_type are required');
  return this.groupsService.shareToUserGroups(userId, dto.spotify_uri, dto.content_type);
}

}