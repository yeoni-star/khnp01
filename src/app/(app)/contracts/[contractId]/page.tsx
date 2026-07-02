import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ContractForm from "@/components/contracts/ContractForm";
import DeleteContractButton from "@/components/contracts/DeleteContractButton";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const [contract, vendors] = await Promise.all([
    db.contract.findUnique({ where: { id: contractId }, include: { items: true } }),
    db.vendor.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!contract) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">계약 상세</h1>
        <DeleteContractButton contractId={contract.id} />
      </div>
      <ContractForm vendors={vendors} contract={contract} />
    </div>
  );
}
