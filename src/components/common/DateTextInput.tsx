"use client";

import { useState } from "react";
import { isCompleteDigitDate, parseDateInput, sanitizeDateInput } from "@/lib/date-input";

/**
 * 숫자로 바로 입력(20260929 / 260929 / 0929)하거나 오른쪽 달력 아이콘으로 고르는 날짜 입력칸.
 * value/onChange는 항상 YYYY-MM-DD(또는 빈 문자열)를 주고받는다.
 */
export default function DateTextInput({
  value,
  onChange,
  onEnter,
  placeholder = "YYYYMMDD",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [lastEmitted, setLastEmitted] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== lastEmitted) {
      setText(value);
      setLastEmitted(value);
    }
  }

  function emit(next: string) {
    setLastEmitted(next);
    if (next !== value) onChange(next);
  }

  function handleTextChange(raw: string) {
    const next = sanitizeDateInput(raw);
    setText(next);
    if (next.trim() === "") {
      emit("");
      return;
    }
    const iso = parseDateInput(next);
    if (!iso) return;
    emit(iso);
    if (isCompleteDigitDate(next)) setText(iso);
  }

  function settle(): string | null {
    if (text.trim() === "") return null;
    const iso = parseDateInput(text);
    if (iso) {
      emit(iso);
      setText(iso);
      return iso;
    }
    setText(value);
    return null;
  }

  return (
    <div className="relative flex w-full min-w-0 items-center print:hidden">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={() => {
          settle();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const iso = settle();
          if (onEnter) {
            e.preventDefault();
            if (iso) onEnter(iso);
          }
        }}
        className={`min-w-0 flex-1 pr-7 ${className}`}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-1.5 h-4 w-4 text-gray-400"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      <input
        type="date"
        tabIndex={-1}
        aria-label="달력에서 날짜 선택"
        value={value}
        onChange={(e) => {
          emit(e.target.value);
          setText(e.target.value);
        }}
        className="absolute right-0 top-0 h-full w-8 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </div>
  );
}
