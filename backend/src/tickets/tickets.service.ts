import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CompleteTicketDto } from './dto/complete-ticket.dto';
import { TicketState, Prisma } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateTicketDto, managerId: string) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be >= start date');
    }

    const state: TicketState = dto.assignedEngineerId ? 'ASSIGNED' : 'PENDING';

    const ticket = await this.prisma.ticket.create({
      data: {
        managerId,
        customerName: dto.customerName,
        customerLocation: dto.customerLocation,
        siteId: dto.siteId,
        botNumber: dto.botNumber,
        zendeskTicketId: dto.zendeskTicketId,
        serviceType: dto.serviceType,
        changeType: dto.changeType,
        changeSubtype: dto.changeSubtype,
        assignedEngineerId: dto.assignedEngineerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        notes: dto.notes,
        state,
      },
    });

    await this.audit.log({
      userId: managerId,
      action: 'CREATE_TICKET',
      entityType: 'Ticket',
      entityId: ticket.id,
      newState: state,
    });

    return ticket;
  }

  async findAll(filters: {
    state?: TicketState;
    managerId?: string;
    engineerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = {};
    if (filters.state) where.state = filters.state;
    if (filters.managerId) where.managerId = filters.managerId;
    if (filters.engineerId) where.assignedEngineerId = filters.engineerId;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          assignedEngineer: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async assign(ticketId: string, engineerId: string, managerId: string) {
    const ticket = await this.getTicketOrFail(ticketId);
    this.assertState(ticket.state, ['PENDING'], 'assign');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedEngineerId: engineerId,
        state: 'ASSIGNED',
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: managerId,
      action: 'ASSIGN_TICKET',
      entityType: 'Ticket',
      entityId: ticketId,
      oldState: 'PENDING',
      newState: 'ASSIGNED',
      metadata: { engineerId },
    });

    return updated;
  }

  async accept(ticketId: string, engineerId: string) {
    const ticket = await this.getTicketOrFail(ticketId);
    this.assertState(ticket.state, ['ASSIGNED'], 'accept');

    if (ticket.assignedEngineerId !== engineerId) {
      throw new BadRequestException('This ticket is not assigned to you');
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { state: 'IN_PROGRESS', version: { increment: 1 } },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'ACCEPT_TICKET',
      entityType: 'Ticket',
      entityId: ticketId,
      oldState: 'ASSIGNED',
      newState: 'IN_PROGRESS',
    });

    return updated;
  }

  async reject(ticketId: string, engineerId: string, reason: string) {
    const ticket = await this.getTicketOrFail(ticketId);
    this.assertState(ticket.state, ['ASSIGNED'], 'reject');

    if (ticket.assignedEngineerId !== engineerId) {
      throw new BadRequestException('This ticket is not assigned to you');
    }

    const rejectionHistory = (ticket.rejectionHistory as any[]) ?? [];
    rejectionHistory.push({
      engineer_id: engineerId,
      reason,
      rejected_at: new Date().toISOString(),
      re_accepted_at: null,
    });

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: 'PENDING',
        assignedEngineerId: null,
        rejectionHistory,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'REJECT_TICKET',
      entityType: 'Ticket',
      entityId: ticketId,
      oldState: 'ASSIGNED',
      newState: 'PENDING',
      metadata: { reason },
    });

    return updated;
  }

  async reAccept(ticketId: string, engineerId: string) {
    const ticket = await this.getTicketOrFail(ticketId);
    this.assertState(ticket.state, ['PENDING'], 're-accept');

    const rejectionHistory = (ticket.rejectionHistory as any[]) ?? [];
    const lastRejection = rejectionHistory.find(
      (r: any) => r.engineer_id === engineerId && !r.re_accepted_at,
    );
    if (lastRejection) {
      lastRejection.re_accepted_at = new Date().toISOString();
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: 'IN_PROGRESS',
        assignedEngineerId: engineerId,
        rejectionHistory,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'RE_ACCEPT_TICKET',
      entityType: 'Ticket',
      entityId: ticketId,
      oldState: 'PENDING',
      newState: 'IN_PROGRESS',
    });

    return updated;
  }

  async complete(ticketId: string, engineerId: string, dto: CompleteTicketDto) {
    const ticket = await this.getTicketOrFail(ticketId);
    this.assertState(ticket.state, ['IN_PROGRESS'], 'complete');

    if (ticket.assignedEngineerId !== engineerId) {
      throw new BadRequestException('This ticket is not assigned to you');
    }

    if (!dto.images.length) {
      throw new BadRequestException('At least one image is required');
    }

    const today = new Date();
    const daysTaken = Math.ceil(
      (today.getTime() - new Date(ticket.startDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: 'COMPLETED',
        images: dto.images,
        engineerFormData: dto.formData as any,
        actualCompletionDate: today,
        daysTaken,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'COMPLETE_TICKET',
      entityType: 'Ticket',
      entityId: ticketId,
      oldState: 'IN_PROGRESS',
      newState: 'COMPLETED',
    });

    return updated;
  }

  async getEngineerRejectedTickets(engineerId: string) {
    // Find tickets where this engineer appears in rejection_history
    const tickets = await this.prisma.ticket.findMany({
      where: {
        rejectionHistory: { not: Prisma.JsonNull },
      },
      include: {
        assignedEngineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter in-memory for tickets rejected by this engineer
    return tickets.filter((t) => {
      const history = t.rejectionHistory as any[];
      return history?.some((r: any) => r.engineer_id === engineerId);
    });
  }

  private async getTicketOrFail(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private assertState(current: TicketState, allowed: TicketState[], action: string) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Cannot ${action} ticket in ${current} state. Allowed: ${allowed.join(', ')}`,
      );
    }
  }
}
