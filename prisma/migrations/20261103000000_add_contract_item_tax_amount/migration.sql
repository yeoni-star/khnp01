-- 계약 단가표에 입력한 품목별 세액(단위당)을 저장한다. 비어 있으면(NULL) 기존처럼 금액의 10%로 자동 계산한다.
ALTER TABLE "ContractItem" ADD COLUMN "taxAmount" INTEGER;
