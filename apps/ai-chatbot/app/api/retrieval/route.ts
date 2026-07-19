import { NextResponse } from 'next/server';
import { searchSnippets } from '@/app/lib/chunks';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query : '';
    const k = typeof body.k === 'number' ? body.k : 5;

    if (!query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const results = await searchSnippets(query, k);
    return NextResponse.json({
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to search snippets';
    console.error('POST /api/search:', error);
    const status =
      message.includes('required') || message.includes('positive') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
