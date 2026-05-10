"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StudyFlashcardRead, StudyHighlightRead } from "@/lib/studyApi";
import { cn } from "@/lib/utils";

export function FlashcardsTab({
  cards,
  highlightsById,
  onOpenSource,
  emptyHint,
}: {
  cards: StudyFlashcardRead[];
  highlightsById: Map<string, StudyHighlightRead>;
  onOpenSource: (page: number, highlightId: string | null) => void;
  emptyHint: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  React.useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [cards]);

  const card = cards[idx];
  const hl = card?.highlight_id ? highlightsById.get(card.highlight_id) : undefined;

  if (!cards.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[rgba(120,90,80,0.08)] bg-white px-6 py-16 text-center shadow-[0_12px_40px_rgba(40,30,20,0.06)]">
        <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Card {idx + 1} / {cards.length}
        </span>
        <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-copper/80 to-rose-deep/70 transition-[width] duration-300 ease-out"
            style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "group relative min-h-[280px] w-full rounded-2xl border border-[rgba(120,90,80,0.1)] bg-white text-left shadow-[0_16px_48px_rgba(40,30,20,0.08)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/25",
        )}
        style={{ perspective: "1400px" }}
      >
        <div
          className="relative min-h-[260px] w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className="absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-br from-white via-white to-rose-light/25 p-8"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-copper/90">Question</span>
            <p className="mt-4 flex-1 text-lg font-medium leading-snug tracking-[-0.01em] text-ink">{card.question}</p>
            <span className="mt-6 text-[11px] text-ink-muted">Tap to reveal answer</span>
          </div>
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-copper/15 bg-gradient-to-br from-[#fffdfb] via-white to-copper/[0.06] p-8"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-deep/90">Answer</span>
            <p className="mt-4 flex-1 text-base leading-relaxed text-ink-secondary">{card.answer}</p>
            <span className="mt-6 text-[11px] text-ink-muted">Tap to flip back</span>
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1"
            disabled={idx <= 0}
            onClick={() => {
              setFlipped(false);
              setIdx((i) => Math.max(0, i - 1));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1"
            disabled={idx >= cards.length - 1}
            onClick={() => {
              setFlipped(false);
              setIdx((i) => Math.min(cards.length - 1, i + 1));
            }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {hl ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-2"
            onClick={() => onOpenSource(hl.page, card.highlight_id)}
          >
            <ExternalLink className="h-4 w-4" />
            Open source
          </Button>
        ) : (
          <span className="text-[11px] text-ink-muted">Source link unavailable</span>
        )}
      </div>
    </div>
  );
}
