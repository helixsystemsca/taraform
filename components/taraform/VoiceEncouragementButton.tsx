"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { withAppBasePath } from "@/lib/basePath";

const MESSAGES = [
  "You’re doing amazing, Tara. Keep going.",
  "One breath, one concept — you’ve got this.",
  "Your future patients are lucky to have someone who studies like you.",
  "Tara, you’re building something beautiful with every page.",
];

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)] ?? MESSAGES[0]!;
}

async function tryPlayPlaceholderAudio() {
  const candidates = [
    withAppBasePath("/voice/encourage-1.mp3"),
    withAppBasePath("/voice/encourage-2.mp3"),
    withAppBasePath("/voice/encourage-3.mp3"),
  ];
  const src = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0]!;
  const audio = new Audio(src);
  audio.volume = 0.9;
  await audio.play();
}

function speak(text: string) {
  if (typeof window === "undefined") return false;
  const synth = window.speechSynthesis;
  if (!synth) return false;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.94;
  utter.pitch = 1.02;
  utter.volume = 1;
  synth.cancel();
  synth.speak(utter);
  return true;
}

export function VoiceEncouragementButton() {
  const [isPlaying, setIsPlaying] = React.useState(false);

  async function onPress() {
    if (isPlaying) return;
    setIsPlaying(true);
    const text = pickMessage();
    try {
      await tryPlayPlaceholderAudio();
    } catch {
      speak(text);
    } finally {
      window.setTimeout(() => setIsPlaying(false), 650);
    }
  }

  return (
    <Button onClick={() => void onPress()} disabled={isPlaying} variant="default">
      <Volume2 className="h-4 w-4" />
      {isPlaying ? "Playing…" : "Hear encouragement"}
    </Button>
  );
}
