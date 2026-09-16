import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function StaffSwapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Swaps & Coverage</h1>
        <p className="text-muted-foreground">Pick up available shifts or manage your swap requests.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available to Pick Up</h3>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Saturday, Sep 19 (18:00 - 02:00)</p>
              <p className="text-sm text-slate-500">Downtown • Bartender</p>
              <p className="text-xs text-amber-600 mt-1">Dropped by: Mike T.</p>
            </div>
            <Button>Claim Shift</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">My Requests</h3>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending Approval</Badge>
                <span className="font-medium">Swap Request</span>
              </div>
              <p className="text-sm mt-2">You requested to swap Friday 17:00 with Sarah&rsquo;s Saturday 10:00.</p>
            </div>
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">Cancel</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
