import { format, addDays, startOfWeek } from 'date-fns';

export function WeekGrid() {
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b bg-slate-50/50 flex-shrink-0">
        {days.map((day, i) => (
          <div key={i} className="py-3 px-4 border-r last:border-r-0 text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              {format(day, 'EEE')}
            </div>
            <div className="text-lg font-medium text-slate-900 mt-1">
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, i) => (
          <div key={i} className="border-r last:border-r-0 p-2 bg-slate-50 min-h-[200px]">
            {/* Shifts will go here */}
            <div className="text-sm text-slate-400 text-center mt-4">
              No shifts scheduled
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
