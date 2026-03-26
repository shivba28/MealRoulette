/**
 * 3-reel slot machine with GSAP animation. Fires onComplete when all reels have snapped.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';

const EMOJI_POOL = [
  '🍗', '🥗', '🍜', '🥩', '🍳', '🥘', '🌮', '🍱', '🥙', '🍝',
  '🥞', '🍲', '🌯', '🥚', '🍛', '🦐', '🐟', '🥦', '🫕', '🧆',
];

const REEL_COUNT = 3;
const STAGGER_MS = 80;
const SNAP_DURATIONS = [1.8, 2.3, 2.8];
const SHRINK_DURATION = 0.4;
const ITEM_HEIGHT = 96;
const TOTAL_STRIP_ITEMS = EMOJI_POOL.length * 5;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface SlotMachineProps {
  /** When false, reels are visible but static; when true, spin animation runs. */
  runSpin?: boolean;
  apiReady?: boolean;
  onComplete: () => void;
}

export function SlotMachine({ runSpin = false, apiReady = false, onComplete }: SlotMachineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [snapComplete, setSnapComplete] = useState(false);
  const [emojis] = useState(() => shuffle(EMOJI_POOL));

  /* Idle: show reels with random static positions (one emoji visible per reel). */
  useEffect(() => {
    if (runSpin) return;
    const id = requestAnimationFrame(() => {
      const strips = stripRefs.current;
      if (strips.length < REEL_COUNT || strips.some((s) => !s)) return;
      strips.forEach((strip) => {
        if (!strip) return;
        const randomOffset = Math.floor(Math.random() * EMOJI_POOL.length) * ITEM_HEIGHT;
        gsap.set(strip, { y: -randomOffset });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [runSpin, emojis]);

  /* Spinning: run the full spin animation. */
  useEffect(() => {
    if (!runSpin) return;
    const run = () => {
      const strips = stripRefs.current;
      if (strips.length < REEL_COUNT || strips.some((s) => !s)) return;

      const reelHeight = ITEM_HEIGHT * 3;
      const stripHeight = TOTAL_STRIP_ITEMS * ITEM_HEIGHT;

      const tl = gsap.timeline();

      SNAP_DURATIONS.forEach((duration, i) => {
        const strip = strips[i];
        if (!strip) return;
        const startY = -stripHeight + reelHeight;
        const endY = -Math.floor(Math.random() * EMOJI_POOL.length) * ITEM_HEIGHT - ITEM_HEIGHT;
        gsap.set(strip, { y: startY });
        tl.to(
          strip,
          {
            y: endY,
            duration,
            ease: 'back.out(2)',
          },
          i * (STAGGER_MS / 1000)
        );
      });

      tl.add(() => setSnapComplete(true));
      tl.add(() => {
        confetti({
          colors: ['#d97706', '#fef3c7', '#92400e', '#ffffff'],
          origin: { y: 0.6 },
          spread: 70,
          particleCount: 80,
        });
      });
    };
    const id = requestAnimationFrame(() => run());
    return () => cancelAnimationFrame(id);
  }, [runSpin, emojis]);

  useEffect(() => {
    if (!snapComplete || !apiReady) return;
    const container = containerRef.current;
    if (!container) return;
    gsap.to(container, {
      height: 0,
      opacity: 0,
      duration: SHRINK_DURATION,
      overflow: 'hidden',
      onComplete: () => onComplete(),
    });
  }, [snapComplete, apiReady, onComplete]);

  return (
    <div
      ref={containerRef}
      className={`slot-machine ${snapComplete && !apiReady ? 'slot-machine--waiting' : ''}`}
      data-testid="slot-machine"
    >
      <div className="slot-machine__reels">
        {Array.from({ length: REEL_COUNT }, (_, i) => (
          <div
            key={i}
            className="slot-machine__reel"
            ref={(el) => { reelRefs.current[i] = el; }}
          >
            <div className="slot-machine__reel-viewport">
              <div
                className="slot-machine__strip"
                ref={(el) => { stripRefs.current[i] = el; }}
              >
                {Array.from({ length: TOTAL_STRIP_ITEMS }, (_, j) => (
                  <div key={j} className="slot-machine__cell">
                    {emojis[j % emojis.length]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
