import path from 'node:path';
import * as lancedb from '@lancedb/lancedb';
import {
  EmbeddingFunction,
  getRegistry,
  LanceSchema,
  register,
} from '@lancedb/lancedb/embedding';
import {
  pipeline,
  env as xenovaEnv,
  type FeatureExtractionPipeline,
} from '@xenova/transformers';
import { Float32, Int32, Utf8, type Float } from 'apache-arrow';
import type { Connection, Table } from '@lancedb/lancedb';

const DB_PATH = path.join(process.cwd(), '.lancedb');
export const CHUNKS_TABLE = 'chunks';
const EMBEDDING_ALIAS = 'local-minilm';

/** 写入行：不传 vector，由 LanceDB Embedding Function 根据 snippet 自动生成 */
export type LanceChunkRow = {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  index: number;
};

let dbPromise: Promise<Connection> | null = null;
let schemaPromise: Promise<ReturnType<typeof LanceSchema>> | null = null;

// 国内直连 huggingface.co 常超时；可用 HF_ENDPOINT 覆盖（默认镜像）
xenovaEnv.allowLocalModels = false;
xenovaEnv.remoteHost = (
  process.env.HF_ENDPOINT ?? 'https://hf-mirror.com'
).replace(/\/?$/, '/');

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true },
    ).catch((err: unknown) => {
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * LanceDB Embedding Function：表写入 / search(文本) 时自动生成向量。
 *
 * 未使用内置 `huggingface` provider（@huggingface/transformers + onnxruntime-node
 * 在部分 Windows 环境无法加载）；底层仍用已验证可用的 @xenova/transformers。
 */
class LocalMiniLMEmbeddingFunction extends EmbeddingFunction {
  ndims(): number {
    return 384;
  }

  embeddingDataType(): Float {
    return new Float32();
  }

  async computeSourceEmbeddings(data: string[]): Promise<number[][]> {
    const extractor = await getExtractor();
    const out: number[][] = [];
    for (const text of data) {
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      out.push(Array.from(output.data as Float32Array));
    }
    return out;
  }

  async computeQueryEmbeddings(data: string): Promise<number[]> {
    return (await this.computeSourceEmbeddings([data]))[0];
  }
}

// HMR / 热重载会再次执行模块顶层代码；全局 registry 已有同名 alias 时跳过
if (!getRegistry().get(EMBEDDING_ALIAS)) {
  register(EMBEDDING_ALIAS)(LocalMiniLMEmbeddingFunction);
}

async function getDb(): Promise<Connection> {
  if (!dbPromise) {
    dbPromise = lancedb.connect(DB_PATH);
  }
  return dbPromise;
}

async function getChunksSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const func = await getRegistry().get(EMBEDDING_ALIAS)!.create();
      return LanceSchema({
        id: new Utf8(),
        documentId: new Utf8(),
        title: new Utf8(),
        snippet: func.sourceField(new Utf8()),
        index: new Int32(),
        vector: func.vectorField(),
      });
    })().catch((err: unknown) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function tableHasEmbeddingFunctions(table: Table): Promise<boolean> {
  const schema = await table.schema();
  return Boolean(schema.metadata?.get('embedding_functions'));
}

/**
 * 打开已有 chunks 表。
 * 旧表（手动写入 vector、无 Embedding Function 元数据）会被丢弃，避免检索/写入失败。
 */
export async function openChunkTable(): Promise<Table | null> {
  const db = await getDb();
  const names = await db.tableNames();
  if (!names.includes(CHUNKS_TABLE)) {
    return null;
  }

  const table = await db.openTable(CHUNKS_TABLE);
  if (!(await tableHasEmbeddingFunctions(table))) {
    await db.dropTable(CHUNKS_TABLE);
    return null;
  }
  return table;
}

/** 写入行：表不存在则按 Embedding Schema 创建；存在则 add（自动 embed snippet） */
export async function upsertChunkRows(rows: LanceChunkRow[]): Promise<void> {
  if (rows.length === 0) return;

  const db = await getDb();
  let table = await openChunkTable();

  if (!table) {
    const schema = await getChunksSchema();
    table = await db.createTable(CHUNKS_TABLE, rows, { schema });
    return;
  }

  await table.add(rows);
}

/** 按 documentId 删除向量行 */
export async function deleteChunksByDocumentId(
  documentId: string,
): Promise<void> {
  const table = await openChunkTable();
  if (!table) return;
  const safeId = documentId.replace(/'/g, "''");
  await table.delete(`documentId = '${safeId}'`);
}

/** 按多个 documentId 删除 */
export async function deleteChunksByDocumentIds(
  documentIds: string[],
): Promise<void> {
  for (const id of documentIds) {
    await deleteChunksByDocumentId(id);
  }
}

/** 清空整个 chunks 表 */
export async function dropChunksTable(): Promise<void> {
  const db = await getDb();
  const names = await db.tableNames();
  if (!names.includes(CHUNKS_TABLE)) return;
  await db.dropTable(CHUNKS_TABLE);
}
