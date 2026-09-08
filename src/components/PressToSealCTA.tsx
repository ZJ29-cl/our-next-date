import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Loader2, Sparkles } from 'lucide-react';
import { LiquidWaxSeal } from './LiquidWaxSeal';
import { sound } from '../lib/sound';
import { prefersReducedMotion } from '../lib/motion';

interface PressToSealCTAProps {
  isSubmitting: boolean;
  onComplete: () => void;
  disabled?: boolean;
  label?: string;
}

interface SealParticle {
  id: number;
  type: 'heart' | 'ember' | 'sparkle';
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
  delay: number;
}

const HOLD_DURATION_MS = 1100; // ~1.1s for responsive, natural tactile feel

export const PressToSealCTA: React.FC<PressToSealCTAProps> = ({
  isSubmitting,
  onComplete,
  disabled = false,
  label = 'Seal this date for us ♡',
}) => {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isPressing, setIsPressing] = useState(false);
  const [isSealed, setIsSealed] = useState(false);
  const [particles, setParticles] = useState<SealParticle[]>([]);
  const [showHint, setShowHint] = useState(false);

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVibrateStep = useRef<number>(0);
  const hasTriggeredComplete = useRef<boolean>(false);

  // Generate celebratory particle burst of hearts & golden embers
  const triggerCelebrationBurst = useCallback(() => {
    const count = 28;
    const newParticles: SealParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.3;
      const distance = 80 + Math.random() * 140;
      const type: 'heart' | 'ember' | 'sparkle' =
        i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'ember' : 'sparkle';

      const colors = ['#C67B5C', '#E8C4B8', '#D48A69', '#E5A684', '#2B2420'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      newParticles.push({
        id: Date.now() + i,
        type,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20, // Slight upward bias
        scale: 0.7 + Math.random() * 0.6,
        rotate: (Math.random() - 0.5) * 60,
        color,
        delay: Math.random() * 0.1,
      });
    }

    setParticles(newParticles);
  }, []);

  const handleSealComplete = useCallback(() => {
    if (hasTriggeredComplete.current || isSealed || isSubmitting) return;
    hasTriggeredComplete.current = true;
    setIsSealed(true);
    setProgress(1);

    // Audio payoff: Physical wax seal thud + resonant chord
    sound.playSealStampSound();

    // Haptic triumph
    if (!prefersReducedMotion() && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 40, 75]);
      } catch {
        // Safe fallback
      }
    }

    if (!prefersReducedMotion()) {
      triggerCelebrationBurst();
    }

    // Allow user to witness the tactile wax seal stamping into place
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [onComplete, triggerCelebrationBurst, isSealed, isSubmitting]);

  const stepProgress = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const nextProgress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgress(nextProgress);

      // Real-time audio pitch & harmonic tension tracking
      sound.updateHoldProgress(nextProgress);

      // Micro-haptics at quarterly intervals
      const stepIndex = Math.floor(nextProgress * 4);
      if (stepIndex > lastVibrateStep.current) {
        lastVibrateStep.current = stepIndex;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore
          }
        }
      }

      if (nextProgress >= 1) {
        handleSealComplete();
      } else {
        requestRef.current = requestAnimationFrame(stepProgress);
      }
    },
    [handleSealComplete]
  );

  const startHold = () => {
    if (disabled || isSubmitting || isSealed || hasTriggeredComplete.current) return;
    setIsPressing(true);
    setShowHint(false);
    startTimeRef.current = null;
    lastVibrateStep.current = 0;
    sound.startHoldTone();
    requestRef.current = requestAnimationFrame(stepProgress);
  };

  const endHold = () => {
    if (isSealed) return;
    sound.stopHoldTone();
    setIsPressing(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    // If released before 100%, show gentle guidance
    if (progress > 0.05 && progress < 1) {
      setShowHint(true);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setShowHint(false), 2200);
    }

    // Smooth reset
    setProgress(0);
    startTimeRef.current = null;
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      if (!isPressing && !disabled && !isSubmitting && !isSealed && !hasTriggeredComplete.current) {
        startHold();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      endHold();
    }
  };

  // Assistive technology activation (e.g. screen reader virtual click / enter)
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isSubmitting || isSealed || hasTriggeredComplete.current) return;
    // Detail === 0 indicates keyboard / assistive technology activation without pointer hold
    if (e.detail === 0) {
      e.preventDefault();
      handleSealComplete();
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  // Compute SVG circular progress ring
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <footer
      id="sticky-submit-bar"
      style={{
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#FAF6F0]/90 backdrop-blur-xl border-t border-white/80 shadow-[0_-4px_24px_rgba(43,36,32,0.06)] pt-2.5 sm:pt-3 flex flex-col items-center justify-center px-3.5 sm:px-5 transition-all"
    >
      <div className="w-full max-w-md flex flex-col items-center relative">
        {/* Celebration Particle Explosion Burst */}
        <AnimatePresence>
          {particles.length > 0 && (
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-50 overflow-visible"
              aria-hidden="true"
            >
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 0.2,
                    rotate: 0,
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: [0, p.x * 0.7, p.x],
                    y: [0, p.y * 0.7, p.y - 20],
                    scale: [0.2, p.scale * 1.2, p.scale],
                    rotate: [0, p.rotate * 0.5, p.rotate],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    delay: p.delay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  {p.type === 'heart' ? (
                    <Heart
                      className="w-4 h-4 fill-current drop-shadow-xs"
                      style={{ color: p.color }}
                    />
                  ) : p.type === 'ember' ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                  ) : (
                    <Sparkles
                      className="w-3.5 h-3.5 fill-current"
                      style={{ color: p.color }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Floating Instruction Hint */}
        <AnimatePresence>
          {showHint && !isSubmitting && !isSealed && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: -6, scale: 1 }}
              exit={{ opacity: 0, y: -2, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="absolute -top-9 px-3 py-1 rounded-full bg-[#2B2420] text-[#FAF6F0] text-[11px] font-medium tracking-wide shadow-md flex items-center gap-1.5 pointer-events-none whitespace-nowrap"
            >
              <Heart className="w-3 h-3 text-[#C67B5C] fill-[#C67B5C]" />
              <span>Press & hold to seal</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Tactile Press-and-Hold Button */}
        <motion.button
          id="btn-submit-hangout-request"
          type="button"
          disabled={disabled || isSubmitting || isSealed}
          onClick={handleClick}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          animate={{
            scale: isPressing && !prefersReducedMotion() ? 0.97 : 1,
            x: isPressing && !prefersReducedMotion() ? (Math.random() - 0.5) * 1.5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-full h-14 sm:h-15 min-h-[52px] sm:min-h-[56px] bg-[#C67B5C] hover:bg-[#B87053] active:bg-[#AA6448] disabled:opacity-60 disabled:cursor-not-allowed text-[#2B2420] font-serif text-lg sm:text-xl tracking-tight rounded-full flex items-center justify-between px-3.5 sm:px-6 shadow-[0_6px_24px_rgba(198,123,92,0.32)] border border-[#2B2420]/20 cursor-pointer relative overflow-hidden group select-none touch-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C67B5C]/40"
          aria-label="Press and hold to seal this plan"
        >
          {/* Accessible Live Region for Screen Readers */}
          <span className="sr-only" role="status" aria-live="polite">
            {isSealed
              ? 'Date note sealed and sent.'
              : isPressing
              ? `Holding to seal, ${Math.round(progress * 100)} percent complete.`
              : ''}
          </span>

          {/* Real-time Progress Fill along the entire button */}
          <motion.div
            className="absolute inset-0 bg-[#B66B4E] origin-left pointer-events-none opacity-40"
            style={{
              transform: `scaleX(${progress})`,
              transition: isPressing ? 'none' : 'transform 0.25s ease-out',
            }}
          />

          {/* Kokonut UI Signature Shimmer Light-sweep (adapted from kokonutui.com/docs/components/button) */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-25 -translate-x-[250%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none" />

          {/* Embossed Inner Rim */}
          <div className="absolute inset-1 rounded-full border border-[#2B2420]/15 pointer-events-none" />

          {/* Left: Interactive Progress Ring & Liquid Molten Wax Seal Emblem */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg
              className="absolute inset-0 w-10 h-10 sm:w-11 sm:h-11 -rotate-90 pointer-events-none z-20"
              viewBox="0 0 56 56"
            >
              {/* Background track */}
              <circle
                cx="28"
                cy="28"
                r={circleRadius}
                fill="none"
                stroke="rgba(43, 36, 32, 0.18)"
                strokeWidth="3.5"
              />
              {/* Animated fill circle */}
              <circle
                cx="28"
                cy="28"
                r={circleRadius}
                fill="none"
                stroke="#2B2420"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: isPressing
                    ? 'none'
                    : 'stroke-dashoffset 0.25s ease-out',
                }}
              />
            </svg>

            {/* Tactile Liquid Molten Wax Seal Stamp */}
            <div className="relative z-10 scale-90">
              <LiquidWaxSeal
                size="sm"
                isPressing={isPressing}
                isSealed={isSealed}
                progress={progress}
              />
            </div>
          </div>

          {/* Center: Dynamic Label */}
          <div className="flex-1 text-center font-serif text-base sm:text-lg md:text-xl font-medium tracking-tight px-1 truncate">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2 text-sm sm:text-base font-sans font-medium text-[#2B2420]">
                <Loader2 className="w-4 h-4 animate-spin text-[#2B2420]" />
                <span>Sealing...</span>
              </span>
            ) : isSealed ? (
              <span className="text-[#2B2420] font-bold text-sm sm:text-lg">Sealed with love ♡</span>
            ) : isPressing ? (
              <span className="text-sm sm:text-base font-sans font-semibold text-[#2B2420]">
                Hold to seal for us ({Math.round(progress * 100)}%)
              </span>
            ) : (
              <span className="text-[#2B2420]">{label}</span>
            )}
          </div>

          {/* Right: Tactile Arrow or Micro-Indicator */}
          <div className="w-8 sm:w-10 h-10 flex items-center justify-end pr-1 text-base font-sans font-bold text-[#2B2420] shrink-0">
            <motion.span
              animate={isPressing ? { x: 3 } : { x: 0 }}
              transition={{ repeat: isPressing ? Infinity : 0, duration: 0.3 }}
            >
              &rarr;
            </motion.span>
          </div>
        </motion.button>
      </div>
    </footer>
  );
};
