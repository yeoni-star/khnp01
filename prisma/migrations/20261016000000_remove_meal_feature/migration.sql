-- 식수 정산/외부업체/식사 등록·체크인 기능 제거에 따라 관련 테이블과 enum을 모두 삭제한다.
DROP TABLE "MealRegistration";
DROP TABLE "MealDailySchedule";
DROP TABLE "MealTimeSettings";
DROP TABLE "MealCompany";
DROP TYPE "MealType";
