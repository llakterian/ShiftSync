import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function StaffAvailabilityPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="text-muted-foreground">Manage your recurring hours and request specific dates off.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recurring Weekly Hours</CardTitle>
            <CardDescription>Set the hours you are generally available each week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <span className="font-medium text-sm w-24">{day}</span>
                <div className="flex items-center space-x-2">
                  <Input type="time" className="w-28 text-sm" defaultValue="09:00" />
                  <span>-</span>
                  <Input type="time" className="w-28 text-sm" defaultValue="17:00" />
                </div>
              </div>
            ))}
            <Button className="w-full mt-4">Save Recurring</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date Overrides</CardTitle>
            <CardDescription>Request specific dates off or add extra availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Unavailable (Time Off)</option>
                <option>Available (Custom Hours)</option>
              </select>
            </div>
            <Button className="w-full">Add Override</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
