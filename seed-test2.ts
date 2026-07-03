import { db } from './src/lib/db';

async function main() {
  const c2 = await db.mealCompany.findFirst({
    where: { name: '베타환경 (테스트)' }
  });

  if (!c2) {
    console.error("베타환경 (테스트) 업체가 없습니다.");
    return;
  }

  const baseDate = new Date(); // Today
  
  const days = [0, -1, -2, -3]; // Today and past 3 days

  const dataToInsert: any[] = [];

  for (const offset of days) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offset);

    // 정기사 LUNCH
    const d1 = new Date(d);
    d1.setHours(11, 30, 0);
    dataToInsert.push({
      restaurant: 'A',
      companyId: c2.id,
      submitterName: '정기사',
      phone: '010-5678-9012',
      mealType: 'LUNCH',
      mealDate: d,
      submittedAt: d1,
    });

    // 정기사 DINNER
    const d2 = new Date(d);
    d2.setHours(17, 30, 0);
    dataToInsert.push({
      restaurant: 'A',
      companyId: c2.id,
      submitterName: '정기사',
      phone: '010-5678-9012',
      mealType: 'DINNER',
      mealDate: d,
      submittedAt: d2,
    });

    // 최안전 LUNCH
    const d3 = new Date(d);
    d3.setHours(12, 0, 0);
    dataToInsert.push({
      restaurant: 'A',
      companyId: c2.id,
      submitterName: '최안전',
      phone: '010-4567-8901',
      mealType: 'LUNCH',
      mealDate: d,
      submittedAt: d3,
    });

    // 최안전 DINNER
    const d4 = new Date(d);
    d4.setHours(18, 0, 0);
    dataToInsert.push({
      restaurant: 'A',
      companyId: c2.id,
      submitterName: '최안전',
      phone: '010-4567-8901',
      mealType: 'DINNER',
      mealDate: d,
      submittedAt: d4,
    });
  }

  await db.mealRegistration.createMany({
    data: dataToInsert
  });

  console.log(`Added ${dataToInsert.length} test records for 베타환경!`);
}

main().catch(console.error).finally(() => process.exit(0));
