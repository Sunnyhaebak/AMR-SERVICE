import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeRecordType, ChangeType, ServiceType, ChangeHistoryStatus } from '@prisma/client';

@Injectable()
export class ChangeHistoryService {
  constructor(private prisma: PrismaService) {}

  async findByBot(botId: string, filters?: {
    changeType?: ChangeType;
    serviceType?: ServiceType;
    status?: ChangeHistoryStatus;
    startDate?: string;
    endDate?: string;
    engineerId?: string;
  }) {
    return this.prisma.amrChangeHistory.findMany({
      where: {
        botId,
        recordType: 'BOT_LEVEL',
        ...(filters?.changeType && { changeType: filters.changeType }),
        ...(filters?.serviceType && { serviceType: filters.serviceType }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.engineerId && { engineerId: filters.engineerId }),
        ...((filters?.startDate || filters?.endDate) && {
          date: {
            ...(filters?.startDate && { gte: new Date(filters.startDate) }),
            ...(filters?.endDate && { lte: new Date(filters.endDate) }),
          },
        }),
      },
      include: {
        engineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, customerName: true } },
        smr: { select: { id: true, items: true, erpId: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByCustomer(siteIds: string[], filters?: {
    changeType?: ChangeType;
    serviceType?: ServiceType;
    status?: ChangeHistoryStatus;
    startDate?: string;
    endDate?: string;
    engineerId?: string;
  }) {
    return this.prisma.amrChangeHistory.findMany({
      where: {
        siteId: { in: siteIds },
        recordType: 'CUSTOMER_LEVEL',
        ...(filters?.changeType && { changeType: filters.changeType }),
        ...(filters?.serviceType && { serviceType: filters.serviceType }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.engineerId && { engineerId: filters.engineerId }),
        ...((filters?.startDate || filters?.endDate) && {
          date: {
            ...(filters?.startDate && { gte: new Date(filters.startDate) }),
            ...(filters?.endDate && { lte: new Date(filters.endDate) }),
          },
        }),
      },
      include: {
        engineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, customerName: true } },
        smr: { select: { id: true, items: true, erpId: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
