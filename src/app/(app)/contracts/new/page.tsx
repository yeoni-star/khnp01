import { db } from "@/lib/db";
import ContractForm from "@/components/contracts/ContractForm";

export default async function NewContractPage() {
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">새 계약 등록</h1>
      <ContractForm vendorNames={vendors.map((v) => v.name)} />
    </div>
  );
}
