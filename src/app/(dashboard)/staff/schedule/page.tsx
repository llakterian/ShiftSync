import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function StaffSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">View your upcoming shifts across all locations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder for shifts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Friday, Sep 18</span>
              <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">Confirmed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground mt-2">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" /> 17:00 - 23:00 (6h)
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Downtown
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 font-bold bg-muted flex items-center justify-center rounded-sm">B</span> Bartender
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm">Request Swap</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
