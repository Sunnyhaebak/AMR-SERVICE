import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ErpSyncService {
  private readonly logger = new Logger(ErpSyncService.name);
  private readonly maxRetries: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.maxRetries = this.config.get<number>('ERP_MAX_RETRIES', 5);
  }

  /**
   * Enqueue an SMR for ERP sync. Generates idempotency key and attempts sync.
   */
  async enqueueSync(smrId: string) {
    const smr = await this.prisma.smrRequest.findUnique({ where: { id: smrId } });
    if (!smr) return;

    const idempotencyKey = smr.idempotencyKey ?? `${smrId}-${uuidv4()}`;

    if (!smr.idempotencyKey) {
      await this.prisma.smrRequest.update({
        where: { id: smrId },
        data: { idempotencyKey },
      });
    }

    await this.syncToErp(smrId, idempotencyKey, 0);
  }

  private async syncToErp(smrId: string, idempotencyKey: string, attempt: number) {
    try {
      // TODO: Replace with actual ERPNext API call
      const erpApiUrl = this.config.get<string>('ERPNEXT_API_URL');
      this.logger.log(`Syncing SMR ${smrId} to ERP (attempt ${attempt + 1}), URL: ${erpApiUrl}`);

      // Simulated ERP response — replace with real HTTP call
      const erpId = `ERP-${Date.now()}`;

      await this.prisma.smrRequest.update({
        where: { id: smrId },
        data: {
          state: 'SYNCED_TO_ERP',
          erpId,
          erpStatus: 'DRAFT',
          version: { increment: 1 },
        },
      });

      this.logger.log(`SMR ${smrId} synced to ERP as ${erpId}`);
    } catch (error) {
      this.logger.error(`ERP sync failed for SMR ${smrId}, attempt ${attempt + 1}`, error);

      if (attempt < this.maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 60_000; // exponential backoff
        setTimeout(() => this.syncToErp(smrId, idempotencyKey, attempt + 1), delay);
      } else {
        this.logger.error(`SMR ${smrId} failed after ${this.maxRetries} retries. Flagging for manual intervention.`);
        // Flag for manual intervention — could set a field or create a notification
      }
    }
  }

  /**
   * Poll ERPNext every 15 minutes to update SMR statuses.
   */
  @Cron('0 */15 * * * *')
  async pollErpStatuses() {
    const syncedSmrs = await this.prisma.smrRequest.findMany({
      where: {
        state: 'SYNCED_TO_ERP',
        erpId: { not: null },
        erpStatus: { not: 'DELIVERED' },
      },
    });

    for (const smr of syncedSmrs) {
      try {
        // TODO: Replace with actual ERPNext status check API call
        // const status = await this.fetchErpStatus(smr.erpId);
        // await this.prisma.smrRequest.update({
        //   where: { id: smr.id },
        //   data: { erpStatus: status },
        // });
        this.logger.debug(`Polling ERP status for SMR ${smr.id} (ERP ID: ${smr.erpId})`);
      } catch (error) {
        this.logger.error(`Failed to poll ERP status for SMR ${smr.id}`, error);
      }
    }
  }
}
