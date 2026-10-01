"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented one-time-code input.
 *
 * Uses a single visually-hidden-free text input styled as N boxes rather than N
 * separate inputs: it keeps one caret, one paste target, and lets the OS SMS
 * autofill work via `autocomplete="one-time-code"`. Arrow keys, Backspace and
 * non-digit input are handled manually.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  className,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = React.useCallback(
    (next: string) => {
      const digits = next.replace(/\D/g, "").slice(0, length);
      onChange(digits);
      if (digits.length === length && onComplete) {
        onComplete(digits);
      }
    },
    [length, onChange, onComplete],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commit(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && value.length === 0) {
      inputRef.current?.blur();
      return;
    }
    // Keep the caret inside the value regardless of where it was clicked.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const pos = value.length === length ? value.length : el.selectionStart;
      el.setSelectionRange(pos, pos);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(e.clipboardData.getData("text"));
  };

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  return (
    <div className={cn("relative", className)}>
      <div className="flex justify-between gap-2" aria-hidden="true">
        {chars.map((char, i) => (
          <div
            key={i}
            className={cn(
              "flex h-14 w-full items-center justify-center rounded-xl border text-xl font-semibold transition-colors",
              invalid
                ? "border-red-300 bg-red-50 text-red-600"
                : char
                  ? "border-zinc-400 bg-white text-zinc-900"
                  : "border-zinc-200 bg-zinc-50 text-zinc-400",
            )}
          >
            {char || "•"}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={`${length}-digit verification code`}
        aria-invalid={invalid || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={(e) => e.currentTarget.select()}
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none focus:ring-0"
      />
    </div>
  );
}
