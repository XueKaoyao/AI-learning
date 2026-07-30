import { prisma } from '@/app/lib/prisma';
import type { Document } from '@/app/generated/prisma/client';
import { Prisma } from '@/app/generated/prisma/client';
import {
  clearAllChunks,
  indexDocumentChunks,
  removeDocumentChunks,
} from '@/app/lib/chunks';

export type CreateDocumentInput = {
  title: string;
  content: string;
};

export class DocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Document not found: ${id}`);
    this.name = 'DocumentNotFoundError';
  }
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

/** 获取所有 Document */
export async function getAllDocuments(): Promise<Document[]> {
  return prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/** 写入单条 Document，并同步切分向量写入 LanceDB */
export async function createDocument(
  input: CreateDocumentInput,
): Promise<Document> {
  assertNonEmpty(input.title, 'title');
  assertNonEmpty(input.content, 'content');

  const document = await prisma.document.create({
    data: {
      title: input.title.trim(),
      content: input.content.trim(),
    },
  });

  await indexDocumentChunks(document);
  return document;
}

/** 批量写入 Document，并同步切分向量写入 LanceDB */
export async function createDocuments(
  inputs: CreateDocumentInput[],
): Promise<Document[]> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('documents must be a non-empty array');
  }

  const documents: Document[] = [];
  for (let index = 0; index < inputs.length; index++) {
    const item = inputs[index];
    assertNonEmpty(item?.title, `documents[${index}].title`);
    assertNonEmpty(item?.content, `documents[${index}].content`);
    documents.push(
      await createDocument({
        title: item.title,
        content: item.content,
      }),
    );
  }
  return documents;
}

/** 按 id 删除 Document，并清理 LanceDB 向量 */
export async function deleteDocument(id: string): Promise<Document> {
  assertNonEmpty(id, 'id');
  const trimmed = id.trim();

  try {
    await removeDocumentChunks(trimmed);
    return await prisma.document.delete({
      where: { id: trimmed },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new DocumentNotFoundError(id);
    }
    throw error;
  }
}

/** 按 id 列表批量删除 */
export async function deleteDocuments(
  ids: string[],
): Promise<{ count: number }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids must be a non-empty array');
  }

  const cleaned = ids.map((id, index) => {
    assertNonEmpty(id, `ids[${index}]`);
    return id.trim();
  });

  for (const id of cleaned) {
    await removeDocumentChunks(id);
  }

  return prisma.document.deleteMany({
    where: { id: { in: cleaned } },
  });
}

/** 清空全部 Document，并清空 LanceDB chunks */
export async function deleteAllDocuments(): Promise<{ count: number }> {
  await clearAllChunks();
  return prisma.document.deleteMany();
}
