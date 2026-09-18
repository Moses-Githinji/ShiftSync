import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinLocation')
  handleJoinLocation(@MessageBody() locationId: string, @ConnectedSocket() client: Socket) {
    client.join(`location:${locationId}`);
  }

  @SubscribeMessage('joinUser')
  handleJoinUser(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(`user:${userId}`);
  }

  @SubscribeMessage('manager_editing')
  handleManagerEditing(@MessageBody() data: { shiftId: string, managerName: string, locationId: string }, @ConnectedSocket() client: Socket) {
    // Broadcast to others in the location that this shift is being edited
    client.to(`location:${data.locationId}`).emit('manager_editing_conflict', data);
  }

  notifyLocation(locationId: string, event: string, payload: any) {
    this.server.to(`location:${locationId}`).emit(event, payload);
  }

  notifyUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
