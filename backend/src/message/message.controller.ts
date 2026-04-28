import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  async getConversations(@Req() req: any) {
    return this.messageService.getConversations(req.user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List available users for new chat' })
  async getUsersForChat(@Req() req: any) {
    return this.messageService.getUsersForChat(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread messages count' })
  async getUnreadCount(@Req() req: any) {
    return this.messageService.getUnreadCount(req.user.id);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getMessages(@Req() req: any, @Param('conversationId') id: string, @Query('page') page?: string) {
    return this.messageService.getMessages(req.user.id, id, page ? parseInt(page) : 1);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message (text or image)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment'))
  async sendMessage(@Req() req: any, @Body() body: { receiverId: string; text?: string }, @UploadedFile() file?: any) {
    const attachmentUrl = file ? `/uploads/messages/${file.filename}` : undefined;
    const attachmentType = file ? file.mimetype : undefined;
    return this.messageService.sendMessage(req.user.id, body.receiverId, body.text, attachmentUrl, attachmentType);
  }

  @Put(':conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markRead(@Req() req: any, @Param('conversationId') id: string) {
    return this.messageService.markConversationRead(req.user.id, id);
  }
}
