import 'server-only';
import OpenAI from 'openai';
import { webSearch } from '@/lib/tools/webSearch';

const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY as string | undefined;

export type AgentResult = {
  reasoning?: string;
  answer?: string;
  sources?: Array<{ title: string; url: string }>;
};

export async function executeQueryWithAgent(query: string): Promise<AgentResult> {
  if (!apiKey) {
    return { answer: `OPENAI_API_KEY not configured. Query: ${query}` };
  }
  const client = new OpenAI({ apiKey });

  // Tool: web_search – implemented locally; we surface the results into the context the model sees
  const searchResults = await webSearch(query, 5);
  const sources = searchResults.map(r => ({ title: r.title, url: r.url }));
  const context = searchResults
    .map((r, i) => `Source ${i + 1}: ${r.title}\n${r.url}\n${r.snippet ?? ''}`)
    .join('\n\n');

  // Ask the model to synthesize an answer using the provided sources
  const system = [
    'You are a helpful research agent.',
    'Use the provided sources to answer the user. Include brief citations as [S1], [S2] matching the source order when relevant.',
  ].join(' ');

  const user = `Question: ${query}\n\nAvailable sources:\n\n${context}\n\nWrite a concise answer. It will be used as a push notification to the user. So answer should reflect the push notification format.`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const answer = resp.choices?.[0]?.message?.content?.trim() ?? '';
  return { answer, sources };
}


