import React from 'react';
import { WeekGrid } from '@/components/schedule/WeekGrid';
import { ScheduleActions } from '@/components/schedule/ScheduleActions';

export default async function ManagerSchedulePage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Schedule</h1>
          <p className="text-muted-foreground">
            Manage shifts and assignments for your locations.
          </p>
        </div>
        <ScheduleActions />
      </div>
      
      <div className="flex-1 min-h-[500px] border rounded-lg bg-white overflow-hidden">
        <WeekGrid />
      </div>
    </div>
  );
}
