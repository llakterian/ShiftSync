import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ShiftData, StaffSuggestion } from './types';
import { evaluateAssignment } from './engine';

export async function getCoverageSuggestions(shift: ShiftData): Promise<StaffSuggestion[]> {
  /* Find all staff users who have the skill and are certified for the location */
  const potentialStaff = await db.select({
    id: schema.users.id,
    name: schema.users.name,
  })
    .from(schema.users)
    .innerJoin(schema.userSkills, eq(schema.users.id, schema.userSkills.userId))
    .innerJoin(schema.userLocations, eq(schema.users.id, schema.userLocations.userId))
    .where(
      and(
        eq(schema.users.role, 'staff'),
        eq(schema.userSkills.skillId, shift.requiredSkillId),
        eq(schema.userLocations.locationId, shift.locationId),
        eq(schema.userLocations.isCertified, true)
      )
    );

  const suggestions: StaffSuggestion[] = [];
  
  for (const staff of potentialStaff) {
    const results = await evaluateAssignment(staff.id, shift, false);
    const blockingFailures = results.filter(r => !r.ok && r.severity === 'block');
    
    if (blockingFailures.length === 0) {
      const warnings = results.filter(r => !r.ok && r.severity === 'warn');
      const reason = warnings.length > 0 
        ? `Available, but note: ${warnings.map(w => !w.ok && w.message).join(' ')}` 
        : 'Available and fully qualified.';
        
      suggestions.push({
        userId: staff.id,
        name: staff.name,
        reason
      });
    }
  }

  return suggestions;
}
