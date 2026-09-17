import { AvailabilityManager } from '@/components/staff/AvailabilityManager';

export const dynamic = 'force-dynamic';

export default function StaffAvailabilityPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="text-muted-foreground">Manage your recurring hours and request specific dates off.</p>
      </div>
      <AvailabilityManager />
    </div>
  );
}
