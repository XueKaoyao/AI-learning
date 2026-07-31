import { NextResponse } from 'next/server';
import {
  createDocument,
  createDocuments,
  deleteAllDocuments,
  deleteDocument,
  deleteDocuments,
  DocumentNotFoundError,
  getAllDocuments,
  type CreateDocumentInput,
} from '@/app/lib/documents';

type PostBody = CreateDocumentInput | { documents: CreateDocumentInput[] };

type DeleteBody = { id: string } | { ids: string[] } | { all: true };

function isSingleDocument(body: PostBody): body is CreateDocumentInput {
  return 'title' in body && 'content' in body && !('documents' in body);
}

function errorStatus(error: unknown): number {
  if (error instanceof DocumentNotFoundError) return 404;
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes('required') ||
      msg.includes('non-empty') ||
      msg.includes('must be')
    ) {
      return 400;
    }
  }
  return 500;
}

export async function GET() {
  const documents = await getAllDocuments();
  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;

    if (isSingleDocument(body)) {
      const document = await createDocument(body);
      return NextResponse.json({ document }, { status: 201 });
    }

    if ('documents' in body && Array.isArray(body.documents)) {
      const documents = await createDocuments(body.documents);
      return NextResponse.json(
        { documents, count: documents.length },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        error:
          'Body must be { title, content } or { documents: [{ title, content }, ...] }',
      },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create document';
    console.error('POST /api/documents:', error);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(error) },
    );
  }
}

/**
 * 删除 Document：
 * - { "id": "..." }           删一条
 * - { "ids": ["...", "..."] } 批量删
 * - { "all": true }           清空表
 */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as DeleteBody;

    if ('all' in body && body.all === true) {
      const result = await deleteAllDocuments();
      return NextResponse.json({ deleted: result.count, all: true });
    }

    if ('id' in body && typeof body.id === 'string') {
      const document = await deleteDocument(body.id);
      return NextResponse.json({ document, deleted: 1 });
    }

    if ('ids' in body && Array.isArray(body.ids)) {
      const result = await deleteDocuments(body.ids);
      return NextResponse.json({ deleted: result.count, ids: body.ids });
    }

    return NextResponse.json(
      {
        error: 'Body must be { id }, { ids: string[] }, or { all: true }',
      },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete document';
    console.error('DELETE /api/documents:', error);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(error) },
    );
  }
}
