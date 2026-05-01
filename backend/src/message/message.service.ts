import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participantA: { select: { id: true, name: true, role: true } },
        participantB: { select: { id: true, name: true, role: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, createdAt: true, senderId: true } },
      },
    });

    // Single query for all unread counts (eliminates N+1)
    const convoIds = convos.map(c => c.id);
    const unreadCounts = convoIds.length > 0
      ? await this.prisma.message.groupBy({
          by: ['conversationId'],
          where: { conversationId: { in: convoIds }, senderId: { not: userId }, isRead: false },
          _count: { id: true },
        })
      : [];
    const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u._count.id]));

    const result = convos.map(c => {
      const other = c.participantAId === userId ? c.participantB : c.participantA;
      return {
        id: c.id,
        other,
        lastMessage: c.messages[0] || null,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    return { data: result };
  }

  async getMessages(userId: string, conversationId: string, page = 1) {
    // Verify participant
    const convo = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo || (convo.participantAId !== userId && convo.participantBId !== userId)) {
      throw new NotFoundException('Percakapan tidak ditemukan');
    }

    const take = 50;
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take, skip,
        include: { sender: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return { data: data.reverse(), meta: { page, totalPages: Math.ceil(total / take), total } };
  }

  async sendMessage(senderId: string, receiverId: string, text?: string, attachmentUrl?: string, attachmentType?: string) {
    if (!text && !attachmentUrl) throw new BadRequestException('Pesan atau lampiran wajib diisi');
    if (senderId === receiverId) throw new BadRequestException('Tidak bisa mengirim pesan ke diri sendiri');

    // Find or create conversation (always order IDs consistently)
    const [idA, idB] = [senderId, receiverId].sort();
    let convo = await this.prisma.conversation.findUnique({
      where: { participantAId_participantBId: { participantAId: idA, participantBId: idB } },
    });
    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: { participantAId: idA, participantBId: idB },
      });
    }

    const message = await this.prisma.message.create({
      data: { conversationId: convo.id, senderId, text, attachmentUrl, attachmentType },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });

    return { data: message, conversationId: convo.id };
  }

  async markConversationRead(userId: string, conversationId: string) {
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    return { message: 'Percakapan ditandai dibaca' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        conversation: { OR: [{ participantAId: userId }, { participantBId: userId }] },
        senderId: { not: userId },
        isRead: false,
      },
    });
    return { count };
  }

  async getUsersForChat(userId: string) {
    // Return all users except self for starting new conversations
    const users = await this.prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    return { data: users };
  }
}
