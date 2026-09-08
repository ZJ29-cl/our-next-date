import React from 'react';
import { motion } from 'motion/react';

interface LiquidWaxSealProps {
  size?: 'sm' | 'md' | 'lg';
  isPressing?: boolean;
  isSealed?: boolean;
  progress?: number; // 0 to 1
  className?: string;
}

export const LiquidWaxSeal: React.FC<LiquidWaxSealProps> = ({
  size = 'md',
  isPressing = false,
  isSealed = false,
  progress = 0,
  className = '',
}) => {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
  }[size];

  return (
    <motion.div
      animate={
        isSealed
          ? { scale: [1, 1.15, 1], rotate: [0, -6, 2, 0] }
          : isPressing
          ? {
              scale: 1 + progress * 0.1,
              rotate: (progress * 12) % 360,
            }
          : { scale: 1, rotate: 0 }
      }
      transition={
        isSealed
          ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          : {
              type: 'spring',
              stiffness: 420,
              damping: 22,
            }
      }
      className={`relative select-none shrink-0 ${dimensions} ${className}`}
    >
      <img
        src="/assets/illustrations/wax_seal.png"
        alt="Terracotta wax seal"
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </motion.div>
  );
};

