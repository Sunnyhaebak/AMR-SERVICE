import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ErpSyncService } from './erp-sync.service';
import { CreateSmrDto } from './dto/create-smr.dto';
import { SmrState } from '@prisma/client';

@Injectable()
export class SmrService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private erpSync: ErpSyncService,
  ) {}

  async create(dto: CreateSmrDto, requestedBy: string, managerId: string) {
    const state: SmrState = dto.assignedEngineerId
      ? 'ASSIGNED_TO_ENGINEER'
      : 'REQUESTED';

    const smr = await this.prisma.smrRequest.create({
      data: {
        source: dto.source ?? 'MANAGER_DIRECT',
        customerName: dto.customerName,
        siteId: dto.siteId,
        ticketId: dto.ticketId,
        requestedBy,
        managerId,
        assignedEngineerId: dto.assignedEngineerId,
        items: dto.items as any,
        state,
      },
    });

    await this.audit.log({
      userId: requestedBy,
      action: 'CREATE_SMR',
      entityType: 'SmrRequest',
      entityId: smr.id,
      newState: state,
    });

    return smr;
  }

  async findAll(filters: {
    state?: SmrState;
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

    const [smrs, total] = await Promise.all([
      this.prisma.smrRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          assignedEngineer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.smrRequest.count({ where }),
    ]);

    return { smrs, total, page, limit };
  }

  async findOne(id: string) {
    const smr = await this.prisma.smrRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        ticket: { select: { id: true, ticketNumber: true, customerName: true } },
      },
    });
    if (!smr) throw new NotFoundException('SMR not found');
    return smr;
  }

  async assignToEngineer(smrId: string, engineerId: string, managerId: string) {
    const smr = await this.getSmrOrFail(smrId);
    this.assertState(smr.state, ['REQUESTED'], 'assign');

    const updated = await this.prisma.smrRequest.update({
      where: { id: smrId },
      data: {
        assignedEngineerId: engineerId,
        state: 'ASSIGNED_TO_ENGINEER',
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: managerId,
      action: 'ASSIGN_SMR',
      entityType: 'SmrRequest',
      entityId: smrId,
      oldState: 'REQUESTED',
      newState: 'ASSIGNED_TO_ENGINEER',
    });

    return updated;
  }

  async engineerApprove(smrId: string, engineerId: string) {
    const smr = await this.getSmrOrFail(smrId);
    this.assertState(smr.state, ['ASSIGNED_TO_ENGINEER'], 'engineer-approve');

    if (smr.assignedEngineerId !== engineerId) {
      throw new BadRequestException('This SMR is not assigned to you');
    }

    const updated = await this.prisma.smrRequest.update({
      where: { id: smrId },
      data: { state: 'APPROVED_BY_ENGINEER', version: { increment: 1 } },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'ENGINEER_APPROVE_SMR',
      entityType: 'SmrRequest',
      entityId: smrId,
      oldState: 'ASSIGNED_TO_ENGINEER',
      newState: 'APPROVED_BY_ENGINEER',
    });

    return updated;
  }

  async managerApprove(smrId: string, managerId: string) {
    const smr = await this.getSmrOrFail(smrId);
    this.assertState(smr.state, ['REQUESTED', 'APPROVED_BY_ENGINEER'], 'manager-approve');

    const updated = await this.prisma.smrRequest.update({
      where: { id: smrId },
      data: { state: 'APPROVED_BY_MANAGER', version: { increment: 1 } },
    });

    await this.audit.log({
      userId: managerId,
      action: 'MANAGER_APPROVE_SMR',
      entityType: 'SmrRequest',
      entityId: smrId,
      oldState: smr.state,
      newState: 'APPROVED_BY_MANAGER',
    });

    // Enqueue ERP sync
    await this.erpSync.enqueueSync(smrId);

    return updated;
  }

  async reject(smrId: string, reason: string, actorId: string) {
    const smr = await this.getSmrOrFail(smrId);
    if (smr.state === 'SYNCED_TO_ERP') {
      throw new BadRequestException('Cannot reject an SMR already synced to ERP');
    }

    const updated = await this.prisma.smrRequest.update({
      where: { id: smrId },
      data: {
        state: 'REJECTED',
        rejectionReason: reason,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'REJECT_SMR',
      entityType: 'SmrRequest',
      entityId: smrId,
      oldState: smr.state,
      newState: 'REJECTED',
      metadata: { reason },
    });

    return updated;
  }

  private async getSmrOrFail(id: string) {
    const smr = await this.prisma.smrRequest.findUnique({ where: { id } });
    if (!smr) throw new NotFoundException('SMR not found');
    return smr;
  }

  private assertState(current: SmrState, allowed: SmrState[], action: string) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Cannot ${action} SMR in ${current} state. Allowed: ${allowed.join(', ')}`,
      );
    }
  }
}
