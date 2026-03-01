import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { TransactionType } from './point.model';

describe('PointService', () => {
    let service: PointService;
    let userDb: UserPointTable;
    let historyDb: PointHistoryTable;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PointService, UserPointTable, PointHistoryTable],
        }).compile();

        service = module.get<PointService>(PointService);
        userDb = module.get<UserPointTable>(UserPointTable);
        historyDb = module.get<PointHistoryTable>(PointHistoryTable);
    });
});
