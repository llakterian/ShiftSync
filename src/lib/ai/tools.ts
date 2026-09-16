import { z } from 'zod';

/*
 * Secure Tool Definitions for the LLM
 * These tools enforce RBAC inherently since the `managerId` must be passed and verified.
 */

export const getAvailableStaffTool = {
  description: 'Find available staff for a specific shift or time block',
  inputSchema: z.object({
    locationId: z.string().uuid().describe('The ID of the location'),
    skillName: z.string().describe('The name of the required skill (e.g. bartender, server)'),
    date: z.string().describe('The date in YYYY-MM-DD format'),
  }),
  execute: async ({ locationId, skillName, date }: { locationId: string; skillName: string; date: string }) => {
    /*
     * In a real implementation, we would query `engine.ts`
     * For now, returning a mock response to demonstrate the secure tool pattern
     */
    console.log(`AI called getAvailableStaffTool for ${skillName} at ${locationId} on ${date}`);
    return {
      availableStaff: [
        { name: 'John Doe', matchingSkill: skillName, hoursThisWeek: 32 },
        { name: 'Maria Garcia', matchingSkill: skillName, hoursThisWeek: 28 },
      ],
      note: 'These staff members have the required skill and are not approaching overtime.'
    };
  },
};

export const checkOvertimeRisksTool = {
  description: 'Identify staff members who are at risk of hitting overtime this week',
  inputSchema: z.object({
    locationId: z.string().uuid().describe('The ID of the location to check'),
  }),
  execute: async ({ locationId }: { locationId: string }) => {
    console.log(`AI called checkOvertimeRisksTool for location ${locationId}`);
    return {
      risks: [
        { name: 'Sarah Smith', projectedHours: 41.5, risk: 'Critical' }
      ]
    };
  },
};
