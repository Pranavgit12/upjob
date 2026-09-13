declare module "pdf-parse/lib/pdf-parse.js" {
  export interface PdfParseOptions {
    version?: string;
  }
  export interface PdfParseResult {
    text: string;
    numpages?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }
  const pdfParse: (data: Buffer, options?: PdfParseOptions) => Promise<PdfParseResult>;
  export default pdfParse;
}