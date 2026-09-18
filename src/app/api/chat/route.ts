import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby

const nvidia = createOpenAI({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY ?? 'missing',
});

/* NVIDIA NIM (hosted) is the Smart Assist backend. z-ai/glm-5.3-flash responds
 * reliably with tool calls within Vercel Hobby 60s limit. */
const MODEL_ID = 'z-ai/glm-5.3-flash';

/* Offline fallback: call the API routes directly instead of executing TS tools.
 * This avoids the ESM/TypeScript runtime issues and uses the real API endpoints. */
async function offlineFallback(lastText: string) {
  const lower = lastText.toLowerCase();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  /* Coverage questions -> /api/swaps (available shifts) or construct from /api/locations + /api/analytics */
  if (/(cover|who can|available|bartender|server|line cook|host)/.test(lower)) {
    try {
      /* Get locations and skills */
      const locRes = await fetch(`${baseUrl}/api/locations`);
      const { locations, skills } = await locRes.json();

      /* Extract location, skill, date from the question */
      const locationMatch = lastText.match(/(downtown|westside|marina|valley)/i);
      const skillMatch = lastText.match(/(bartender|server|line cook|host)/i);
      const dateMatch = lastText.match(/(tonight|today|tomorrow|\d{4}-\d{2}-\d{2})/i);

      const locationName = locationMatch?.[1]?.toLowerCase() ?? 'downtown';
      const skillName = skillMatch?.[1]?.toLowerCase() ?? 'bartender';
      const today = new Date();
      const dateStr = dateMatch?.[1]?.toLowerCase() === 'tonight' || dateMatch?.[1]?.toLowerCase() === 'today'
        ? today.toISOString().slice(0, 10)
        : dateMatch?.[1]?.toLowerCase() === 'tomorrow'
          ? new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
          : dateMatch?.[1] ?? today.toISOString().slice(0, 10);

      const location = locations.find((l: any) => l.name.toLowerCase() === locationName);
      const skill = skills.find((s: any) => s.name.toLowerCase() === skillName);

      if (!location || !skill) {
        return `Location "${locationName}" or skill "${skillName}" not found.`;
      }

      /* Use the swaps API to get available shifts for this location/skill */
      const swapsRes = await fetch(`${baseUrl}/api/swaps`);
      const { available } = await swapsRes.json();
      
      const matching = available.filter((d: any) => 
        d.locationName.toLowerCase() === locationName.toLowerCase() &&
        d.skillName.toLowerCase() === skillName.toLowerCase()
      );

      if (matching.length > 0) {
        const lines = matching.map((d: any) =>
          `- ${d.droppedByName} dropped ${d.startAt} to ${d.endAt} (${d.locationName})`
        ).join('\n');
        return `**Available ${skillName} shifts at ${location.name} (from drop board):**\n\n${lines}\n\nClick "Claim Shift" on the Swaps page to pick one up.`;
      }

      /* Fallback: check analytics for staff hours and suggest qualified staff */
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekStr = weekStart.toISOString().slice(0, 10);
      
      const analyticsRes = await fetch(`${baseUrl}/api/analytics?week=${weekStr}`);
      const { staff } = await analyticsRes.json();
      
      // This is a simplified version - in real tool we'd query certifications/availability
      return `No dropped ${skillName} shifts available at ${location.name} right now.\n\n` +
        `**Try:** Check the Swaps page for available shifts, or ask your manager to post one.`;
    } catch (e) {
      return `Error checking availability: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }

  /* Overtime questions -> /api/analytics */
  if (/(overtime|hours|risk|approaching)/.test(lower)) {
    try {
      const locationMatch = lastText.match(/(downtown|westside|marina|valley)/i);
      const location = locationMatch?.[1]?.toLowerCase();
      
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      const weekStr = weekStart.toISOString().slice(0, 10);

      const analyticsRes = await fetch(`${baseUrl}/api/analytics?week=${weekStr}`);
      const { weekStart: ws, staff } = await analyticsRes.json();

      const filtered = location
        ? staff.filter((s: any) => s.locations?.toLowerCase().includes(location))
        : staff;

      const risks = filtered
        .filter((s: any) => s.projectedHours > 35)
        .sort((a: any, b: any) => b.projectedHours - a.projectedHours);

      if (risks.length > 0) {
        const lines = risks.map((r: any) =>
          `- **${r.name}**: ${r.projectedHours}h (${r.projectedHours > 40 ? 'Critical' : r.projectedHours > 35 ? 'High' : 'Moderate'}) — ${r.locations}`
        ).join('\n');
        return `**Overtime Risk (week of ${ws}, ${location ? location.charAt(0).toUpperCase() + location.slice(1) : 'All locations'}):**\n\n${lines}`;
      }
      return `No staff at overtime risk this week.`;
    } catch (e) {
      return `Error checking overtime: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }

  return `Smart Assist (offline mode):\n\n`
    + `**Coverage:** "Who can cover [skill] at [location] [date]?"\n`
    + `**Overtime:** "Who's approaching overtime [at location]?"\n\n`
    + `Answers come from the real API endpoints (instant, no LLM key).`;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  /* Graceful no-key fallback: execute deterministic logic via API calls. */
  if (!process.env.NVIDIA_API_KEY) {
    const lastUser = [...(messages ?? [])].reverse().find((m: { role?: string; parts?: { type: string; text?: string }[]; content?: string }) => m.role === 'user');
    const lastText = lastUser?.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ?? lastUser?.content ?? '';

    const answer = await offlineFallback(lastText);

    return Response.json({
      id: 'offline-fallback',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: `Smart Assist (offline mode) — deterministic engine answer:\n\n${answer}`,
        },
      ],
    });
  }

  const nvidia = createOpenAI({
    name: 'nvidia',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY ?? 'missing',
  });

  /* NVIDIA NIM (hosted) is the Smart Assist backend. z-ai/glm-5.3-flash responds
   * reliably with tool calls within Vercel Hobby 60s limit. */
  const MODEL_ID = 'z-ai/glm-5.3-flash';

  const { streamText, convertToModelMessages, stepCountIs } = await import('ai');
  const { getAvailableStaffTool, checkOvertimeRisksTool } = await import('@/lib/ai/tools');

  const result = streamText({
    model: nvidia.chat(MODEL_ID),
    system: `You are the Coastal Eats Shift Manager Smart Assist.
You help managers schedule staff, find coverage for call-outs, and avoid overtime across four locations (Downtown and Westside in Eastern time, Marina and Valley in Pacific time).
ALWAYS call the getAvailableStaff tool before answering any coverage question, and checkOvertimeRisks before answering overtime questions. Never ask clarifying questions: the tools accept a location name directly, so call them with what the user gave you.
Report only what the tools return. The tool data is real; do not invent staff members, hours, or availability.`,
    messages: await convertToModelMessages(messages),
    tools: {
      getAvailableStaff: getAvailableStaffTool,
      checkOvertimeRisks: checkOvertimeRisksTool,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
