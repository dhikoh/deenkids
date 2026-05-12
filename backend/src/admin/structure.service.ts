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
        type: body.type ?? existing.type,
        ageGroups: body.ageGroups ?? existing.ageGroups,
        icon: body.icon ?? existing.icon,
        order: body.order ?? existing.order,
        isActive: body.isActive ?? existing.isActive,
        // Fix: convert empty string to null for root-level nodes
        parentId: body.parentId !== undefined ? (body.parentId || null) : existing.parentId,
        group: body.group ?? existing.group,
      },
    });

    return { data: updated, message: 'Node berhasil diperbarui' };
  }

  async deleteNode(id: string) {
    const existing = await this.prisma.contentNode.findUnique({
      where: { id },
      include: { _count: { select: { contents: { where: { deletedAt: null } }, children: true } } },
    });
    if (!existing) throw new NotFoundException('Node tidak ditemukan');
    if (existing._count.contents > 0) {
      throw new BadRequestException(`Tidak bisa menghapus node yang masih memiliki ${existing._count.contents} konten. Pindahkan konten terlebih dahulu.`);
    }
    if (existing._count.children > 0) {
      throw new BadRequestException(`Tidak bisa menghapus node yang masih memiliki ${existing._count.children} sub-node. Hapus sub-node terlebih dahulu.`);
    }

    await this.prisma.contentNode.delete({ where: { id } });
    return { message: 'Node berhasil dihapus' };
  }

  // ─── Get contents of a node (for migration modal) ─────────────────
  async getNodeContents(nodeId: string) {
    const node = await this.prisma.contentNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Node tidak ditemukan');

    const contents = await this.prisma.contentItem.findMany({
      where: { nodeId, deletedAt: null },
      select: { id: true, title: true, slug: true, type: true, status: true },
      orderBy: { title: 'asc' },
    });

    return { data: contents, count: contents.length };
  }

  // ─── Bulk move all contents from one node to another ───────────────
  async bulkMoveContents(sourceNodeId: string, targetNodeId: string) {
    const source = await this.prisma.contentNode.findUnique({ where: { id: sourceNodeId } });
    if (!source) throw new NotFoundException('Node sumber tidak ditemukan');

    const target = await this.prisma.contentNode.findUnique({ where: { id: targetNodeId } });
    if (!target) throw new NotFoundException('Node tujuan tidak ditemukan');

    if (sourceNodeId === targetNodeId) {
      throw new BadRequestException('Node sumber dan tujuan tidak boleh sama');
    }

    const result = await this.prisma.contentItem.updateMany({
      where: { nodeId: sourceNodeId, deletedAt: null },
      data: { nodeId: targetNodeId },
    });

    return {
      message: `${result.count} konten dipindahkan dari "${source.title}" ke "${target.title}"`,
      movedCount: result.count,
    };
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
