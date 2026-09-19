const fs = require('fs');

const oldTimeline = `  const timelineGroups = useMemo(() => {
    const groups = groupByDate(filteredActivities);
    // Sort items within each group by time
    for (const g of groups) {
      g.items.sort((a, b) => getEventTime(a).localeCompare(getEventTime(b)));
    }
    return groups;
  }, [filteredActivities]);`;

const newTimeline = `  // ─── Timeline grouped data: split into upcoming + past like Card view ──
  const upcomingTimelineGroups = useMemo(() => {
    const groups = groupByDate(upcomingActivities);
    for (const g of groups) {
      g.items.sort((a, b) => getEventTime(a).localeCompare(getEventTime(b)));
    }
    return groups;
  }, [upcomingActivities]);

  const pastTimelineGroups = useMemo(() => {
    const groups = groupByDate(pastActivities);
    // Past: sort dates descending (latest first) to match Card view
    groups.reverse();
    for (const g of groups) {
      g.items.sort((a, b) => getEventTime(a).localeCompare(getEventTime(b)));
    }
    return groups;
  }, [pastActivities]);`;

// Also replace the timeline JSX section
const oldTimelineJSX = `        /* ─── TIMELINE VIEW (new) ─── */
        <div className="space-y-0">
          {timelineGroups.map((group) => {
            const m = moment(group.dateStr);
            const isToday = group.dateStr === todayStr;
            const isPast = m.isBefore(moment(), "day");

            return (
              <div
                key={group.dateStr}
                className={\`flex gap-3 border-b border-surface-subtle/70 last:border-b-0 dark:border-zinc-800/70 \${
                  isPast ? "opacity-60" : ""
                }\`}
              >
                {/* Left Column: Date */}
                <div
                  className={\`flex flex-col items-center justify-start pt-3 pb-3 w-16 shrink-0 \${
                    isToday ? "relative" : ""
                  }\`}
                >
                  {isToday && (
                    <div className="absolute inset-0 rounded-xl bg-secondary/10 dark:bg-secondary/20" />
                  )}
                  <span
                    className={\`relative z-10 text-lg font-extrabold leading-none \${
                      isToday
                        ? "text-secondary dark:text-sky-400"
                        : "text-text-main dark:text-zinc-200"
                    }\`}
                  >
                    {m.format("D")}
                  </span>
                  <span
                    className={\`relative z-10 text-[10px] font-semibold mt-0.5 \${
                      isToday
                        ? "text-secondary dark:text-sky-400"
                        : "text-text-muted dark:text-zinc-400"
                    }\`}
                  >
                    {m.locale("th").format("ddd")}
                  </span>
                  <span
                    className={\`relative z-10 text-[9px] mt-0.5 \${
                      isToday
                        ? "text-secondary/80 dark:text-sky-400/80"
                        : "text-text-muted/60 dark:text-zinc-500"
                    }\`}
                  >
                    {m.locale("th").format("MMM")}
                  </span>
                  {isToday && (
                    <span className="relative z-10 mt-1 rounded-sm bg-secondary px-1 py-px text-[8px] font-bold text-white leading-none">
                      วันนี้
                    </span>
                  )}
                </div>

                {/* Right Column: Events */}
                <div className="flex-1 py-2.5 space-y-1.5 min-w-0">
                  {group.items.map((item) => (
                    <TimelineRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>`;

const newTimelineJSX = `        /* ─── TIMELINE VIEW (new) ─── */
        <div className="space-y-0">
          {/* SECTION 1: Upcoming & Today */}
          {upcomingTimelineGroups.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-text-main dark:text-white uppercase tracking-wider">
                  วันนี้และเร็วๆ นี้
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {upcomingActivities.length} รายการ
                </span>
              </div>
              {upcomingTimelineGroups.map((group) => {
                const m = moment(group.dateStr);
                const isToday = group.dateStr === todayStr;

                return (
                  <div
                    key={group.dateStr}
                    className="flex gap-3 border-b border-surface-subtle/70 last:border-b-0 dark:border-zinc-800/70"
                  >
                    {/* Left Column: Date */}
                    <div
                      className={\`flex flex-col items-center justify-start pt-3 pb-3 w-16 shrink-0 \${
                        isToday ? "relative" : ""
                      }\`}
                    >
                      {isToday && (
                        <div className="absolute inset-0 rounded-xl bg-secondary/10 dark:bg-secondary/20" />
                      )}
                      <span
                        className={\`relative z-10 text-lg font-extrabold leading-none \${
                          isToday
                            ? "text-secondary dark:text-sky-400"
                            : "text-text-main dark:text-zinc-200"
                        }\`}
                      >
                        {m.format("D")}
                      </span>
                      <span
                        className={\`relative z-10 text-[10px] font-semibold mt-0.5 \${
                          isToday
                            ? "text-secondary dark:text-sky-400"
                            : "text-text-muted dark:text-zinc-400"
                        }\`}
                      >
                        {m.locale("th").format("ddd")}
                      </span>
                      <span
                        className={\`relative z-10 text-[9px] mt-0.5 \${
                          isToday
                            ? "text-secondary/80 dark:text-sky-400/80"
                            : "text-text-muted/60 dark:text-zinc-500"
                        }\`}
                      >
                        {m.locale("th").format("MMM")}
                      </span>
                      {isToday && (
                        <span className="relative z-10 mt-1 rounded-sm bg-secondary px-1 py-px text-[8px] font-bold text-white leading-none">
                          วันนี้
                        </span>
                      )}
                    </div>

                    {/* Right Column: Events */}
                    <div className="flex-1 py-2.5 space-y-1.5 min-w-0">
                      {group.items.map((item) => (
                        <TimelineRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* SECTION 2: Past Activities */}
          {pastTimelineGroups.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-3 pb-2 border-t border-surface-subtle dark:border-zinc-800">
                <Clock className="h-3.5 w-3.5 text-text-muted dark:text-zinc-400" />
                <h3 className="text-xs font-bold text-text-muted dark:text-zinc-400 uppercase tracking-wider">
                  กิจกรรมที่ผ่านมาแล้ว
                </h3>
                <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-text-muted dark:bg-zinc-800 dark:text-zinc-400">
                  {pastActivities.length} รายการ
                </span>
              </div>
              {pastTimelineGroups.map((group) => {
                const m = moment(group.dateStr);

                return (
                  <div
                    key={group.dateStr}
                    className="flex gap-3 border-b border-surface-subtle/70 last:border-b-0 dark:border-zinc-800/70 opacity-60"
                  >
                    {/* Left Column: Date */}
                    <div className="flex flex-col items-center justify-start pt-3 pb-3 w-16 shrink-0">
                      <span className="text-lg font-extrabold leading-none text-text-main dark:text-zinc-200">
                        {m.format("D")}
                      </span>
                      <span className="text-[10px] font-semibold mt-0.5 text-text-muted dark:text-zinc-400">
                        {m.locale("th").format("ddd")}
                      </span>
                      <span className="text-[9px] mt-0.5 text-text-muted/60 dark:text-zinc-500">
                        {m.locale("th").format("MMM")}
                      </span>
                    </div>

                    {/* Right Column: Events */}
                    <div className="flex-1 py-2.5 space-y-1.5 min-w-0">
                      {group.items.map((item) => (
                        <TimelineRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>`;

let code = fs.readFileSync('d:/ven-dee/ven-dee-app/app/components/ScheduleTodoListView.tsx', 'utf8');

// Replace timeline data logic
if (code.includes(oldTimeline)) {
  code = code.replace(oldTimeline, newTimeline);
  console.log('✅ Replaced timeline useMemo logic');
} else {
  console.log('⚠️ Could not find old timeline useMemo');
}

// Replace timeline JSX
if (code.includes(oldTimelineJSX)) {
  code = code.replace(oldTimelineJSX, newTimelineJSX);
  console.log('✅ Replaced timeline JSX');
} else {
  console.log('⚠️ Could not find old timeline JSX, trying alternative...');
  // Try to find the JSX without exact whitespace match
  const startMarker = '/* ─── TIMELINE VIEW (new) ─── */';
  const endMarker = '      )}';
  const startIdx = code.indexOf(startMarker);
  if (startIdx !== -1) {
    // Find the closing of the timeline div (</div> before the final closing)
    // We need to find the right spot - look for the </div>\n      ) pattern after the timeline start
    const afterStart = code.substring(startIdx);
    // Find the matching closing pattern
    const timelineSection = afterStart.substring(0, afterStart.indexOf('</div>\n        </div>\n      )') + '</div>\n        </div>'.length);
    if (timelineSection) {
      code = code.replace(startMarker + timelineSection.substring(startMarker.length), newTimelineJSX);
      console.log('✅ Replaced timeline JSX via alternative method');
    }
  }
}

fs.writeFileSync('d:/ven-dee/ven-dee-app/app/components/ScheduleTodoListView.tsx', code, 'utf8');
console.log('✅ File saved');
