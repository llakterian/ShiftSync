import { SwapsBoard } from '@/components/staff/SwapsBoard';

export const dynamic = 'force-dynamic';

export default function StaffSwapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Swaps & Coverage</h1>
        <p className="text-muted-foreground">Pick up available shifts or manage your swap requests. Updates live.</p>
      </div>
      <SwapsBoard />
    </div>
  );
}
