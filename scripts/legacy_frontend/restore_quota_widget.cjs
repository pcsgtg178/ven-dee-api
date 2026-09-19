const fs = require('fs');
const path = require('path');

// =========================================================================
// Patch ScheduleTodoListView.tsx - Add quotaStats prop + MonthlyQuotaWidget
// =========================================================================
const todoPath = path.resolve(__dirname, '../../ven-dee-app/app/components/ScheduleTodoListView.tsx');
let code = fs.readFileSync(todoPath, 'utf8');

// 1. Add import for MonthlyQuotaWidget at the top
if (!code.includes('MonthlyQuotaWidget')) {
  code = code.replace(
    'import ActivityCard from "./ActivityCard";',
    'import ActivityCard from "./ActivityCard";\nimport MonthlyQuotaWidget from "./MonthlyQuotaWidget";'
  );
}

// 2. Add quotaStats to the Props interface
code = code.replace(
  'export interface ScheduleTodoListViewProps {',
  `export interface QuotaStats {
  blackCount: number;
  redCount: number;
  quota: number;
  remaining: number;
  isMet: boolean;
}

export interface ScheduleTodoListViewProps {
  /** สถิติโควตาเวรดำ/เวรแดงของเดือนนี้ (สำหรับ MonthlyQuotaWidget) */
  quotaStats: QuotaStats;
  /** เดือนปัจจุบัน เช่น "2026-09" */
  currentMonthKey: string;`
);

// 3. Add quotaStats and currentMonthKey to the destructured params
code = code.replace(
  `}: ScheduleTodoListViewProps) {`,
  `  quotaStats,
  currentMonthKey,
}: ScheduleTodoListViewProps) {`
);

// Fix double-insertion of destructured list if already patched
// Now insert MonthlyQuotaWidget before Filter Pills in JSX
code = code.replace(
  `    <div className="space-y-3.5">
      {/* Filter Pills */}`,
  `    <div className="space-y-3.5">
      {/* MONTHLY QUOTA WIDGET */}
      <MonthlyQuotaWidget
        currentMonthStr={currentMonthKey}
        blackCount={quotaStats.blackCount}
        redCount={quotaStats.redCount}
        quota={quotaStats.quota}
        remaining={quotaStats.remaining}
        isMet={quotaStats.isMet}
      />

      {/* Filter Pills */}`
);

fs.writeFileSync(todoPath, code, 'utf8');
console.log('✅ ScheduleTodoListView.tsx patched with quotaStats prop & MonthlyQuotaWidget');

// =========================================================================
// Patch ScheduleOverview.tsx - Pass quotaStats to ScheduleTodoListView
// =========================================================================
const overviewPath = path.resolve(__dirname, '../../ven-dee-app/app/components/ScheduleOverview.tsx');
let overview = fs.readFileSync(overviewPath, 'utf8');

if (!overview.includes('quotaStats={quotaStats}')) {
  overview = overview.replace(
    '<ScheduleTodoListView\n            activities={activities}',
    '<ScheduleTodoListView\n            quotaStats={quotaStats}\n            currentMonthKey={currentMonthKey}\n            activities={activities}'
  );
  fs.writeFileSync(overviewPath, overview, 'utf8');
  console.log('✅ ScheduleOverview.tsx updated: quotaStats passed to ScheduleTodoListView');
} else {
  console.log('ℹ️  ScheduleOverview.tsx already passes quotaStats');
}
