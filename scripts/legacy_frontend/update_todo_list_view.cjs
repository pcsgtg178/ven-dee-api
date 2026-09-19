const fs = require('fs');

const listPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleTodoListView.tsx';
let content = fs.readFileSync(listPath, 'utf8');

// 1. Add Pencil to lucide-react imports
if (!content.includes('Pencil,')) {
  content = content.replace(
    '  List,\n} from "lucide-react";',
    '  List,\n  Pencil,\n} from "lucide-react";'
  );
  console.log('Added Pencil import');
}

// 2. Add canEditShift, canEditService import from storage
if (!content.includes('canEditShift')) {
  content = content.replace(
    'import ActivityCard from "./ActivityCard";',
    'import ActivityCard from "./ActivityCard";\nimport { canEditShift, canEditService } from "../../lib/storage";'
  );
  console.log('Added canEditShift, canEditService import');
}

// 3. Add onEditShift and onEditService to ScheduleTodoListViewProps
const oldProps = `  onRequestRestore: (shift: ShiftRecord) => void;
  /** Optional: callback when user edits quota from MonthlyQuotaWidget */
  onQuotaChange?: (newQuota: number) => void;
}`;

const newProps = `  onRequestRestore: (shift: ShiftRecord) => void;
  /** Optional: callback when user edits quota from MonthlyQuotaWidget */
  onQuotaChange?: (newQuota: number) => void;
  /** Edit callbacks */
  onEditShift?: (shift: ShiftRecord) => void;
  onEditService?: (service: CustomerServiceRecord) => void;
}`;

content = content.replace(oldProps, newProps);

// 4. Update TimelineRow implementation
const oldTimelineRow = `function TimelineRow({ item }: { item: ActivityItem }) {
  if (item.type === "shift") {
    const shift = item as ShiftRecord;
    const shiftConf = SHIFT_CONFIG[shift.shiftType];
    const catConf = SHIFT_CATEGORY_CONFIG[shift.category];
    const isSwapped = shift.status === "swapped_out";

    return (
      <div
        className={\`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors \${
          isSwapped
            ? "opacity-50 bg-surface-subtle/50 dark:bg-zinc-800/30"
            : "bg-card-bg dark:bg-zinc-900"
        }\`}
      >
        {/* Color dot for category */}
        <span
          className={\`h-2.5 w-2.5 shrink-0 rounded-full \${
            shift.category === "black"
              ? "bg-shift-black dark:bg-slate-300"
              : shift.category === "red"
                ? "bg-shift-red"
                : "bg-emerald-500"
          }\`}
        />
        {/* Shift label */}
        <span
          className={\`font-bold \${shiftConf?.textBg || "text-text-main dark:text-white"}\`}
        >
          {shiftConf?.shortLabel || shift.shiftType}
        </span>
        <span className="text-text-muted dark:text-zinc-400">
          {shiftConf?.period || "ตลอดวัน"}
        </span>
        {/* Category badge */}
        <span
          className={\`rounded-md px-1.5 py-0.5 text-[10px] font-bold \${catConf?.badge || ""}\`}
        >
          {catConf?.label || shift.category}
        </span>
        {isSwapped && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            แลกแล้ว
          </span>
        )}
      </div>
    );
  }

  // Service
  const service = item as CustomerServiceRecord;
  const isCompleted = service.status === "completed";

  return (
    <div
      className={\`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs \${
        isCompleted
          ? "bg-primary-light/20 dark:bg-emerald-950/20"
          : "bg-card-bg dark:bg-zinc-900"
      }\`}
    >
      {/* Green dot for service */}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      <span className="font-bold text-primary-dark dark:text-primary-light">
        {service.time} น.
      </span>
      <span className="font-semibold text-text-main dark:text-white truncate">
        {service.customerName}
      </span>
      {/* Service type badges */}
      {service.services.slice(0, 2).map((srv) => {
        const conf = SERVICE_CONFIG[srv];
        return (
          <span
            key={srv}
            className={\`hidden sm:inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold \${conf?.bg || ""}\`}
          >
            {conf?.label || srv}
          </span>
        );
      })}
      {isCompleted && (
        <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-dark dark:bg-emerald-950/70 dark:text-emerald-300">
          ✓
        </span>
      )}
    </div>
  );
}`;

const newTimelineRow = `function TimelineRow({
  item,
  onEditShift,
  onEditService,
}: {
  item: ActivityItem;
  onEditShift?: (shift: ShiftRecord) => void;
  onEditService?: (service: CustomerServiceRecord) => void;
}) {
  if (item.type === "shift") {
    const shift = item as ShiftRecord;
    const shiftConf = SHIFT_CONFIG[shift.shiftType];
    const catConf = SHIFT_CATEGORY_CONFIG[shift.category];
    const isSwapped = shift.status === "swapped_out";
    const canEdit = canEditShift(shift);

    return (
      <div
        className={\`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors \${
          isSwapped
            ? "opacity-50 bg-surface-subtle/50 dark:bg-zinc-800/30"
            : "bg-card-bg dark:bg-zinc-900"
        }\`}
      >
        {/* Color dot for category */}
        <span
          className={\`h-2.5 w-2.5 shrink-0 rounded-full \${
            shift.category === "black"
              ? "bg-shift-black dark:bg-slate-300"
              : shift.category === "red"
                ? "bg-shift-red"
                : "bg-emerald-500"
          }\`}
        />
        {/* Shift label */}
        <span
          className={\`font-bold \${shiftConf?.textBg || "text-text-main dark:text-white"}\`}
        >
          {shiftConf?.shortLabel || shift.shiftType}
        </span>
        <span className="text-text-muted dark:text-zinc-400">
          {shiftConf?.period || "ตลอดวัน"}
        </span>
        {/* Category badge */}
        <span
          className={\`rounded-md px-1.5 py-0.5 text-[10px] font-bold \${catConf?.badge || ""}\`}
        >
          {catConf?.label || shift.category}
        </span>
        {isSwapped && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            แลกแล้ว
          </span>
        )}
        {/* Edit Action if allowed */}
        {canEdit && onEditShift && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditShift(shift);
            }}
            className="ml-auto rounded-lg p-1 text-text-muted hover:bg-sky-50 hover:text-secondary active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-sky-300 transition-all"
            title="แก้ไขเวรนี้"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Service
  const service = item as CustomerServiceRecord;
  const isCompleted = service.status === "completed";
  const canEdit = canEditService(service);

  return (
    <div
      className={\`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs \${
        isCompleted
          ? "bg-primary-light/20 dark:bg-emerald-950/20"
          : "bg-card-bg dark:bg-zinc-900"
      }\`}
    >
      {/* Green dot for service */}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      <span className="font-bold text-primary-dark dark:text-primary-light">
        {service.time} น.
      </span>
      <span className="font-semibold text-text-main dark:text-white truncate">
        {service.customerName}
      </span>
      {/* Service type badges */}
      {service.services.slice(0, 2).map((srv) => {
        const conf = SERVICE_CONFIG[srv];
        return (
          <span
            key={srv}
            className={\`hidden sm:inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold \${conf?.bg || ""}\`}
          >
            {conf?.label || srv}
          </span>
        );
      })}
      {isCompleted && (
        <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-dark dark:bg-emerald-950/70 dark:text-emerald-300">
          ✓
        </span>
      )}
      {/* Edit Action if allowed */}
      {canEdit && onEditService && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditService(service);
          }}
          className="ml-auto rounded-lg p-1 text-text-muted hover:bg-emerald-50 hover:text-primary active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-emerald-300 transition-all"
          title="แก้ไขนัดหมายนี้"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}`;

content = content.replace(oldTimelineRow, newTimelineRow);

// 5. Update ScheduleTodoListView function header
const oldCompHeader = `  onRequestRestore,
  onQuotaChange,
}: ScheduleTodoListViewProps) {`;

const newCompHeader = `  onRequestRestore,
  onQuotaChange,
  onEditShift,
  onEditService,
}: ScheduleTodoListViewProps) {`;

content = content.replace(oldCompHeader, newCompHeader);

// 6. In Card View: pass onEditShift and onEditService to upcoming ActivityCard
const oldCardBlockUpcoming = `                {upcomingActivities.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onDelete={() => onRequestDelete(item)}
                    onToggleStatus={() => {
                      if (item.type === "service") {
                        onToggleServiceStatus(item as CustomerServiceRecord);
                      }
                    }}
                    onSwapShift={(shift) => onInitiateSwap(shift)}
                    onViewTrail={(shift) => onViewTrail(shift)}
                    onUndoSwap={(shift) => onRequestUndoSwap(shift)}
                    onRestoreShift={(shift) => onRequestRestore(shift)}
                  />
                ))}`;

const newCardBlockUpcoming = `                {upcomingActivities.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onDelete={() => onRequestDelete(item)}
                    onToggleStatus={() => {
                      if (item.type === "service") {
                        onToggleServiceStatus(item as CustomerServiceRecord);
                      }
                    }}
                    onSwapShift={(shift) => onInitiateSwap(shift)}
                    onViewTrail={(shift) => onViewTrail(shift)}
                    onUndoSwap={(shift) => onRequestUndoSwap(shift)}
                    onRestoreShift={(shift) => onRequestRestore(shift)}
                    onEditShift={onEditShift}
                    onEditService={onEditService}
                  />
                ))}`;

content = content.replace(oldCardBlockUpcoming, newCardBlockUpcoming);

// 7. In Card View: pass onEditShift and onEditService to past ActivityCard
const oldCardBlockPast = `                {pastActivities.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onDelete={() => onRequestDelete(item)}
                    onToggleStatus={() => {
                      if (item.type === "service") {
                        onToggleServiceStatus(item as CustomerServiceRecord);
                      }
                    }}
                    onSwapShift={(shift) => onInitiateSwap(shift)}
                    onViewTrail={(shift) => onViewTrail(shift)}
                    onUndoSwap={(shift) => onRequestUndoSwap(shift)}
                    onRestoreShift={(shift) => onRequestRestore(shift)}
                  />
                ))}`;

const newCardBlockPast = `                {pastActivities.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onDelete={() => onRequestDelete(item)}
                    onToggleStatus={() => {
                      if (item.type === "service") {
                        onToggleServiceStatus(item as CustomerServiceRecord);
                      }
                    }}
                    onSwapShift={(shift) => onInitiateSwap(shift)}
                    onViewTrail={(shift) => onViewTrail(shift)}
                    onUndoSwap={(shift) => onRequestUndoSwap(shift)}
                    onRestoreShift={(shift) => onRequestRestore(shift)}
                    onEditShift={onEditShift}
                    onEditService={onEditService}
                  />
                ))}`;

content = content.replace(oldCardBlockPast, newCardBlockPast);

// 8. In Timeline View: pass onEditShift and onEditService to TimelineRow
content = content.replaceAll(
  '<TimelineRow key={item.id} item={item} />',
  '<TimelineRow key={item.id} item={item} onEditShift={onEditShift} onEditService={onEditService} />'
);

fs.writeFileSync(listPath, content, 'utf8');
console.log('Successfully updated ScheduleTodoListView.tsx');
