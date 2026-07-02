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
| `DATABASE_URL` | Postgres(Supabase) 커넥션 풀링(pgbouncer) 연결 문자열, 앱 런타임 쿼리용 |
| `DIRECT_URL` | Postgres(Supabase) 직접 연결 문자열, `prisma migrate`/`db push` 등 CLI 전용 |
| `APP_PASSWORD` | 로그인 공용 비밀번호 |
| `APP_SECRET` | 세션 쿠키 서명용 비밀키 (운영 배포 전 반드시 긴 랜덤 문자열로 교체) |

개발 환경에서 `APP_PASSWORD`/`APP_SECRET`을 비워두면 콘솔 경고와 함께 임시 기본값이 사용됩니다. 운영 환경에서는 반드시 값을 설정해야 합니다.

## 주요 기능

- **계약 관리**: 업체명은 계약 등록 시 직접 입력하며(별도 업체 등록 화면 없음, 동일 업체명이면 자동으로 같은 업체로 연결), 계약 단위로 카테고리(양곡/김치류/농수산물/육류/공산품)를 하나 지정합니다. **계약과 단가표는 식당 A/B 공통**이며, 같은 업체에 기간이 겹치는 계약은 생성이 차단됩니다.
- **거래명세표 입력**: 수기입력 또는 JPG/PNG 업로드 시 Tesseract.js(로컬 OCR, API 키 불필요)로 품목을 자동 인식해 입력폼을 채웁니다. 업로드한 원본 이미지를 옆에 띄워 대조하며 수정할 수 있습니다. 품목명 입력 시 활성 계약의 단가가 자동으로 채워지며, 정확히 일치하지 않으면 유사 품목을 제안합니다. 거래명세표 자체는 식당별로 구분되어 저장됩니다.
- **미등록 품목**: 계약에 없고 유사매칭도 거부된 품목을 모아볼 수 있는 화면.
- **월별 납품보고서**:
  - 업체별 보고서(문서A): 품목별 수량/단가/금액 + 주차별 납품현황 매트릭스, 결재란(담당/차장). 카테고리별로 그룹핑된 목록에서 진입합니다.
  - 전체 통합 요약(문서B): 카테고리별 합계 금액 + 총 합계, 결재란(담당/차장/부장).
  - 두 문서 모두 엑셀 내보내기와 인쇄용 화면을 지원합니다.
- **소요수량 산출**: 임의 기간을 지정해 품목별 납품 수량 합계만 집계(단가 제외). 계약 갱신 시 소요수량 산정에 참고.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL(Supabase) (`@prisma/adapter-pg` 드라이버 어댑터)
- Zod, exceljs, `tesseract.js`(로컬 OCR)
- Vitest (순수 집계/매칭 로직 단위테스트)

## 폴더 구조 (요약)

```
prisma/schema.prisma         데이터 모델
src/lib/pricing.ts           계약 단가 자동조회 (findActiveContractItem)
src/lib/item-matching.ts     유사 품목 매칭 (Dice coefficient)
src/lib/vendor-report.ts     업체별 납품보고서 집계 (문서A, 주차 매트릭스)
src/lib/report-aggregate.ts  전체 통합 요약 집계 (문서B)
src/lib/quantity-aggregate.ts 소요수량 산출 집계
src/lib/ocr/                 Tesseract.js OCR 파이프라인 (행 파싱 휴리스틱)
src/app/(app)/                로그인 후 접근 가능한 전체 화면
src/actions/                  Server Actions (CRUD)
src/proxy.ts                  세션 인증 게이트
```
