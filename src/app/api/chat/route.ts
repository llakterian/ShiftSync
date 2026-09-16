import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getAvailableStaffTool, checkOvertimeRisksTool } from '@/lib/ai/tools';

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: `You are the Coastal Eats Shift Manager Smart Assist.
    You help Coastal Eats restaurant managers efficiently schedule staff, find coverage for call-outs,
    and avoid overtime violations across all four locations.
    Always use the provided tools to fetch real data before answering.
    If you do not know the location ID, ask the user to clarify which location they are asking about.`,
    messages,
    tools: {
      getAvailableStaff: getAvailableStaffTool,
      checkOvertimeRisks: checkOvertimeRisksTool,
    },
  });

  return result.toAIStreamResponse();
}
