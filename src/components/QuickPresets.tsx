import React from 'react';
import { motion } from 'motion/react';
import { sound } from '../lib/sound';
import { prefersReducedMotion } from '../lib/motion';

interface QuickPresetsProps {
  currentDate: string;
  currentTime: string;
  selectedDatePreset: string | null;
  selectedTimePreset: string | null;
  onSelectDate: (date: string, presetId: string) => void;
  onSelectTime: (time: string, presetId: string) => void;
}

interface DatePreset {
  id: string;
  label: string;
  sublabel: string;
  dateStr: string;
}

interface TimePreset {
  id: string;
  label: string;
  timeStr: string;
  period: string;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({
  currentDate,
  currentTime,
  selectedDatePreset,
  selectedTimePreset,
  onSelectDate,
  onSelectTime,
}) => {
  // Compute upcoming dates dynamically
  const getDatePresets = (): DatePreset[] => {
    const today = new Date();

    const getIsoDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 1. Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = getIsoDate(tomorrow);
    const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'short' });

    // 2. Next Friday
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    friday.setDate(today.getDate() + (today.getDay() === 5 ? 7 : daysUntilFriday));
    const fridayStr = getIsoDate(friday);

    // 3. Next Saturday
    const saturday = new Date(today);
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    saturday.setDate(today.getDate() + (today.getDay() === 6 ? 7 : daysUntilSaturday));
    const saturdayStr = getIsoDate(saturday);

    // 4. Next Sunday
    const sunday = new Date(today);
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    sunday.setDate(today.getDate() + (today.getDay() === 0 ? 7 : daysUntilSunday));
    const sundayStr = getIsoDate(sunday);

    const presets: DatePreset[] = [
      {
        id: 'tomorrow',
        label: 'Tomorrow',
        sublabel: tomorrowDayName,
        dateStr: tomorrowStr,
      },
    ];

    if (fridayStr !== tomorrowStr) {
      presets.push({
        id: 'friday',
        label: today.getDay() < 5 ? 'This Friday' : 'Next Friday',
        sublabel: friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateStr: fridayStr,
      });
    }

    if (saturdayStr !== tomorrowStr) {
      presets.push({
        id: 'saturday',
        label: today.getDay() < 6 ? 'This Saturday' : 'Next Saturday',
        sublabel: saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateStr: saturdayStr,
      });
    }

    if (sundayStr !== tomorrowStr && presets.length < 4) {
      presets.push({
        id: 'sunday',
        label: today.getDay() === 0 ? 'Next Sunday' : 'This Sunday',
        sublabel: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateStr: sundayStr,
      });
    }

    return presets.slice(0, 4);
  };

  const timePresets: TimePreset[] = [
    { id: 'coffee', label: 'Coffee & Brunch', timeStr: '11:00', period: '11:00 AM' },
    { id: 'afternoon', label: 'Afternoon Stroll', timeStr: '15:30', period: '3:30 PM' },
    { id: 'dinner', label: 'Dinner & Sunset', timeStr: '19:00', period: '7:00 PM' },
    { id: 'late', label: 'Late Drinks', timeStr: '21:30', period: '9:30 PM' },
  ];

  const datePresets = getDatePresets();

  return (
    <div id="quick-presets-module" className="space-y-3">
      {/* Date Presets: 2-column grid on mobile, flex-wrap on desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {datePresets.map((preset) => {
          const isSelected = selectedDatePreset === preset.id;
          return (
            <motion.button
              key={preset.id}
              type="button"
              onClick={() => {
                sound.playChipTick();
                onSelectDate(preset.dateStr, preset.id);
              }}
              whileHover={prefersReducedMotion() ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion() ? undefined : { scale: 0.97 }}
              className={`relative min-h-[48px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer transition-colors select-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                isSelected
                  ? 'border-[#2B2420] text-[#2B2420] font-semibold shadow-xs'
                  : 'border-[#E8DFD5] bg-white text-[#766B65] hover:text-[#2B2420] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0]'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-date-preset-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-[#C67B5C] rounded-xl z-0"
                />
              )}
              <span className="relative z-10">{preset.label}</span>
              <span className={`text-[11px] relative z-10 opacity-75 ${isSelected ? 'text-[#2B2420]' : 'text-[#766B65]'}`}>
                {preset.sublabel}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Time Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {timePresets.map((preset) => {
          const isSelected = selectedTimePreset === preset.id;
          return (
            <motion.button
              key={preset.id}
              type="button"
              onClick={() => {
                sound.playChipTick();
                onSelectTime(preset.timeStr, preset.id);
              }}
              whileHover={prefersReducedMotion() ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion() ? undefined : { scale: 0.97 }}
              className={`relative min-h-[48px] px-3 py-2 rounded-xl text-left border cursor-pointer transition-colors select-none overflow-hidden focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                isSelected
                  ? 'border-[#2B2420] text-[#2B2420] shadow-xs'
                  : 'border-[#E8DFD5] bg-white text-[#766B65] hover:text-[#2B2420] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0]'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-time-preset-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-[#C67B5C] rounded-xl z-0"
                />
              )}
              <div className="relative z-10 flex flex-col justify-center h-full">
                <span className={`text-xs font-semibold ${isSelected ? 'text-[#2B2420]' : 'text-[#2B2420]'}`}>
                  {preset.label}
                </span>
                <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-[#2B2420] opacity-80' : 'text-[#766B65]'}`}>
                  {preset.period}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
