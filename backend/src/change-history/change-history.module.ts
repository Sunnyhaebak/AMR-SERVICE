import { Module } from '@nestjs/common';
import { ChangeHistoryService } from './change-history.service';
import { ChangeHistoryController } from './change-history.controller';

@Module({
  controllers: [ChangeHistoryController],
  providers: [ChangeHistoryService],
  exports: [ChangeHistoryService],
})
export class ChangeHistoryModule {}
