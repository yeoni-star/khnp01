import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { RESTAURANT_LABELS } from "@/lib/restaurants";
import { DEFAULT_INSPECTION_COLUMNS, type InspectionColumn } from "@/lib/inspection";
import TemplateEditorForm from "@/components/inspection/TemplateEditorForm";

export default async function InspectionTemplatePage() {
  const session = await getSession();
  const restaurant = session!.restaurant;

  const template = await db.inspectionTemplate.findUnique({ where: { restaurant } });
  const columns = (template?.columns as InspectionColumn[] | undefined) ?? DEFAULT_INSPECTION_COLUMNS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">검수일지 양식 설정</h1>
        <p className="mt-1 text-sm text-gray-600">{RESTAURANT_LABELS[restaurant]} 검수일지에 쓰일 컬럼을 구성합니다.</p>
      </div>

      <TemplateEditorForm restaurantLabel={RESTAURANT_LABELS[restaurant]} initialColumns={columns} />
    </div>
  );
}
