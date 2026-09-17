export type StaffSuggestion = {
  userId: string;
  name: string;
  reason: string;
};

export type ConstraintResult =
  | { ok: true }
  | {
      ok: false;
      rule: string;
      severity: 'block' | 'warn' | 'override';
      message: string;
      suggestions?: StaffSuggestion[];
    };

export type ShiftData = {
  id: string;
  locationId: string;
  requiredSkillId: string;
  startAt: Date;
  endAt: Date;
};
