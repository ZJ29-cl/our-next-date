import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AmbientMoodBackgroundProps {
  time: string; // e.g. "19:00"
}

type TimePeriod = 'morning' | 'afternoon' | 'evening';

export const AmbientMoodBackground: React.FC<AmbientMoodBackgroundProps> = ({
  time,
}) => {
  const period: TimePeriod = useMemo(() => {
    try {
      const hour = parseInt(time.split(':')[0] || '19', 10);
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      return 'evening';
    } catch {
      return 'evening';
    }
  }, [time]);

  // Color configurations that gracefully complement the #FAF6F0 canvas
  const moodConfig = useMemo(() => {
    switch (period) {
      case 'morning':
        return {
          label: 'Morning Sun',
          orb1: 'rgba(247, 222, 178, 0.45)', // Warm soft amber
          orb2: 'rgba(235, 196, 168, 0.35)', // Peach dawn
          orb3: 'rgba(253, 246, 227, 0.60)', // Golden daylight
          ambientTint: 'rgba(250, 244, 235, 0.70)',
        };
      case 'afternoon':
        return {
          label: 'Golden Afternoon',
          orb1: 'rgba(232, 196, 184, 0.45)', // Soft terracotta glow
          orb2: 'rgba(245, 218, 195, 0.40)', // Warm linen
          orb3: 'rgba(224, 168, 142, 0.30)', // Solar terracotta
          ambientTint: 'rgba(250, 246, 240, 0.70)',
        };
      case 'evening':
      default:
        return {
          label: 'Candlelit Evening',
          orb1: 'rgba(214, 143, 116, 0.35)', // Romantic terracotta dusk
          orb2: 'rgba(238, 201, 187, 0.38)', // Rose quartz warmth
          orb3: 'rgba(198, 123, 92, 0.22)',  // Candlelight amber
          ambientTint: 'rgba(247, 239, 233, 0.65)',
        };
    }
  }, [period]);

  return (
    <div
      id="ambient-mood-background"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* Base Ambient Tint */}
          <div
            className="absolute inset-0 transition-colors duration-1000"
            style={{ backgroundColor: moodConfig.ambientTint }}
          />

          {/* Floating Atmospheric Mood Orb 1 */}
          <motion.div
            animate={{
              x: [0, 25, -20, 0],
              y: [0, -35, 20, 0],
              scale: [1, 1.08, 0.95, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ backgroundColor: moodConfig.orb1 }}
            className="absolute -top-24 -left-20 w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] rounded-full blur-2xl sm:blur-3xl"
          />

          {/* Floating Atmospheric Mood Orb 2 */}
          <motion.div
            animate={{
              x: [0, -30, 25, 0],
              y: [0, 40, -25, 0],
              scale: [1, 0.92, 1.06, 1],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            style={{ backgroundColor: moodConfig.orb2 }}
            className="absolute top-1/3 -right-24 w-[300px] sm:w-[480px] h-[300px] sm:h-[480px] rounded-full blur-2xl sm:blur-3xl"
          />

          {/* Floating Atmospheric Mood Orb 3 */}
          <motion.div
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -20, 30, 0],
              scale: [1, 1.05, 0.94, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 4,
            }}
            style={{ backgroundColor: moodConfig.orb3 }}
            className="absolute -bottom-28 left-1/4 w-[280px] sm:w-[460px] h-[280px] sm:h-[460px] rounded-full blur-2xl sm:blur-3xl"
          />
        </motion.div>
      </AnimatePresence>

      {/* Tactile paper noise overlay */}
      <div className="absolute inset-0 stationery-texture opacity-65 mix-blend-multiply pointer-events-none" />
    </div>
  );
};
