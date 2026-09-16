import React from 'react';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AssignmentsPage() {
  // Fetch all staff data
  const allUsers = await db.select().from(schema.users).orderBy(schema.users.name);
  const allSkills = await db.select().from(schema.skills);
  const allLocations = await db.select().from(schema.locations);
  const userSkillsMap = await db.select().from(schema.userSkills);
  const userLocationsMap = await db.select().from(schema.userLocations);

  // Map data in memory
  const staffMembers = allUsers.map(user => {
    const assignedSkillIds = userSkillsMap.filter(us => us.userId === user.id).map(us => us.skillId);
    const assignedLocationIds = userLocationsMap.filter(ul => ul.userId === user.id).map(ul => ul.locationId);

    return {
      ...user,
      skills: allSkills.filter(s => assignedSkillIds.includes(s.id)),
      locations: allLocations.filter(l => assignedLocationIds.includes(l.id))
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Assignments</h1>
        <p className="text-muted-foreground">Manage your team&apos;s skills, roles, and location assignments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>All registered employees across all locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Primary Locations</TableHead>
                  <TableHead>Certified Skills</TableHead>
                  <TableHead>Timezone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">
                      <div>{staff.name}</div>
                      <div className="text-xs text-slate-500 font-normal">{staff.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={staff.role === 'admin' ? 'destructive' : staff.role === 'manager' ? 'default' : 'secondary'} className="capitalize">
                        {staff.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {staff.locations.length > 0 ? (
                          staff.locations.map(loc => (
                            <Badge key={loc.id} variant="outline" className="text-xs">{loc.name}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {staff.skills.length > 0 ? (
                          staff.skills.map(skill => (
                            <Badge key={skill.id} variant="secondary" className="text-xs capitalize">{skill.name}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {staff.timezonePref}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
