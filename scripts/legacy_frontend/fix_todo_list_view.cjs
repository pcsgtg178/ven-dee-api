const fs = require('fs');

const listPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleTodoListView.tsx';
let content = fs.readFileSync(listPath, 'utf8');

// 1. Fix TimelineRow declaration
content = content.replace(
  'function TimelineRow({ item }: { item: ActivityItem }) {',
  `function TimelineRow({
  item,
  onEditShift,
  onEditService,
}: {
  item: ActivityItem;
  onEditShift?: (shift: ShiftRecord) => void;
  onEditService?: (service: CustomerServiceRecord) => void;
}) {`
);

// In TimelineRow for Shift, add Pencil button before return's closing </div>
const oldShiftRowReturn = `        {isSwapped && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            แลกแล้ว
          </span>
        )}
      </div>
    );
  }

  // Service`;

const newShiftRowReturn = `        {isSwapped && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            แลกแล้ว
          </span>
        )}
        {canEditShift(shift) && onEditShift && (
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

  // Service`;

content = content.replace(oldShiftRowReturn, newShiftRowReturn);

// In TimelineRow for Service, add Pencil button before return's closing </div>
const oldServiceRowReturn = `      {isCompleted && (
        <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-dark dark:bg-emerald-950/70 dark:text-emerald-300">
          ✓
        </span>
      )}
    </div>
  );
}`;

const newServiceRowReturn = `      {isCompleted && (
        <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-dark dark:bg-emerald-950/70 dark:text-emerald-300">
          ✓
        </span>
      )}
      {canEditService(service) && onEditService && (
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

content = content.replace(oldServiceRowReturn, newServiceRowReturn);

// 2. Fix ScheduleTodoListView header
const oldHeader = `  quotaStats,
  currentMonthKey,
  onQuotaChange,
}: ScheduleTodoListViewProps) {`;

const newHeader = `  quotaStats,
  currentMonthKey,
  onQuotaChange,
  onEditShift,
  onEditService,
}: ScheduleTodoListViewProps) {`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(listPath, content, 'utf8');
console.log('Fixed ScheduleTodoListView.tsx');
