"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm font-medium text-gray-900">문제가 발생했습니다.</p>
      <p className="max-w-md text-xs text-gray-500">
        {error.message || "알 수 없는 오류가 발생했습니다. 다시 시도해 주세요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  );
}
