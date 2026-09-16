'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function FairnessReport() {
  const staffFairness = [
    { name: 'John Doe', totalHours: 120, premiumShifts: 4, fairnessScore: 92 },
    { name: 'Sarah Smith', totalHours: 115, premiumShifts: 5, fairnessScore: 95 },
    { name: 'Maria Garcia', totalHours: 130, premiumShifts: 1, fairnessScore: 68 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Schedule Fairness</CardTitle>
        <CardDescription>Distribution of premium shifts (Fri/Sat evening) over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Premium Shifts</TableHead>
              <TableHead>Fairness Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffFairness.map((staff) => (
              <TableRow key={staff.name}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.totalHours}h</TableCell>
                <TableCell>{staff.premiumShifts}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${staff.fairnessScore < 75 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {staff.fairnessScore}%
                    </span>
                    {staff.fairnessScore < 75 && <span className="text-xs text-red-500">(Under-represented)</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
