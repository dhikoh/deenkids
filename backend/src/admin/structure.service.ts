import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';
import { sanitizeText } from '../common/utils/sanitize.util';

@Injectable()
export class StructureService {
  constructor(private prisma: PrismaService) {}

  async getStructure(group?: string) {
    const where: any = {};
    if (group) where.group = group;
    const nodes = await this.prisma.contentNode.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { contents: { where: { deletedAt: null } } } },
      },
    });

    const buildTree = (parentId: string | null = null): any[] => {
      return nodes
        .filter(n => n.parentId === parentId)
        .map(n => ({
          ...n,
          contentCount: n._count.contents,
          children: buildTree(n.id),
        }));
    };

    return { data: buildTree() };
  }

  async createNode(body: { title: string; type: string; parentId?: string; ageGroups?: string[]; icon?: string; order?: number; description?: string; group?: string }) {
    const title = sanitizeText(body.title);
    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    const node = await this.prisma.contentNode.create({
      data: {
        title,
        slug,
        type: body.type as any,
        parentId: body.parentId || null,
        ageGroups: body.ageGroups || ['3-5', '5-7', '7-10'],
        icon: body.icon,
        order: body.order || 0,
        description: body.description ? sanitizeText(body.description) : undefined,
        group: body.group || 'PEMBELAJARAN',
      },
    });
    return { data: node, message: 'Node berhasil dibuat' };
  }

  async updateNode(id: string, body: any) {
    const existing = await this.prisma.contentNode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Node tidak ditemukan');

    const updated = await this.prisma.contentNode.update({
      where: { id },
      data: {
        title: body.title ? sanitizeText(body.title) : existing.title,
        description: body.description !== undefined ? sanitizeText(body.description || '') : existing.description,
        ageGroups: body.ageGroups ?? existing.ageGroups,
        icon: body.icon ?? existing.icon,
        order: body.order ?? existing.order,
        isActive: body.isActive ?? existing.isActive,
        parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
      },
    });

    return { data: updated, message: 'Node berhasil diperbarui' };
  }

  async deleteNode(id: string) {
    const existing = await this.prisma.contentNode.findUnique({
      where: { id },
      include: { _count: { select: { contents: true, children: true } } },
    });
    if (!existing) throw new NotFoundException('Node tidak ditemukan');
    if (existing._count.contents > 0) {
      throw new BadRequestException('Tidak bisa menghapus node yang masih memiliki konten');
    }
    if (existing._count.children > 0) {
      throw new BadRequestException('Tidak bisa menghapus node yang masih memiliki sub-node');
    }

    await this.prisma.contentNode.delete({ where: { id } });
    return { message: 'Node berhasil dihapus' };
  }

  async assignContentToNode(contentId: string, nodeId: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId, deletedAt: null } });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const node = await this.prisma.contentNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Node tidak ditemukan');

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { nodeId },
    });

    return { message: `Konten "${content.title}" dipindahkan ke "${node.title}"` };
  }
}
