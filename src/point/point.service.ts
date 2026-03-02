import { Injectable } from '@nestjs/common';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { UserPoint } from './point.model';

@Injectable()
export class PointService {
    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    async getUserPoint(userId: number): Promise<UserPoint> {
        return this.userDb.selectById(userId);
    }
}
