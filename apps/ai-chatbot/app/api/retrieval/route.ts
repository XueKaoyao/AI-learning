import { NextResponse } from 'next/server';
import { searchSnippets } from '@/app/lib/chunks';
import type {
  RetrievalTimings,
  SearchResponse,
} from '@/app/types/RetrievalType';

function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}

export async function POST(req: Request) {
  const tTotal0 = performance.now();

  try {
    const tValidate0 = performance.now();
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query : '';
    const k = typeof body.k === 'number' ? body.k : 5;
    const docId =
      typeof body.docId === 'string' && body.docId !== '无'
        ? body.docId
        : undefined;

    if (!query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    const validateMs = performance.now() - tValidate0;

    const { hits, timings: searchTimings } = await searchSnippets(
      query,
      k,
      docId,
    );

    const timings: RetrievalTimings = {
      validateMs: roundMs(validateMs),
      openTableMs: roundMs(searchTimings.openTableMs),
      searchMs: roundMs(searchTimings.searchMs),
      mapMs: roundMs(searchTimings.mapMs),
      totalMs: roundMs(performance.now() - tTotal0),
    };

    console.info('[retrieval] timings', {
      query: query.trim(),
      k,
      docId: docId ?? null,
      count: hits.length,
      timings,
    });

    const payload: SearchResponse = {
      query: query.trim(),
      count: hits.length,
      results: hits,
      timings,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to search snippets';
    console.error('POST /api/retrieval:', error);
    const status =
      message.includes('required') || message.includes('positive') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
