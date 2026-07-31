import {
  pipeline,
  env,
  type FeatureExtractionPipeline,
} from '@xenova/transformers';

// 禁用本地模型路径，统一从远程拉取/缓存
env.allowLocalModels = false;

// 国内直连 huggingface.co 常超时；可用 HF_ENDPOINT 覆盖（默认镜像）
const remoteHost = (process.env.HF_ENDPOINT ?? 'https://hf-mirror.com').replace(
  /\/?$/,
  '/',
);
env.remoteHost = remoteHost;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // all-MiniLM-L6-v2：轻量、384 维，适合语义检索
    extractorPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        quantized: true, // 量化模型，体积更小
      },
    ).catch((err: unknown) => {
      // 下载失败时清空缓存，便于下次重试
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/** 将文本转为 L2 归一化的 embedding 向量 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: 'mean', // 对 token 做平均池化 → 句向量
    normalize: true, // L2 归一化，后续可用点积当余弦相似度
  });
  return Array.from(output.data as Float32Array);
}

/** 批量生成（同一模型实例复用） */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embed(text));
  }
  return results;
}
