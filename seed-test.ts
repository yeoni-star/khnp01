import { db } from './src/lib/db';

async function main() {
  const c1 = await db.mealCompany.create({
    data: {
      name: '알파건설 (테스트)',
      pricePerMeal: 8000,
    }
  });

  const c2 = await db.mealCompany.create({
    data: {
      name: '베타환경 (테스트)',
      pricePerMeal: 8500,
    }
  });

  await db.mealRegistration.createMany({
    data: [
      {
        restaurant: 'A',
        companyId: c1.id,
        submitterName: '김건설',
        phone: '010-1234-5678',
        mealType: 'LUNCH',
        mealDate: new Date(),
        submittedAt: new Date(new Date().setHours(11, 30, 0)),
      },
      {
        restaurant: 'A',
        companyId: c1.id,
        submitterName: '이현장',
        phone: '010-2345-6789',
        mealType: 'LUNCH',
        mealDate: new Date(),
        submittedAt: new Date(new Date().setHours(11, 35, 0)),
      },
      {
        restaurant: 'A',
        companyId: c1.id,
        submitterName: '박소장',
        phone: '010-3456-7890',
        mealType: 'DINNER',
        mealDate: new Date(),
        submittedAt: new Date(new Date().setHours(17, 40, 0)),
      }
    ]
  });

  await db.mealRegistration.createMany({
    data: [
      {
        restaurant: 'A',
        companyId: c2.id,
        submitterName: '최안전',
        phone: '010-4567-8901',
        mealType: 'LUNCH',
        mealDate: new Date(),
        submittedAt: new Date(new Date().setHours(12, 10, 0)),
      },
      {
        restaurant: 'A',
        companyId: c2.id,
        submitterName: '정기사',
        phone: '010-5678-9012',
        mealType: 'DINNER',
        mealDate: new Date(),
        submittedAt: new Date(new Date().setHours(18, 0, 0)),
      }
    ]
  });

  console.log('Seed completed!');
}

main().catch(console.error).finally(() => process.exit(0));
