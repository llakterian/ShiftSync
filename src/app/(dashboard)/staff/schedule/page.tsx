import { MyShiftsList } from '@/components/staff/MyShiftsList';

export const dynamic = 'force-dynamic';

export default function StaffSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">View your upcoming shifts across all locations. Updates live.</p>
      </div>
      <MyShiftsList />
    </div>
  );
}
