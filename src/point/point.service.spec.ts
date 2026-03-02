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

    // =========================================
    // 단계 1: 포인트 조회
    // =========================================
    describe('포인트 조회', () => {
        /**
         * 한 번도 충전한 적 없는 사용자를 조회하면?
         * → 에러가 아니라 0포인트를 반환해야 한다.
         * (UserPointTable은 없는 사용자를 조회하면 기본값 { point: 0 }을 반환함)
         */
        it('신규 사용자를 조회하면 0 포인트를 반환한다', async () => {
            // Given: 한 번도 충전한 적 없는 사용자 1번
            // When: 포인트를 조회하면
            const result = await service.getUserPoint(1);

            // Then: 0 포인트가 반환된다
            expect(result.id).toBe(1);
            expect(result.point).toBe(0);
        });

        /**
         * 포인트가 있는 사용자를 조회하면?
         * → DB에 저장된 정확한 포인트를 반환해야 한다.
         */
        it('포인트가 있는 사용자를 조회하면 해당 포인트를 반환한다', async () => {
            // Given: 사용자 1번에 1000포인트가 있는 상황
            await userDb.insertOrUpdate(1, 1000);

            // When: 포인트를 조회하면
            const result = await service.getUserPoint(1);

            // Then: 1000포인트가 반환된다
            expect(result.id).toBe(1);
            expect(result.point).toBe(1000);
        });

        /**
         * 유효하지 않은 ID(0, 음수)로 조회하면?
         * → 에러가 발생해야 한다.
         */
        it('유효하지 않은 ID로 조회하면 에러가 발생한다', async () => {
            // Given: 유효하지 않은 ID (0, 음수)
            // When & Then: 조회 시 에러가 발생한다
            await expect(service.getUserPoint(0)).rejects.toThrow();
            await expect(service.getUserPoint(-1)).rejects.toThrow();
        });
    });
});
