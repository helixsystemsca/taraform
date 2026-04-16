/**
 * Extract plain text from a PDF (browser / client). Uses dynamic import so `pdfjs-dist`
 * is not loaded on the server when unused.
 */
export async function extractPdfTextFromArrayBuffer(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const version = (pdfjs as { version?: string }).version ?? "5.6.205";
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;

  const parts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => {
        if (item && typeof item === "object" && "str" in item && typeof (item as { str: unknown }).str === "string") {
          return (item as { str: string }).str;
        }
        return "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
  }

  return parts.join("\n\n").trim();
}
