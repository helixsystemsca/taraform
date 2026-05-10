"""
Extract text from PMBOK.pdf into one UTF-8 .txt file per page.
"""
from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader


def _normalize_whitespace(text: str) -> str:
    """Strip line ends, collapse runs of blank lines, trim the whole block."""
    lines = [ln.strip() for ln in text.splitlines()]
    collapsed: list[str] = []
    prev_blank = False
    for ln in lines:
        if not ln:
            if not prev_blank:
                collapsed.append("")
            prev_blank = True
        else:
            collapsed.append(ln)
            prev_blank = False
    return "\n".join(collapsed).strip()


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    pm_root = script_dir.parent
    pdf_path = pm_root / "data" / "PDF" / "PMBOK.pdf"
    out_dir = pm_root / "data" / "PDF" / "raw_pages"

    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    out_dir.mkdir(parents=True, exist_ok=True)

    reader = PdfReader(str(pdf_path))
    total = len(reader.pages)
    pad = max(3, len(str(total)))
    written = 0

    for idx in range(total):
        page_num = idx + 1
        raw = reader.pages[idx].extract_text()
        if raw is None:
            raw = ""
        content = _normalize_whitespace(raw)
        if not content:
            print(f"Extracted page {page_num}/{total}")
            continue

        name = f"page_{page_num:0{pad}d}.txt"
        out_path = out_dir / name
        out_path.write_text(content, encoding="utf-8")
        written += 1
        print(f"Extracted page {page_num}/{total}")

    print(f"Done. Pages in PDF: {total}, non-empty pages written: {written}")


if __name__ == "__main__":
    main()
