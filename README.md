# 납품보고서 관리 시스템

식자재 거래명세표를 입력/보관하고, 계약 단가표를 관리하며, 월별 납품보고서(업체별 상세 + 전체 통합 요약)를 자동 생성하는 사내용 웹앱입니다.

## 로컬 실행

```bash
npm install
npx prisma migrate dev
npm run dev
```

`http://localhost:3000` 접속 → `.env`의 `APP_PASSWORD`로 로그인. 로그인 시에는 식당을 따로 선택하지 않고, 로그인 후 상단 내비게이션의 "식당 A / 식당 B" 버튼으로 언제든 전환할 수 있습니다(기본값 식당 A).

데이터 확인용 GUI:

```bash
npx prisma studio
```

테스트 실행:

```bash
npm test
```

## 환경변수

`.env.example`을 참고해 `.env` 또는 `.env.local`에 설정합니다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | SQLite 파일 경로 (기본값 `file:./dev.db`) |
| `APP_PASSWORD` | 로그인 공용 비밀번호 |
| `APP_SECRET` | 세션 쿠키 서명용 비밀키 (운영 배포 전 반드시 긴 랜덤 문자열로 교체) |
| `ANTHROPIC_API_KEY` | 거래명세표 OCR(Claude Vision)용. 비워두면 업로드 기능이 자동으로 비활성화되고 수기입력만 가능 |

개발 환경에서 `APP_PASSWORD`/`APP_SECRET`을 비워두면 콘솔 경고와 함께 임시 기본값이 사용됩니다. 운영 환경에서는 반드시 값을 설정해야 합니다.

## 주요 기능

- **업체/계약 관리**: 업체 등록, 계약(계약기간+단가표) 등록. **계약과 단가표는 식당 A/B 공통**이며(같은 업체와 두 식당이 하나의 단가표를 공유), 같은 업체에 기간이 겹치는 계약은 생성이 차단됩니다.
- **거래명세표 입력**: 수기입력 또는(OCR 설정 시) PDF/JPG 업로드 자동 인식. 품목명 입력 시 활성 계약의 단가가 자동으로 채워지며, 정확히 일치하지 않으면 유사 품목을 제안합니다. 거래명세표 자체는 식당별로 구분되어 저장됩니다.
- **미등록 품목**: 계약에 없고 유사매칭도 거부된 품목을 모아볼 수 있는 화면.
- **월별 납품보고서**:
  - 업체별 보고서(문서A): 품목별 수량/단가/금액 + 주차별 납품현황 매트릭스, 결재란(담당/차장).
  - 전체 통합 요약(문서B): 카테고리별 소계 + 총 합계, 결재란(담당/차장/부장).
  - 두 문서 모두 엑셀 내보내기와 인쇄용 화면을 지원합니다.
- **소요수량 산출**: 임의 기간을 지정해 품목별 납품 수량 합계만 집계(단가 제외). 계약 갱신 시 소요수량 산정에 참고.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (`@prisma/adapter-better-sqlite3` 드라이버 어댑터)
- Zod, exceljs, `@anthropic-ai/sdk`
- Vitest (순수 집계/매칭 로직 단위테스트)

## SQLite → PostgreSQL 이전 체크리스트 (클라우드 배포 시)

1. `prisma/schema.prisma`의 `datasource db` 블록에서 `provider = "sqlite"` → `provider = "postgresql"`로 변경.
2. `src/lib/db.ts`의 `PrismaBetterSqlite3` 드라이버 어댑터를 Postgres용 어댑터(`@prisma/adapter-pg` 등)로 교체하고 `DATABASE_URL`을 Postgres 연결 문자열로 설정.
3. `prisma.config.ts`의 `datasource.url`이 새 `DATABASE_URL`을 가리키는지 확인.
4. `npx prisma migrate deploy`로 운영 DB에 마이그레이션 적용 (기존 SQLite 마이그레이션 히스토리를 그대로 재사용 가능).
5. `storage/uploads` 로컬 파일 저장을 `src/lib/storage.ts`의 `saveUploadedFile` 구현만 교체해 클라우드 스토리지(S3 등)로 이전.
6. `APP_SECRET`, `APP_PASSWORD`, `ANTHROPIC_API_KEY`를 배포 환경의 시크릿 매니저에 등록.

## 폴더 구조 (요약)

```
prisma/schema.prisma         데이터 모델
src/lib/pricing.ts           계약 단가 자동조회 (findActiveContractItem)
src/lib/item-matching.ts     유사 품목 매칭 (Dice coefficient)
src/lib/vendor-report.ts     업체별 납품보고서 집계 (문서A, 주차 매트릭스)
src/lib/report-aggregate.ts  전체 통합 요약 집계 (문서B)
src/lib/quantity-aggregate.ts 소요수량 산출 집계
src/lib/ocr/                 Claude Vision OCR 파이프라인
src/app/(app)/                로그인 후 접근 가능한 전체 화면
src/actions/                  Server Actions (CRUD)
src/proxy.ts                  세션 인증 게이트
```
