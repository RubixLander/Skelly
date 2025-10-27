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
  InternalServerErrorException, // <-- Añadido
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ShareContentDto } from './dto/share-content.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { diskStorage } from 'multer'; // 🚨 USAR DISKSTORAGE
import * as path from 'path'; 
import * as fs from 'fs'; 
import { v4 as uuidv4 } from 'uuid'; // <-- Necesario para nombres únicos


// 🚨 DEFINICIONES PARA DISK STORAGE 🚨
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'group_uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const diskConfig = {
    storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
            const randomName = uuidv4();
            cb(null, `${randomName}${path.extname(file.originalname)}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB para archivo binario
    fileFilter: (_req: any, file: { mimetype: string; }, cb: (arg0: BadRequestException | null, arg1: boolean) => void) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new BadRequestException('Solo imágenes permitidas'), false);
        } else cb(null, true);
    },
};
// -------------------------------------------------------------------------


@Controller('api/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  // 🚨 CORRECCIÓN CRÍTICA: Interceptar FormData y archivo en el POST de creación 🚨
  @UseInterceptors(FileInterceptor('image', diskConfig))
  async create(
      @Body() dto: CreateGroupDto,
      @UploadedFile() file?: Express.Multer.File
    ) {
        // 🚨 SOLUCIÓN AL TypeError: Acceso seguro a los campos de FormData 🚨
        const user_id = dto?.user_id; 
        const name = dto?.name;
        const description = dto?.description;
        let image_url = dto?.image_url; // URL externa

    if (!user_id) throw new BadRequestException('Missing user_id');
    if (!name) throw new BadRequestException('Missing group name');

    if (file) {
        // Generar la URL corta del archivo subido
        image_url = `http://localhost:3001/group_uploads/${file.filename}`;
    }

    try {
        // Llamar al servicio con la URL final (o URL externa/null)
        return this.groupsService.createGroup(user_id, name, description, image_url);
    } catch (error) {
        // Si la DB falla, borramos el archivo físico subido
        if (file) {
            try { fs.unlinkSync(file.path); } catch (e) { console.error('Cleanup failed:', e); }
        }
        throw new InternalServerErrorException('Failed to create group');
    }
  }


  @Get(':groupId')
  async getOne(@Param('groupId') groupId: string) {
    return this.groupsService.getGroup(groupId);
  }

  // Editar grupo (owner). 
    @Patch(':groupId')
    // 🚨 CORRECCIÓN CLAVE: Aplicar la configuración de diskStorage para la edición 🚨
    @UseInterceptors(FileInterceptor('image', diskConfig))
    async update(
      @Req() req: any,
      @Param('groupId') groupId: string,
      @Body() dto: UpdateGroupDto,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      
      const userId = req.user?.user_id || dto.user_id;
      if (!userId) throw new BadRequestException('Missing user_id');

      let oldFilePath: string | null = null;
      
      // Lógica de actualización de URL y borrado del archivo antiguo (similar a users)
      if (file) {
          // Generar la URL
          const publicUrl = `http://localhost:3001/group_uploads/${file.filename}`;

          // Obtener URL antigua para borrado
          const oldGroup = await this.groupsService.getGroup(groupId);
          if (oldGroup?.image_url && !oldGroup.image_url.includes('default')) {
              const oldFileName = oldGroup.image_url.split('/').pop();
              oldFilePath = path.join(UPLOADS_DIR, oldFileName || '');
          }

          // Asignar nueva URL al DTO
          dto.image_url = publicUrl;
      }
      
      const updatedGroup = await this.groupsService.updateGroup(userId, groupId, dto);

      // Si el borrado físico es necesario, se ejecuta después del update exitoso en DB
      if (oldFilePath && fs.existsSync(oldFilePath)) {
          try { fs.unlinkSync(oldFilePath); } catch (e) { console.error('Failed to delete old group image:', e); }
      }
      
      return updatedGroup;
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