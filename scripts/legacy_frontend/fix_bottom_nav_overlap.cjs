const fs = require('fs');

// 1. Fix ScheduleTodoListView.tsx
const todoListPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleTodoListView.tsx';
let todoListContent = fs.readFileSync(todoListPath, 'utf8');

// Add pb-20 to root and a bottom spacer at the end
todoListContent = todoListContent.replace(
  '    <div className="space-y-3.5">',
  '    <div className="space-y-3.5 pb-16 sm:pb-20">'
);

const oldEndTodoList = `              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}`;

const newEndTodoList = `              })}
            </>
          )}
        </div>
      )}

      {/* Bottom Navigation Spacer - ensures all cards and action buttons scroll comfortably above BottomNav & FAB */}
      <div className="h-24 sm:h-28 pb-safe pointer-events-none" aria-hidden="true" />
    </div>
  );
}`;

if (todoListContent.includes(oldEndTodoList)) {
  todoListContent = todoListContent.replace(oldEndTodoList, newEndTodoList);
  console.log('Added bottom spacer to ScheduleTodoListView.tsx');
} else {
  console.error('Could not find oldEndTodoList in ScheduleTodoListView.tsx');
}

fs.writeFileSync(todoListPath, todoListContent, 'utf8');

// 2. Fix ScheduleOverview.tsx
const overviewPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleOverview.tsx';
let overviewContent = fs.readFileSync(overviewPath, 'utf8');

overviewContent = overviewContent.replace(
  ': "max-w-lg mx-auto p-3 sm:p-4 space-y-3.5"',
  ': "max-w-lg mx-auto p-3 sm:p-4 space-y-3.5 pb-20 sm:pb-24"'
);

fs.writeFileSync(overviewPath, overviewContent, 'utf8');
console.log('Updated ScheduleOverview.tsx main padding');

// 3. Fix app/customers/page.tsx
const custPagePath = 'd:/ven-dee/ven-dee-app/app/customers/page.tsx';
let custPageContent = fs.readFileSync(custPagePath, 'utf8');

custPageContent = custPageContent.replace(
  'className="flex min-h-screen flex-col bg-app-bg text-text-main dark:bg-zinc-950 dark:text-zinc-100 pb-20"',
  'className="flex min-h-screen flex-col bg-app-bg text-text-main dark:bg-zinc-950 dark:text-zinc-100 pb-32"'
);

// Add spacer before </main> in customers page
custPageContent = custPageContent.replace(
  '      </main>\n\n      {/* Modal Edit Customer */}',
  '        {/* Bottom Navigation Spacer */}\n        <div className="h-20 sm:h-24 pb-safe pointer-events-none" aria-hidden="true" />\n      </main>\n\n      {/* Modal Edit Customer */}'
);

fs.writeFileSync(custPagePath, custPageContent, 'utf8');
console.log('Updated app/customers/page.tsx padding and spacer');

// 4. Fix app/customers/[id]/page.tsx
const custDetailPath = 'd:/ven-dee/ven-dee-app/app/customers/[id]/page.tsx';
let custDetailContent = fs.readFileSync(custDetailPath, 'utf8');

custDetailContent = custDetailContent.replace(
  'className="flex min-h-screen flex-col bg-app-bg text-text-main dark:bg-zinc-950 dark:text-zinc-100 pb-20"',
  'className="flex min-h-screen flex-col bg-app-bg text-text-main dark:bg-zinc-950 dark:text-zinc-100 pb-32"'
);

custDetailContent = custDetailContent.replace(
  '      </main>\n\n      {/* Modal Edit Customer */}',
  '        {/* Bottom Navigation Spacer */}\n        <div className="h-20 sm:h-24 pb-safe pointer-events-none" aria-hidden="true" />\n      </main>\n\n      {/* Modal Edit Customer */}'
);

fs.writeFileSync(custDetailPath, custDetailContent, 'utf8');
console.log('Updated app/customers/[id]/page.tsx padding and spacer');
