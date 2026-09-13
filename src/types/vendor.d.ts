declare module "pdf-parse" {
  export default function pdfParse(
    data: Buffer,
    options?: Record<string, unknown>
  ): Promise<{
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }>;
}

declare module "word-extractor" {
  interface WordDocument {
    getBody(): string;
    getStyles(): string;
    getHeaders(): string;
    getFooters(): string;
  }
  export default class WordExtractor {
    extract(buffer: Buffer | Uint8Array): Promise<WordDocument>;
  }
}