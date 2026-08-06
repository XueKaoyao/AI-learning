import { EmptyPdfTextError, extractTextFromPdf } from '@/app/lib/pdf';
import { createDocument } from '@/app/lib/documents';
import { NextResponse } from 'next/server';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

/** GET /api/pdf — 调试：读取本地 test.pdf */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withPageMarkers = searchParams.get('pages') === '1';
    const result = await extractTextFromPdf({ withPageMarkers });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof EmptyPdfTextError) {
      return NextResponse.json(
        { error: error.message, numpages: error.numpages },
        { status: 422 },
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to extract PDF text';
    console.error('GET /api/pdf:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/pdf — 上传 PDF，抽文本并写入知识库 Document + LanceDB
 * multipart/form-data: file（必填）, title（可选）
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '请上传 PDF 文件（字段名 file）' },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    const isPdf =
      file.type === 'application/pdf' ||
      file.type === 'application/x-pdf' ||
      name.endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ error: '仅支持 PDF 文件' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: '文件为空' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `文件过大，上限 ${MAX_PDF_BYTES / (1024 * 1024)}MB` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromPdf({ data: buffer });

    const titleField = form.get('title');
    const titleFromForm =
      typeof titleField === 'string' ? titleField.trim() : '';
    const filename = file.name.trim() || 'upload.pdf';
    const title =
      titleFromForm || filename.replace(/\.pdf$/i, '').trim() || '未命名 PDF';

    // 按页入库：Document 存全文；LanceDB 用 pages 按页切块并写入真实 page
    const document = await createDocument({
      title,
      filename,
      content: extracted.text,
      pages: extracted.pages,
    });

    return NextResponse.json(
      {
        document,
        numpages: extracted.numpages,
        chars: extracted.text.length,
        pageCount: extracted.pages.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EmptyPdfTextError) {
      return NextResponse.json(
        { error: error.message, numpages: error.numpages },
        { status: 422 },
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to upload PDF';
    console.error('POST /api/pdf:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
