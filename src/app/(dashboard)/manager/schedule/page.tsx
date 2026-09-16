import React from 'react';
import { WeekGrid } from '@/components/schedule/WeekGrid';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
        <div className="flex items-center space-x-2">
          <Button variant="outline">Publish Week</Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Shift
          </Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-[500px] border rounded-lg bg-white overflow-hidden">
        <WeekGrid />
      </div>
    </div>
  );
}
