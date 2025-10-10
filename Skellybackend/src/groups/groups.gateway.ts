import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GroupsService } from './groups.service';

@WebSocketGateway({ namespace: '/groups', cors: { origin: '*' } })
@Injectable()
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GroupsGateway.name);

  constructor(
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('group:join')
  handleJoin(client: Socket, payload: { groupId: string }) {
    client.join(`group:${payload.groupId}`);
    this.logger.log(`Client ${client.id} joined group ${payload.groupId}`);
  }

  @SubscribeMessage('group:leave')
  handleLeave(client: Socket, payload: { groupId: string }) {
    client.leave(`group:${payload.groupId}`);
    this.logger.log(`Client ${client.id} left group ${payload.groupId}`);
  }

  // ✅ Único método correcto para enviar mensajes
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { group_id: string; user_id: string; message: string; spotify_uri?: string },
  ) {
    const { group_id, user_id, message, spotify_uri } = data;

    if (!group_id || !user_id || !message.trim()) return;

    // Guardar mensaje en BD
    const msg = await this.groupsService.sendMessage(user_id, group_id, message, spotify_uri);

    // Emitir al grupo (incluye al emisor)
    this.server.to(`group:${group_id}`).emit('group:message:new', msg);

    this.logger.log(`Message sent to group ${group_id} by ${user_id}`);
  }

  // Utilitario para emitir otros eventos
  emitToGroup(groupId: string, event: string, payload: any) {
    this.server.to(`group:${groupId}`).emit(event, payload);
    this.logger.log(`Emitted "${event}" to group ${groupId}`);
  }
}
