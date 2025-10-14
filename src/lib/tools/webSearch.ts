import 'server-only';

type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

export async function webSearch(query: string, numResults: number = 5): Promise<WebSearchResult[]> {
  const apiKey = (globalThis as any).process?.env?.SERPER_API_KEY as string | undefined;
  if (!apiKey) {
    return [];
  }
  const resp = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: Math.min(Math.max(numResults, 1), 10) }),
    // 10s timeout via AbortController could be added if needed
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  const organic = Array.isArray(json?.organic) ? json.organic : [];
  return organic.slice(0, numResults).map((item: any) => ({
    title: String(item?.title ?? ''),
    url: String(item?.link ?? ''),
    snippet: item?.snippet ? String(item.snippet) : undefined,
  }));
}


