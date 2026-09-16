import React from 'react';
import { OvertimeDashboard } from '@/components/analytics/OvertimeDashboard';
import { FairnessReport } from '@/components/analytics/FairnessReport';
import { OnDutyNow } from '@/components/analytics/OnDutyNow';

export const dynamic = 'force-dynamic';

export default async function ManagerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics &amp; Live Operations</h1>
        <p className="text-sm text-muted-foreground">Monitor schedule health, fairness, and live staff status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <OnDutyNow />
          <OvertimeDashboard />
        </div>
        <div className="space-y-6">
          <FairnessReport />
        </div>
      </div>
    </div>
  );
}
