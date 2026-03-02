import { Injectable } from '@nestjs/common';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointHistory, TransactionType, UserPoint } from './point.model';

@Injectable()
export class PointService {
    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    async getUserPoint(userId: number): Promise<UserPoint> {
        return this.userDb.selectById(userId);
    }

    async chargeUserPoint(userId: number, amount: number): Promise<UserPoint> {
        this.validateUserId(userId);

        if (amount <= 0) {
            throw new Error('충전 금액은 0보다 커야 합니다.');
        }

        const currentPoint = await this.userDb.selectById(userId);
        const newTotal = currentPoint.point + amount;
        const updatedPoint = await this.userDb.insertOrUpdate(userId, newTotal);
        await this.historyDb.insert(userId, amount, TransactionType.CHARGE, Date.now());

        return updatedPoint;
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
