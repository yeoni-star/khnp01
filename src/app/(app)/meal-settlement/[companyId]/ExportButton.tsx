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
      // MIME 타입을 명시적으로 xlsx로 지정하여 브라우저가 올바른 확장자로 저장하도록 보장
      const xlsxBlob = new Blob([blob], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(xlsxBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // URL 파라미터에서 날짜 범위를 추출해 파일명 구성 (헤더 파싱 불필요)
      let filename = "meal_settlement.xlsx";
      try {
        const urlObj = new URL(url, window.location.origin);
        const start = urlObj.searchParams.get("start");
        const end = urlObj.searchParams.get("end");
        if (start && end) {
          filename = `meal_settlement_${start}_${end}.xlsx`;
        }
      } catch {
        // URL 파싱 실패 시 기본 파일명 사용
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

