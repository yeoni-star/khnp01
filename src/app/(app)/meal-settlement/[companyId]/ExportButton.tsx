"use client";

export default function ExportButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => {
        window.location.assign(url);
      }}
      className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
    >
      엑셀로 내보내기
    </button>
  );
}
