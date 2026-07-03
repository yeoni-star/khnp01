"use client";

export default function ExportCsvButton({
  data,
  filename = "미등록품목.csv",
}: {
  data: Record<string, string | number>[];
  filename?: string;
}) {
  const handleExport = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent =
      "﻿" +
      headers.join(",") +
      "\n" +
      data
        .map((row) =>
          headers
            .map((header) => {
              const val = row[header];
              const escaped = String(val).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      엑셀(CSV) 다운로드
    </button>
  );
}
