import { Module } from '@nestjs/common';
import { SmrService } from './smr.service';
import { SmrController } from './smr.controller';
import { ErpSyncService } from './erp-sync.service';

@Module({
  controllers: [SmrController],
  providers: [SmrService, ErpSyncService],
  exports: [SmrService],
})
export class SmrModule {}
