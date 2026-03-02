import { Injectable } from '@nestjs/common';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointHistory, UserPoint } from './point.model';

@Injectable()
export class PointService {
    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    async getUserPoint(userId: number): Promise<UserPoint> {
        return this.userDb.selectById(userId);
    }

    async getUserPointHistories(userId: number): Promise<PointHistory[]> {
        this.validateUserId(userId);
        return this.historyDb.selectAllByUserId(userId);
    }

    private validateUserId(userId: number): void {
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new Error('올바르지 않은 ID 값 입니다.');
        }
    }
}
