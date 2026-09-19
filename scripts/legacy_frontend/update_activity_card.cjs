const fs = require('fs');

const cardPath = 'd:/ven-dee/ven-dee-app/app/components/ActivityCard.tsx';
let content = fs.readFileSync(cardPath, 'utf8');

// 1. Add Pencil to lucide-react imports if not there
if (!content.includes('Pencil,')) {
  content = content.replace('  MoreHorizontal,\n} from "lucide-react";', '  MoreHorizontal,\n  Pencil,\n} from "lucide-react";');
  console.log('Added Pencil to imports');
}

// 2. Add canEditShift, canEditService import from storage
if (!content.includes('canEditShift')) {
  content = content.replace(
    'import {\n  ActivityItem,',
    'import { canEditShift, canEditService } from "../../lib/storage";\nimport {\n  ActivityItem,'
  );
  console.log('Added canEditShift, canEditService import');
}

// 3. Add onEditShift and onEditService to ActivityCardProps
const oldProps = `export interface ActivityCardProps {
  item: ActivityItem;
  onDelete: () => void;
  onToggleStatus?: () => void;
  onSwapShift?: (shift: ShiftRecord) => void;
  onViewTrail?: (shift: ShiftRecord) => void;
  onUndoSwap?: (shift: ShiftRecord) => void;
  onRestoreShift?: (shift: ShiftRecord) => void;
}`;

const newProps = `export interface ActivityCardProps {
  item: ActivityItem;
  onDelete: () => void;
  onToggleStatus?: () => void;
  onSwapShift?: (shift: ShiftRecord) => void;
  onViewTrail?: (shift: ShiftRecord) => void;
  onUndoSwap?: (shift: ShiftRecord) => void;
  onRestoreShift?: (shift: ShiftRecord) => void;
  onEditShift?: (shift: ShiftRecord) => void;
  onEditService?: (service: CustomerServiceRecord) => void;
}`;

content = content.replace(oldProps, newProps);

// 4. Update function parameters
const oldFuncHeader = `export default function ActivityCard({
  item,
  onDelete,
  onToggleStatus,
  onSwapShift,
  onViewTrail,
  onUndoSwap,
  onRestoreShift,
}: ActivityCardProps) {`;

const newFuncHeader = `export default function ActivityCard({
  item,
  onDelete,
  onToggleStatus,
  onSwapShift,
  onViewTrail,
  onUndoSwap,
  onRestoreShift,
  onEditShift,
  onEditService,
}: ActivityCardProps) {`;

content = content.replace(oldFuncHeader, newFuncHeader);

// 5. In Shift Card: compute canEdit
const oldShiftStart = `    const isSwappedOut = shift.status === "swapped_out";`;
const newShiftStart = `    const isSwappedOut = shift.status === "swapped_out";
    const canEdit = canEditShift(shift);`;

content = content.replace(oldShiftStart, newShiftStart);

// 6. In Shift Card: add Edit button beside Swap button
const oldSwapButtonBlock = `            {/* Action: ปุ่ม "แลกเวร" (เปิด Shift Swap Modal) */}
            {!isSwappedOut && onSwapShift && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onSwapShift(shift)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-secondary-dark hover:bg-secondary-light hover:text-secondary active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-secondary-dark/40 dark:hover:text-secondary-light transition-all shadow-2xs"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-secondary" />
                  <span>แลกเวรนี้</span>
                </button>
              </div>
            )}`;

const newSwapButtonBlock = `            {/* Actions: ปุ่ม "แก้ไขเวร" และ "แลกเวร" */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {canEdit && onEditShift && (
                <button
                  type="button"
                  onClick={() => onEditShift(shift)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-main hover:bg-sky-50 hover:text-secondary active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 transition-all shadow-2xs border border-surface-subtle dark:border-zinc-700"
                >
                  <Pencil className="h-3.5 w-3.5 text-secondary" />
                  <span>แก้ไขเวร</span>
                </button>
              )}
              {!isSwappedOut && onSwapShift && (
                <button
                  type="button"
                  onClick={() => onSwapShift(shift)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-secondary-dark hover:bg-secondary-light hover:text-secondary active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-secondary-dark/40 dark:hover:text-secondary-light transition-all shadow-2xs"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-secondary" />
                  <span>แลกเวรนี้</span>
                </button>
              )}
            </div>`;

content = content.replace(oldSwapButtonBlock, newSwapButtonBlock);

// 7. In Shift Card: add pencil button next to Delete button
const oldShiftDeleteBlock = `          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-text-muted hover:bg-rose-50 hover:text-shift-red dark:hover:bg-rose-950/40 transition-colors"
            title="ลบเวรนี้"
          >
            <Trash2 className="h-4 w-4" />
          </button>`;

const newShiftDeleteBlock = `          {/* Action Buttons: Edit + Delete */}
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && onEditShift && (
              <button
                type="button"
                onClick={() => onEditShift(shift)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-sky-50 hover:text-secondary active:scale-95 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 transition-all"
                title="แก้ไขเวรนี้"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-text-muted hover:bg-rose-50 hover:text-shift-red active:scale-95 dark:hover:bg-rose-950/40 transition-colors"
              title="ลบเวรนี้"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>`;

content = content.replace(oldShiftDeleteBlock, newShiftDeleteBlock);

// 8. In Service Card: compute canEdit and add pencil button next to Delete button
const oldServiceStart = `  /* Customer Service Card */
  const service = item as CustomerServiceRecord;
  const isCompleted = service.status === "completed";`;

const newServiceStart = `  /* Customer Service Card */
  const service = item as CustomerServiceRecord;
  const isCompleted = service.status === "completed";
  const canEdit = canEditService(service);`;

content = content.replace(oldServiceStart, newServiceStart);

const oldServiceDeleteBlock = `        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-text-muted hover:bg-rose-50 hover:text-shift-red dark:hover:bg-rose-950/40 transition-colors"
          title="ลบนัดหมายนี้"
        >
          <Trash2 className="h-4 w-4" />
        </button>`;

const newServiceDeleteBlock = `        {/* Action Buttons: Edit + Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && onEditService && (
            <button
              type="button"
              onClick={() => onEditService(service)}
              className="rounded-lg p-1.5 text-text-muted hover:bg-emerald-50 hover:text-primary active:scale-95 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-all"
              title="แก้ไขนัดหมายนี้"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-text-muted hover:bg-rose-50 hover:text-shift-red active:scale-95 dark:hover:bg-rose-950/40 transition-colors"
            title="ลบนัดหมายนี้"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>`;

content = content.replace(oldServiceDeleteBlock, newServiceDeleteBlock);

fs.writeFileSync(cardPath, content, 'utf8');
console.log('Successfully updated ActivityCard.tsx');
