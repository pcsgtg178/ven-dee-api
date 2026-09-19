const fs = require('fs');

const code = `"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Flame,
  ChevronDown,
  Pencil,
  X,
  Check,
} from "lucide-react";
import moment from "moment";
import "moment/locale/th";

interface MonthlyQuotaWidgetProps {
  currentMonthStr?: string;
  blackCount: number;
  redCount: number;
  quota: number;
  remaining: number;
  isMet: boolean;
  onQuotaChange?: (newQuota: number) => void;
}

export default function MonthlyQuotaWidget({
  currentMonthStr = "2026-09",
  blackCount,
  redCount,
  quota,
  remaining,
  isMet,
  onQuotaChange,
}: MonthlyQuotaWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(quota));
  const inputRef = useRef<HTMLInputElement>(null);

  const percentage = Math.min(100, Math.round((blackCount / quota) * 100));

  const monthDisplay = moment(currentMonthStr, "YYYY-MM")
    .locale("th")
    .format("MMMM YYYY");

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(String(quota));
  }, [quota]);

  const handleSaveQuota = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val > 0 && val !== quota) {
      onQuotaChange?.(val);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(String(quota));
    setEditing(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-subtle bg-card-bg shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
      {/* COMPACT HEADER (always visible) */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        {/* Left: Icon + Summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={\`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs \${
              isMet
                ? "bg-primary-light text-primary dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-shift-red-badge text-shift-red dark:bg-rose-950/60 dark:text-rose-400"
            }\`}
          >
            {isMet ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
          </div>

          {/* One-line summary */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap min-w-0">
            <span className="flex items-center gap-1 font-semibold text-text-main dark:text-zinc-200 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-shift-black dark:bg-slate-200 shrink-0" />
              \u0E40\u0E27\u0E23\u0E14\u0E33:&nbsp;
              <strong
                className={
                  isMet
                    ? "text-primary dark:text-emerald-400"
                    : "text-shift-red dark:text-rose-400"
                }
              >
                {blackCount}/{quota}
              </strong>
              &nbsp;\u0E27\u0E31\u0E19
            </span>

            {!isMet ? (
              <span className="rounded-md bg-shift-red-badge px-1.5 py-0.5 text-[10px] font-bold text-shift-red-text dark:bg-rose-950/60 dark:text-rose-300 whitespace-nowrap">
                \u0E02\u0E32\u0E14\u0E2D\u0E35\u0E01 {remaining} \u0E27\u0E31\u0E19
              </span>
            ) : (
              <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-dark dark:bg-emerald-950/60 dark:text-emerald-300 whitespace-nowrap">
                \u2713 \u0E04\u0E23\u0E1A\u0E40\u0E01\u0E13\u0E11\u0E4C
              </span>
            )}

            <span className="flex items-center gap-1 text-text-muted dark:text-zinc-400 whitespace-nowrap">
              <Flame className="h-3 w-3 text-shift-red shrink-0" />
              \u0E40\u0E27\u0E23\u0E41\u0E14\u0E07:&nbsp;
              <strong className="text-shift-red dark:text-rose-400">
                {redCount}
              </strong>
              &nbsp;\u0E27\u0E31\u0E19
            </span>
          </div>
        </div>

        {/* Right: Edit + Expand buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              if (!expanded) setExpanded(true);
            }}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-main dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E04\u0E27\u0E15\u0E32"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-main dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title={expanded ? "\u0E0B\u0E48\u0E2D\u0E19\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14" : "\u0E14\u0E39\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21"}
          >
            <ChevronDown
              className={\`h-3.5 w-3.5 transition-transform duration-200 \${
                expanded ? "rotate-180" : ""
              }\`}
            />
          </button>
        </div>
      </div>

      {/* EXPANDED DETAIL (collapsible) */}
      <div
        className={\`grid transition-all duration-300 ease-in-out \${
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }\`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-surface-subtle px-3.5 pb-3.5 pt-2.5 space-y-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-main dark:text-white flex items-center gap-1.5">
                <span>\u0E42\u0E04\u0E27\u0E15\u0E49\u0E32\u0E40\u0E27\u0E23\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E40\u0E14\u0E37\u0E2D\u0E19</span>
                <span className="text-[11px] font-normal text-text-muted dark:text-zinc-400">
                  ({monthDisplay})
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-text-muted dark:text-zinc-400">
              <span>\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E40\u0E27\u0E23\u0E14\u0E33\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33:</span>
              {editing ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="number"
                    min="1"
                    max="31"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveQuota();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className="w-12 rounded-md border border-secondary bg-white px-1.5 py-0.5 text-center text-xs font-bold text-text-main dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    style={{ fontSize: "16px" }}
                  />
                  <span>\u0E27\u0E31\u0E19/\u0E40\u0E14\u0E37\u0E2D\u0E19</span>
                  <button
                    type="button"
                    onClick={handleSaveQuota}
                    className="rounded-md bg-primary p-1 text-white hover:brightness-110 transition-all active:scale-95"
                    title="\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-md bg-surface-subtle p-1 text-text-muted hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-all active:scale-95"
                    title="\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <span className="font-bold text-text-main dark:text-white">
                  {quota} \u0E27\u0E31\u0E19/\u0E40\u0E14\u0E37\u0E2D\u0E19
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-text-main dark:text-zinc-200">
                  {isMet ? "\uD83D\uDFE2" : "\uD83D\uDD34"} \u0E40\u0E27\u0E23\u0E14\u0E33:{" "}
                  <span
                    className={\`text-sm \${
                      isMet
                        ? "text-primary dark:text-emerald-400"
                        : "text-shift-red dark:text-rose-400"
                    }\`}
                  >
                    {blackCount}/{quota}
                  </span>{" "}
                  \u0E27\u0E31\u0E19
                  {isMet ? (
                    <span className="text-[11px] text-primary dark:text-emerald-400 font-medium">
                      (\u0E04\u0E23\u0E1A\u0E40\u0E01\u0E13\u0E11\u0E4C)
                    </span>
                  ) : (
                    <span className="text-[11px] text-shift-red dark:text-rose-400 font-medium">
                      (\u0E02\u0E32\u0E14\u0E2D\u0E35\u0E01 {remaining} \u0E27\u0E31\u0E19)
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-text-muted dark:text-zinc-400">
                  {percentage}%
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle dark:bg-zinc-800">
                <div
                  className={\`h-full rounded-full transition-all duration-500 \${
                    isMet
                      ? "bg-gradient-to-r from-emerald-500 to-primary"
                      : "bg-gradient-to-r from-amber-500 to-shift-red"
                  }\`}
                  style={{ width: \`\${percentage}%\` }}
                />
              </div>
            </div>

            {/* Mini Summary Counters */}
            <div className="flex items-center justify-between border-t border-surface-subtle pt-2.5 text-[11px] dark:border-zinc-800 text-text-muted dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-shift-black dark:bg-slate-200" />
                <span>
                  \u0E40\u0E27\u0E23\u0E14\u0E33 (\u0E1B\u0E23\u0E30\u0E08\u0E33):{" "}
                  <strong className="text-text-main dark:text-white">
                    {blackCount}
                  </strong>{" "}
                  \u0E27\u0E31\u0E19
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-shift-red shrink-0" />
                <span>
                  \u0E40\u0E27\u0E23\u0E41\u0E14\u0E07 (OT):{" "}
                  <strong className="text-shift-red dark:text-rose-400">
                    {redCount}
                  </strong>{" "}
                  \u0E27\u0E31\u0E19
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('d:/ven-dee/ven-dee-app/app/components/MonthlyQuotaWidget.tsx', code, 'utf8');
console.log('✅ MonthlyQuotaWidget.tsx written');
