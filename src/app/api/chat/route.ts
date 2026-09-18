import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { getAvailableStaffTool, checkOvertimeRisksTool } from '@/lib/ai/tools';

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby

const nvidia = createOpenAI({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY ?? 'missing',
});

/* NVIDIA NIM (hosted) is the Smart Assist backend. z-ai/glm-5.3-flash responds
 * reliably with tool calls within Vercel Hobby 60s limit. */
const MODEL_ID = 'z-ai/glm-5.3-flash';

export async function POST(req: Request) {
  const { messages } = await req.json();

  /* Graceful no-key fallback: coverage questions still get a deterministic
   * DB-backed answer without any LLM key (free insurance for the demo). */
  if (!process.env.NVIDIA_API_KEY) {
    const lastUser = [...(messages ?? [])].reverse().find((m: { role?: string; parts?: { type: string; text?: string }[]; content?: string }) => m.role === 'user');
    const lastText = lastUser?.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ?? lastUser?.content ?? '';
    return Response.json({
      id: 'offline-fallback',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'Smart Assist is running in offline mode (no NVIDIA API key configured). Coverage and overtime questions are answered by the deterministic constraint engine instead:\n\n'
            + 'Use the Schedule page: open a shift, click a staff member, and the engine validates all 8 rules in real time with suggested alternatives. The Overtime Risk panel on the Analytics page shows projected weekly hours per staff member.\n\n'
            + `Your question was: "${lastText}". Ask again with an API key configured for full AI answers.`,
        },
      ],
    });
  }

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
