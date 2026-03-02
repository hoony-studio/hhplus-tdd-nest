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

    // =========================================
    // 단계 2: 포인트 이력 조회
    // =========================================
    describe('포인트 이력 조회', () => {
        /**
         * 충전/사용 내역이 있는 사용자를 조회하면?
         * → 모든 이력이 반환되어야 한다.
         */
        it('충전/사용 이력이 있으면 전체 이력을 반환한다', async () => {
            // Given: 사용자 1번이 충전 1000, 사용 300을 한 상황
            await historyDb.insert(1, 1000, TransactionType.CHARGE, Date.now());
            await historyDb.insert(1, 300, TransactionType.USE, Date.now());

            // When: 이력을 조회하면
            const result = await service.getUserPointHistories(1);

            // Then: 2건의 이력이 반환된다
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe(TransactionType.CHARGE);
            expect(result[0].amount).toBe(1000);
            expect(result[1].type).toBe(TransactionType.USE);
            expect(result[1].amount).toBe(300);
        });

        /**
         * 이력이 없는 사용자를 조회하면?
         * → 에러가 아니라 빈 배열을 반환해야 한다.
         */
        /**
         * 다른 사용자의 이력이 섞여서 나오면 안 된다.
         * → 사용자 1번의 이력만 정확히 반환되어야 한다.
         */
        it('다른 사용자의 이력은 포함되지 않는다', async () => {
            // Given: 사용자 1번과 2번이 각각 충전한 상황
            await historyDb.insert(1, 1000, TransactionType.CHARGE, Date.now());
            await historyDb.insert(2, 5000, TransactionType.CHARGE, Date.now());

            // When: 사용자 1번의 이력을 조회하면
            const result = await service.getUserPointHistories(1);

            // Then: 사용자 1번의 이력 1건만 반환된다
            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe(1);
            expect(result[0].amount).toBe(1000);
        });

        it('이력이 없으면 빈 배열을 반환한다', async () => {
            // Given: 아무 이력이 없는 사용자 1번
            // When: 이력을 조회하면
            const result = await service.getUserPointHistories(1);

            // Then: 빈 배열이 반환된다
            expect(result).toEqual([]);
        });

        /**
         * 유효하지 않은 ID로 이력을 조회하면?
         * → PointHistoryTable은 ID 검사를 하지 않으므로, 서비스에서 직접 검증해야 한다.
         */
        it('유효하지 않은 ID로 이력 조회하면 에러가 발생한다', async () => {
            // Given: 유효하지 않은 ID (0, 음수)
            // When & Then: 조회 시 에러가 발생한다
            await expect(service.getUserPointHistories(0)).rejects.toThrow();
            await expect(service.getUserPointHistories(-1)).rejects.toThrow();
        });
    });

    // =========================================
    // 단계 3: 포인트 충전
    // =========================================
    describe('포인트 충전', () => {
        /**
         * 기존 포인트에 충전 금액을 더한 결과가 반환되어야 한다.
         * → 1000 + 500 = 1500
         */
        it('포인트를 충전하면 기존 포인트에 충전 금액이 합산된다', async () => {
            // Given: 사용자 1번에 1000포인트가 있는 상황
            await userDb.insertOrUpdate(1, 1000);

            // When: 500포인트를 충전하면
            const result = await service.chargeUserPoint(1, 500);

            // Then: 1500포인트가 된다
            expect(result.point).toBe(1500);
        });

        /**
         * 처음 충전하는 사용자는 포인트가 0이므로, 충전 금액이 그대로 포인트가 된다.
         * → 0 + 3000 = 3000
         */
        it('최초 충전 시 충전 금액이 그대로 포인트가 된다', async () => {
            // Given: 포인트가 없는 신규 사용자 1번
            // When: 3000포인트를 충전하면
            const result = await service.chargeUserPoint(1, 3000);

            // Then: 3000포인트가 된다
            expect(result.point).toBe(3000);
        });

        /**
         * 충전을 하면 CHARGE 타입의 이력이 반드시 기록되어야 한다.
         * → 이력이 없으면 나중에 "왜 포인트가 늘었는지" 추적이 불가능
         */
        it('충전 시 CHARGE 타입의 이력이 기록된다', async () => {
            // Given: 사용자 1번
            // When: 1000포인트를 충전하면
            await service.chargeUserPoint(1, 1000);

            // Then: CHARGE 이력이 1건 기록되어 있다
            const histories = await historyDb.selectAllByUserId(1);
            expect(histories).toHaveLength(1);
            expect(histories[0].type).toBe(TransactionType.CHARGE);
            expect(histories[0].amount).toBe(1000);
        });

        /**
         * 충전 금액이 0 이하이면 에러가 발생해야 한다.
         * → 0원이나 마이너스 충전은 의미가 없음
         */
        it('충전 금액이 0 이하이면 에러가 발생한다', async () => {
            // Given & When & Then: 0이나 음수로 충전 시도하면 에러
            await expect(service.chargeUserPoint(1, 0)).rejects.toThrow();
            await expect(service.chargeUserPoint(1, -100)).rejects.toThrow();
        });
    });

    // =========================================
    // 단계 4: 포인트 사용
    // =========================================
    describe('포인트 사용', () => {
        /**
         * 잔액에서 사용 금액을 뺀 결과가 반환되어야 한다.
         * → 1000 - 300 = 700
         */
        it('포인트를 사용하면 잔액에서 사용 금액이 차감된다', async () => {
            // Given: 사용자 1번에 1000포인트가 있는 상황
            await userDb.insertOrUpdate(1, 1000);

            // When: 300포인트를 사용하면
            const result = await service.useUserPoint(1, 300);

            // Then: 700포인트가 남는다
            expect(result.point).toBe(700);
        });

        /**
         * 잔액과 동일한 금액을 사용하면?
         * → 포인트가 정확히 0이 되어야 한다. (에러가 아님)
         */
        it('잔액과 동일한 금액을 사용하면 포인트가 0이 된다', async () => {
            // Given: 사용자 1번에 500포인트가 있는 상황
            await userDb.insertOrUpdate(1, 500);

            // When: 500포인트를 사용하면
            const result = await service.useUserPoint(1, 500);

            // Then: 0포인트가 된다
            expect(result.point).toBe(0);
        });

        /**
         * 잔액보다 많은 금액을 사용하려고 하면?
         * → 에러가 발생해야 하고, DB는 변경되지 않아야 한다.
         */
        it('잔액이 부족하면 에러가 발생한다', async () => {
            // Given: 사용자 1번에 100포인트가 있는 상황
            await userDb.insertOrUpdate(1, 100);

            // When & Then: 200포인트 사용 시도하면 에러
            await expect(service.useUserPoint(1, 200)).rejects.toThrow();

            // And: 포인트가 변경되지 않았는지 확인
            const afterPoint = await service.getUserPoint(1);
            expect(afterPoint.point).toBe(100);
        });

        /**
         * 사용을 하면 USE 타입의 이력이 반드시 기록되어야 한다.
         * → 이력이 없으면 나중에 "왜 포인트가 줄었는지" 추적이 불가능
         */
        it('사용 시 USE 타입의 이력이 기록된다', async () => {
            // Given: 사용자 1번에 1000포인트가 있는 상황
            await userDb.insertOrUpdate(1, 1000);

            // When: 300포인트를 사용하면
            await service.useUserPoint(1, 300);

            // Then: USE 이력이 1건 기록되어 있다
            const histories = await historyDb.selectAllByUserId(1);
            expect(histories).toHaveLength(1);
            expect(histories[0].type).toBe(TransactionType.USE);
            expect(histories[0].amount).toBe(300);
        });

        /**
         * 사용 금액이 0 이하이면 에러가 발생해야 한다.
         * → 0원이나 마이너스 사용은 의미가 없음
         */
        it('사용 금액이 0 이하이면 에러가 발생한다', async () => {
            // Given: 사용자 1번에 1000포인트가 있는 상황
            await userDb.insertOrUpdate(1, 1000);

            // When & Then: 0이나 음수로 사용 시도하면 에러
            await expect(service.useUserPoint(1, 0)).rejects.toThrow();
            await expect(service.useUserPoint(1, -100)).rejects.toThrow();
        });
    });
});
