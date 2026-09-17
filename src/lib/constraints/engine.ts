import { checkDoubleBooking, checkMinRestPeriod, checkSkillMatch, checkLocationCertification, checkAvailability, checkDailyHours, checkWeeklyHours, checkConsecutiveDays } from './checkers';
import { ConstraintResult, ShiftData } from './types';
import { getCoverageSuggestions } from './suggestions';

export async function evaluateAssignment(userId: string, shift: ShiftData, withSuggestions: boolean = true): Promise<ConstraintResult[]> {
  const results = await Promise.all([
    checkDoubleBooking(userId, shift),
    checkMinRestPeriod(userId, shift),
    checkSkillMatch(userId, shift),
    checkLocationCertification(userId, shift),
    checkAvailability(userId, shift),
    checkDailyHours(userId, shift),
    checkWeeklyHours(userId, shift),
    checkConsecutiveDays(userId, shift),
  ]);

  const failures = results.filter(r => !r.ok);

  /* If there are blocking failures and suggestions are requested, find alternative staff.
   * 'override' severity (7th consecutive day) is NOT a block: it needs a documented reason,
   * which the confirm step collects and writes to the audit trail. */
  if (withSuggestions && failures.some(f => !f.ok && f.severity === 'block')) {
    const suggestions = await getCoverageSuggestions(shift);
    // Attach suggestions to the first blocking failure
    const firstBlock = failures.find(f => !f.ok && f.severity === 'block');
    if (firstBlock && !firstBlock.ok) {
      firstBlock.suggestions = suggestions;
    }
  }

  return results;
}
