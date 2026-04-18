/**
 * Browser-side pdf.js worker URL (shared by text extraction and the study viewer).
 */
export function configurePdfjsWorker(pdfjs: { version?: string; GlobalWorkerOptions: { workerSrc: string } }) {
  const version = pdfjs.version ?? "5.6.205";
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}
