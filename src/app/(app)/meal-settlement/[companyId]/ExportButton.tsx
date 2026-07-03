"use client";

import { useState } from "react";

export default function ExportButton({ url }: { url: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error("다운로드 실패");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "meal_settlement.xlsx";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
    >
      {loading ? "다운로드 중..." : "엑셀로 내보내기"}
    </button>
  );
}
