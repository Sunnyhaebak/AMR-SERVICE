import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roles: dto.roles,
        managerId: dto.managerId,
        defaultLandingPage: dto.defaultLandingPage,
        pageAccess: dto.pageAccess ? (dto.pageAccess as any) : undefined,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newState: JSON.stringify({ roles: user.roles }),
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll(filters?: { role?: string; search?: string }) {
    return this.prisma.user.findMany({
      where: {
        isDeleted: false,
        ...(filters?.role && { roles: { has: filters.role as any } }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true, name: true, email: true, roles: true,
        isLocked: true, defaultLandingPage: true, pageAccess: true,
        managerId: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true, name: true, email: true, roles: true,
        isLocked: true, defaultLandingPage: true, pageAccess: true,
        managerId: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id, isDeleted: false } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.roles && { roles: dto.roles }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
        ...(dto.defaultLandingPage !== undefined && { defaultLandingPage: dto.defaultLandingPage }),
        ...(dto.pageAccess !== undefined && { pageAccess: dto.pageAccess }),
        ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    const { passwordHash: _, ...result } = updated;
    return result;
  }

  async softDelete(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
    });

    return { message: 'User deleted' };
  }

  async getEngineersForManager(managerId: string) {
    return this.prisma.user.findMany({
      where: {
        managerId,
        isDeleted: false,
        roles: { has: 'ENGINEER' },
      },
      select: {
        id: true, name: true, email: true, roles: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
