declare module 'pdf-parse' {
  export interface PDFParseResult {
    text: string
    numpages?: number
    info?: any
    metadata?: any
    version?: string
  }

  const pdfParse: (data: Buffer | Uint8Array, options?: any) => Promise<PDFParseResult>
  export default pdfParse
}

