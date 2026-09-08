import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  CalendarPlus,
  Share2,
  BookOpen,
  Plus,
} from 'lucide-react';
import { LocationData } from '../types';
import { sound } from '../lib/sound';
import { formatDateFriendly, formatTimeFriendly } from '../lib/dateTime';

interface InteractiveTicketProps {
  ticketId?: string;
  date: string;
  time: string;
  hangout: string;
  hangouts?: string[];
  craving: string;
  cravings?: string[];
  otherCraving: string;
  vibe: string;
  budget?: string;
  proposedBy?: string;
  location: LocationData;
  sweetNote: string;
  onReset: () => void;
  onEdit?: () => void;
}

export const InteractiveTicket: React.FC<InteractiveTicketProps> = ({
  ticketId,
  date,
  time,
  hangout,
  hangouts,
  craving,
  cravings,
  otherCraving,
  vibe,
  budget,
  proposedBy,
  location,
  sweetNote,
  onReset,
  onEdit,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Details copied to clipboard');
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isCalendarExported, setIsCalendarExported] = useState(false);
  const [countdown, setCountdown] = useState<{ value: string; unit: string; isPast: boolean }>(
    { value: '—', unit: 'days', isPast: false }
  );

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    if (ticketId) {
      return `${window.location.origin}/ticket/${ticketId}`;
    }
    return window.location.href;
  };

  const handleShareLink = async () => {
    sound.playChipTick();
    const shareUrl = getShareUrl();
    const shareData = {
      title: 'Our Next Date',
      text: `A date proposal for us ♡ — ${effectiveHangout}`,
      url: shareUrl,
    };

    const triggerLinkSuccess = () => {
      setToastMessage('Link copied to clipboard');
      setCopiedToast(true);
      setIsLinkCopied(true);
      setTimeout(() => {
        setCopiedToast(false);
        setIsLinkCopied(false);
      }, 2500);
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        triggerLinkSuccess();
        return;
      }
    } catch (err) {
      console.error('Clipboard writeText failed:', err);
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      triggerLinkSuccess();
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  // Arrival sound chime when confirmation card mounts
  useEffect(() => {
    sound.playConfirmationChime();
  }, []);

  // Countdown ticker — refreshes every 60 s, re-runs when date/time changes
  useEffect(() => {
    const compute = () => {
      try {
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        const target = new Date(year, month - 1, day, hour, minute);
        const diffMs = target.getTime() - Date.now();
        if (diffMs < 0) {
          setCountdown({ value: '♡', unit: 'past', isPast: true });
          return;
        }
        const totalMins = Math.floor(diffMs / 60_000);
        const totalHours = Math.floor(diffMs / 3_600_000);
        const totalDays = Math.floor(diffMs / 86_400_000);
        if (totalMins < 60) {
          setCountdown({ value: String(totalMins), unit: 'min', isPast: false });
        } else if (totalDays < 1) {
          setCountdown({ value: String(totalHours), unit: 'hours', isPast: false });
        } else {
          setCountdown({ value: String(totalDays), unit: totalDays === 1 ? 'day' : 'days', isPast: false });
        }
      } catch {
        setCountdown({ value: '—', unit: '', isPast: false });
      }
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [date, time]);

  const rawPlace = location.placeName?.trim() || '';
  const selectedCats =
    location.categories && location.categories.length > 0
      ? location.categories
      : location.category && location.category !== 'Other'
      ? [location.category]
      : [];

  const isSurprise =
    location.category === 'Other' ||
    (selectedCats.length === 0 && !rawPlace) ||
    rawPlace.toLowerCase().includes('surprise');

  const displaySpot = isSurprise
    ? 'You surprise me (You choose!)'
    : rawPlace || (selectedCats.length > 0 ? selectedCats.join(' & ') : 'Surprise me');

  const displayCategory = selectedCats.length > 0 ? selectedCats.join(' • ') : '';

  const effectiveCraving =
    cravings && cravings.length > 0
      ? cravings.join(' • ')
      : craving === 'Other'
      ? otherCraving?.trim() || 'Whatever sounds good to you'
      : craving?.trim() || 'Whatever sounds good to you';

  const effectiveHangout =
    hangouts && hangouts.length > 0
      ? hangouts.join(' • ')
      : hangout?.trim() || 'You surprise me';

  const effectiveLink = location.locationLink?.trim();

  // ── Feature #3: Ambient mood cue (time-bucket × category lookup) ───────────
  const ambientCue = ((): string => {
    const h = parseInt(time.split(':')[0] || '19', 10);
    type Bucket = 'morning' | 'brunch' | 'afternoon' | 'golden' | 'evening' | 'late';
    const bucket: Bucket =
      h < 11 ? 'morning' :
      h < 14 ? 'brunch' :
      h < 17 ? 'afternoon' :
      h < 20 ? 'golden' :
      h < 22 ? 'evening' : 'late';

    if (isSurprise) {
      const surpriseCues: Record<Bucket, string> = {
        morning:   'Morning light and the pleasure of not knowing where you\u2019re headed.',
        brunch:    'An unscripted mid-morning, which is always the best kind.',
        afternoon: 'An afternoon without a plan — surprisingly perfect.',
        golden:    'The golden hour holds a small surprise for you both.',
        evening:   'The evening keeps its secret a little longer.',
        late:      'Late and a little mysterious. Just how it should be.',
      };
      return surpriseCues[bucket];
    }

    const cat = selectedCats[0] || 'Caf\u00e9';
    const table: Record<Bucket, Record<string, string>> = {
      morning: {
        'Caf\u00e9':         'Morning light through glass, the smell of coffee before the city wakes.',
        'Restaurant':    'A quiet table before the lunch crowd arrives.',
        'Bar & Lounge':  'Somewhere unhurried, just the two of you.',
        'Park & Outdoor':'Dew still on the grass, the world still soft.',
        'Cinema & Shows':'The theater almost empty, all the best seats waiting.',
        'Art & Workshop':'The creative mind is sharpest in the morning.',
        'Dessert & Bakery':'Warm pastry, warm cup, warm company.',
      },
      brunch: {
        'Caf\u00e9':         'Late morning sun pooling on the table between you.',
        'Restaurant':    'Somewhere between breakfast and the rest of the day.',
        'Bar & Lounge':  'The unhurried kind of afternoon that feels like a gift.',
        'Park & Outdoor':'The city at its most forgiving — bright, breezy, yours.',
        'Cinema & Shows':'A mat\u00een\u00e9e and popcorn before noon. Worth it.',
        'Art & Workshop':'Making something together while the day is still young.',
        'Dessert & Bakery':'Sugar and laughter before lunch. No rules.',
      },
      afternoon: {
        'Caf\u00e9':         'The slow hour — half-empty, conversation easy.',
        'Restaurant':    'Lunch lingers into afternoon, unhurried.',
        'Bar & Lounge':  'The kind of afternoon drink that turns into the evening.',
        'Park & Outdoor':'Golden-adjacent: trees still green, air still warm.',
        'Cinema & Shows':'The cool dark of the theater on a warm afternoon.',
        'Art & Workshop':'Hands busy, time disappearing.',
        'Dessert & Bakery':'That specific afternoon craving, finally indulged.',
      },
      golden: {
        'Caf\u00e9':         'The golden hour falls right across the window table.',
        'Restaurant':    'Candlelight before the candles are even lit.',
        'Bar & Lounge':  'The city softening into evening, one drink in.',
        'Park & Outdoor':'The light turns warm and slow. You\u2019ll want to stay.',
        'Cinema & Shows':'Previews at dusk \u2014 the evening officially beginning.',
        'Art & Workshop':'The best light of the day for making things.',
        'Dessert & Bakery':'Something sweet as the sun goes down.',
      },
      evening: {
        'Caf\u00e9':         'The night caf\u00e9 \u2014 the same table feels different after dark.',
        'Restaurant':    'Dinner by candlelight, unhurried and warm.',
        'Bar & Lounge':  'City lights in the glass. A good evening.',
        'Park & Outdoor':'The park after dark, quiet and just for you.',
        'Cinema & Shows':'Popcorn and a dark room and each other.',
        'Art & Workshop':'Creating something together by lamplight.',
        'Dessert & Bakery':'Dessert for dinner. Absolutely the right call.',
      },
      late: {
        'Caf\u00e9':         'The late-night caf\u00e9 \u2014 small cups, slow conversation.',
        'Restaurant':    'Late dinner while the city finally quiets.',
        'Bar & Lounge':  'The best conversations happen after 10 PM.',
        'Park & Outdoor':'City quiet, sky clear, just the two of you.',
        'Cinema & Shows':'The last showing. Yours alone.',
        'Art & Workshop':'Late-night making is its own kind of magic.',
        'Dessert & Bakery':'Midnight something sweet. No explanation needed.',
      },
    };
    return table[bucket][cat] ?? table[bucket]['Caf\u00e9'] ?? '';
  })();

  // ── Feature #1: Calendar export helpers ────────────────────────────────────
  const generateICS = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const [y, mo, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(min)}00`;
    const dtEnd   = `${y}${pad(mo)}${pad(d)}T${pad((h + 2) % 24)}${pad(min)}00`;
    const summary = `Our Next Date \u2014 ${effectiveHangout}`;
    const desc = [
      effectiveCraving ? `Craving: ${effectiveCraving}` : '',
      `Vibe: ${vibe}`,
      budget ? `Pace: ${budget}` : '',
      proposedBy?.trim() ? `Proposed by: ${proposedBy.trim()}` : '',
      sweetNote?.trim() ? `Note: ${sweetNote.trim()}` : '',
    ].filter(Boolean).join('\\n');
    const loc = displaySpot + (displayCategory && !isSurprise ? ` (${displayCategory})` : '');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Our Next Date//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      effectiveLink ? `URL:${effectiveLink}` : '',
      `UID:our-next-date-${Date.now()}@ourdate`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
  };

  const getGoogleCalendarUrl = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const [y, mo, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(min)}00`;
    const dtEnd   = `${y}${pad(mo)}${pad(d)}T${pad((h + 2) % 24)}${pad(min)}00`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Our Next Date \u2014 ${effectiveHangout}`,
      dates: `${dtStart}/${dtEnd}`,
      details: [
        effectiveCraving ? `Craving: ${effectiveCraving}` : '',
        `Vibe: ${vibe}`,
        budget ? `Pace: ${budget}` : '',
        proposedBy?.trim() ? `\nProposed by: ${proposedBy.trim()}` : '',
        sweetNote?.trim() ? `\nNote: ${sweetNote.trim()}` : '',
      ].filter(Boolean).join('\n'),
      location: displaySpot + (displayCategory && !isSurprise ? ` (${displayCategory})` : ''),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleAddToCalendar = () => {
    sound.playChipTick();
    const blob = new Blob([generateICS()], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'our-next-date.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsCalendarExported(true);
    setTimeout(() => setIsCalendarExported(false), 2500);
  };

  const handleCopyItinerary = async () => {
    sound.playChipTick();
    const formattedDate = formatDateFriendly(date);
    const formattedTime = formatTimeFriendly(time);
    const spotText = `${displaySpot}${displayCategory && !isSurprise ? ` (${displayCategory})` : ''}`;

    const plainTextLines: string[] = [
      'Our Next Date',
      '───────────────────────────────',
      `Date: ${formattedDate}`,
      `Time: ${formattedTime}`,
      `What sounds wonderful: ${effectiveHangout} (${vibe})`,
    ];

    if (budget) {
      plainTextLines.push(`Pace: ${budget}`);
    }

    if (effectiveCraving) {
      plainTextLines.push(`Craving: ${effectiveCraving}`);
    }

    plainTextLines.push(`Where: ${spotText}`);

    if (effectiveLink) {
      plainTextLines.push(`Link: ${effectiveLink}`);
    }

    if (proposedBy?.trim()) {
      plainTextLines.push(`Proposed by: ${proposedBy.trim()}`);
    }

    if (ticketId) {
      plainTextLines.push(`Note Link: ${getShareUrl()}`);
    }

    if (sweetNote?.trim()) {
      plainTextLines.push('');
      plainTextLines.push(`Note: "${sweetNote.trim()}"`);
    }

    plainTextLines.push('───────────────────────────────');
    plainTextLines.push("Can't wait for this one ♡");

    const plainText = plainTextLines.join('\n');

    const htmlText = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 440px; padding: 18px 22px; background-color: #FAF6F0; border: 1px solid #E8DFD5; border-radius: 14px; color: #2B2420; line-height: 1.6;">
  <div style="font-size: 18px; font-weight: 700; color: #C67B5C; margin-bottom: 6px;">Can't wait for this one</div>
  <hr style="border: none; border-top: 1px solid #E8DFD5; margin: 8px 0 12px 0;" />
  <div style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</div>
  <div style="margin: 4px 0;"><strong>Time:</strong> ${formattedTime}</div>
  <div style="margin: 4px 0;"><strong>What sounds wonderful:</strong> ${effectiveHangout} &bull; ${vibe}</div>
  ${budget ? `<div style="margin: 4px 0;"><strong>Pace:</strong> ${budget}</div>` : ''}
  ${effectiveCraving ? `<div style="margin: 4px 0;"><strong>Craving:</strong> ${effectiveCraving}</div>` : ''}
  <div style="margin: 4px 0;"><strong>Where:</strong> ${spotText}</div>
  ${effectiveLink ? `<div style="margin: 4px 0;"><strong>Link:</strong> <a href="${effectiveLink}" style="color: #A8583A; text-decoration: underline;">${effectiveLink}</a></div>` : ''}
  ${proposedBy?.trim() ? `<div style="margin: 4px 0;"><strong>Proposed by:</strong> ${proposedBy.trim()}</div>` : ''}
  ${ticketId ? `<div style="margin: 4px 0;"><strong>Note Link:</strong> <a href="${getShareUrl()}" style="color: #A8583A; text-decoration: underline;">${getShareUrl()}</a></div>` : ''}
  ${sweetNote?.trim() ? `<div style="margin: 12px 0 6px 0; padding: 10px 14px; background-color: #FFFFFF; border: 1px solid #E8DFD5; border-radius: 10px; font-style: italic; color: #2B2420;"><em>&ldquo;${sweetNote.trim()}&rdquo;</em></div>` : ''}
  <hr style="border: none; border-top: 1px solid #E8DFD5; margin: 12px 0 8px 0;" />
  <div style="font-size: 11px; color: #766B65; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">Sealed with love ♡</div>
</div>
`.trim();

    const triggerSuccess = () => {
      setToastMessage('Details copied to clipboard');
      setCopiedToast(true);
      setIsCopied(true);
      setTimeout(() => {
        setCopiedToast(false);
        setIsCopied(false);
      }, 2500);
    };

    // 1. Try ClipboardItem for multi-platform rich text + plain text
    try {
      if (typeof window !== 'undefined' && 'ClipboardItem' in window && navigator.clipboard?.write) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
        triggerSuccess();
        return;
      }
    } catch {
      // If multi-mime clipboard write fails, continue to text fallback
    }

    // 2. Standard navigator.clipboard.writeText
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
        triggerSuccess();
        return;
      }
    } catch {
      // If standard writeText fails, continue to execCommand fallback
    }

    // 3. Fallback for restricted iframe or older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      triggerSuccess();
    } catch (err) {
      console.error('Failed to copy details', err);
    }
  };

  return (
    <motion.div
      key="sealed-note-view"
      id="sealed-note-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl mx-auto w-full py-2 sm:py-6 space-y-5 sm:space-y-6 relative"
    >
      {/* Floating Copied Toast */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div
            id="copied-toast-pill"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#2B2420] text-[#FAF6F0] text-xs font-medium shadow-[0_8px_24px_rgba(43,36,32,0.18)] flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-[#C67B5C]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          id="ticket-btn-dashboard"
          onClick={() => {
            sound.playChipTick();
            window.history.pushState(null, '', '/#dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-[#E8DFD5] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#C67B5C]" />
          <span>Shared proposals</span>
        </button>

        <button
          type="button"
          id="ticket-btn-new-note"
          onClick={() => {
            sound.playChipTick();
            onReset();
          }}
          className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-[#E8DFD5] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
        >
          <Plus className="w-3.5 h-3.5 text-[#C67B5C]" />
          <span>Propose another</span>
        </button>
      </div>

      {/* Hand-Illustrated Boutique Stationery Envelope Backing */}
      <div className="relative">
        <div className="relative -mb-10 sm:-mb-14 mx-auto max-w-xs sm:max-w-md pointer-events-none z-0">
          <img
            src="/assets/illustrations/envelope.png"
            alt=""
            className="w-full h-auto object-contain select-none mx-auto opacity-95"
          />
        </div>

        {/* Love Note Stationery Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DFD5] shadow-[0_1px_2px_rgba(43,36,32,0.04),_0_8px_24px_rgba(43,36,32,0.07),_0_24px_56px_rgba(43,36,32,0.05)] ring-1 ring-inset ring-white/70 paper-edge p-4.5 sm:p-7 md:p-10 relative z-10 overflow-hidden">
          {/* Top Header & Wax Seal */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-dashed border-[#E8DFD5]/60">
            <div>
              <span
                className="text-xs uppercase text-[#A8583A] font-semibold"
                style={{ letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(168,88,58,0.15)' }}
              >
                Sealed with Love
              </span>
              <h1
                id="confirmation-title"
                className="font-serif text-2xl sm:text-3xl text-[#2B2420] mt-1"
                style={{ letterSpacing: '-0.03em' }}
              >
                Can't wait for this one
              </h1>
              {proposedBy?.trim() && (
                <p
                  id="confirmation-short-line"
                  className="mt-1 text-xs text-[#A8583A] font-medium"
                >
                  {proposedBy.trim() === 'Zakh'
                    ? 'From Zakh to Andrea ♡'
                    : proposedBy.trim() === 'Andrea'
                    ? 'From Andrea to Zakh ♡'
                    : `Proposed by ${proposedBy.trim()}`}
                </p>
              )}
            </div>

            {/* Tactile Wax Seal Stamp */}
            <motion.div
              id="terracotta-seal"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 16,
                delay: 0.1,
              }}
              style={{ filter: 'drop-shadow(0 4px 8px rgba(198,123,92,0.35))' }}
              className="shrink-0"
            >
              <img
                src="/assets/illustrations/wax_seal.png"
                alt="Terracotta wax seal"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain select-none pointer-events-none"
              />
            </motion.div>
          </div>

        {/* Itinerary Body: Date/Time is the undisputed visual hero */}
        <div className="py-6 space-y-6 text-[#2B2420]">
          {/* Dominant Hero: When (Date & Time) — with postmark stamp + ambient cue */}
          <div className="bg-[#FAF6F0] rounded-2xl p-5 border border-[#E8DFD5]/70 ruled-paper relative overflow-visible">
            <div className="font-serif text-2xl sm:text-3xl text-[#2B2420] leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {formatDateFriendly(date)}
            </div>
            <div className="text-base sm:text-lg text-[#A8583A] font-medium mt-1">
              at {formatTimeFriendly(time)}
            </div>

            {/* Feature #3 — Ambient mood cue */}
            {ambientCue && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                className="mt-2.5 font-serif italic text-xs sm:text-sm text-[#766B65] leading-relaxed pr-20"
              >
                {ambientCue}
              </motion.p>
            )}

            {/* Feature #2 — Ink-postmark countdown stamp */}
            <motion.div
              initial={{ opacity: 0, scale: 0.55, rotate: -18 }}
              animate={{ opacity: 0.80, scale: 1, rotate: -5 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute -top-3 -right-3 sm:-top-2 sm:-right-2 w-[78px] h-[78px] flex items-center justify-center"
              aria-hidden="true"
            >
              {/* Concentric postmark rings */}
              <div className="absolute inset-0 rounded-full border-[1.5px] border-[#2B2420]/38" />
              <div className="absolute inset-[6px] rounded-full border border-dashed border-[#2B2420]/32" />
              <div className="absolute inset-[11px] rounded-full border border-[#2B2420]/20" />
              {/* Central text */}
              <div className="relative z-10 text-center select-none leading-none">
                <div
                  className="font-serif font-bold text-[#2B2420]"
                  style={{ fontSize: countdown.value.length > 2 ? '13px' : '21px', lineHeight: 1 }}
                >
                  {countdown.value}
                </div>
                <div
                  className="uppercase text-[#2B2420]/50 font-sans tracking-widest mt-0.5"
                  style={{ fontSize: '7px', letterSpacing: '0.13em', lineHeight: 1 }}
                >
                  {countdown.unit}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Context Details: Natural rhythm, no robotic key-value icons */}
          <div className="space-y-4 px-1">
            {/* Vibe, Budget & Craving phrase */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-lg">
              <span className="font-medium text-[#2B2420]">{effectiveHangout}</span>
              <span className="text-[#766B65]">•</span>
              <span className="text-[#766B65]">{vibe}</span>
              {budget && (
                <>
                  <span className="text-[#766B65]">•</span>
                  <span className="text-[#C67B5C] font-medium">{budget}</span>
                </>
              )}
              {effectiveCraving && (
                <>
                  <span className="text-[#766B65]">•</span>
                  <span className="text-[#2B2420]">craving {effectiveCraving}</span>
                </>
              )}
            </div>

            {/* Destination */}
            <div className="pt-2 border-t border-dashed border-[#E8DFD5]/60 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs text-[#766B65] block">Where we'll wander</span>
                <span className="text-base font-medium text-[#2B2420] mt-0.5 block">
                  {displaySpot}
                  {displayCategory && !isSurprise && (
                    <span className="text-[#766B65] text-sm ml-2 font-normal">
                      ({displayCategory})
                    </span>
                  )}
                </span>
              </div>

              {effectiveLink && (
                <a
                  href={effectiveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#A8583A] hover:text-[#2B2420] font-medium underline underline-offset-4 shrink-0 min-h-[48px] px-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-md"
                >
                  <span>Open link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Attached Reference Photos */}
            {location.imageUrls && location.imageUrls.length > 0 && (
              <div className="pt-3 border-t border-dashed border-[#E8DFD5]/60 space-y-2">
                <span className="text-xs text-[#766B65] block font-medium">
                  Reference Photos & Menus
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {location.imageUrls.map((imgUrl, i) => (
                    <a
                      key={i}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white shadow-xs bg-[#FAF6F0] block cursor-pointer transition-transform hover:scale-105"
                      title="View reference photo"
                    >
                      <img
                        src={imgUrl}
                        alt={`Reference photo ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            '/assets/illustrations/paper_texture.png';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Handwritten Postscript */}
            {sweetNote?.trim() && (
              <div className="pt-4 border-t border-dashed border-[#E8DFD5]/60">
                <div className="relative rounded-xl overflow-hidden p-4 sm:p-5 border border-[#E8DFD5]/70 bg-[#FAF6F0]/80">
                  <img
                    src="/assets/illustrations/paper_texture.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none select-none mix-blend-multiply"
                  />
                  <p
                    className="relative z-10 font-handwriting text-[#2B2420] leading-relaxed"
                    style={{ fontSize: '20px', letterSpacing: '0.01em' }}
                  >
                    P.S. "{sweetNote.trim()}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Calendar export + Copy action */}
          <div className="pt-4 sm:pt-5 border-t border-dashed border-[#E8DFD5]/60 space-y-3">
            {/* Primary action row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">

              {/* Feature #1 — Save to Calendar */}
              <button
                type="button"
                id="btn-add-to-calendar"
                onClick={handleAddToCalendar}
                className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium border flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 ${
                  isCalendarExported
                    ? 'bg-[#FAF6F0] border-[#C67B5C] text-[#2B2420] shadow-xs ring-1 ring-[#C67B5C]/30'
                    : 'bg-white hover:bg-[#FAF6F0] active:scale-[0.97] border-[#E8DFD5] hover:border-[#C67B5C]/60 text-[#2B2420] shadow-2xs'
                }`}
                aria-label="Download .ics file to add date to calendar"
              >
                <AnimatePresence mode="wait">
                  {isCalendarExported ? (
                    <motion.span
                      key="saved"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Check className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-semibold">Saved!</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <CalendarPlus className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-medium">Save to Calendar</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Copy details */}
              <button
                type="button"
                id="btn-copy-itinerary"
                onClick={handleCopyItinerary}
                className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium border flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 ${
                  isCopied
                    ? 'bg-[#FAF6F0] border-[#C67B5C] text-[#2B2420] shadow-xs ring-1 ring-[#C67B5C]/30'
                    : 'bg-[#FAF6F0] hover:bg-[#F3ECE4] active:scale-[0.97] border-[#E8DFD5] hover:border-[#C67B5C]/60 text-[#2B2420] shadow-2xs'
                }`}
                aria-label="Copy formatted date itinerary to clipboard"
              >
                <AnimatePresence mode="wait">
                  {isCopied ? (
                    <motion.span
                      key="copied"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Check className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-semibold">Copied!</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Copy className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-medium">Copy details</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Copy link / Native Web Share */}
              <button
                type="button"
                id="btn-share-ticket"
                onClick={handleShareLink}
                className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium border flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 ${
                  isLinkCopied
                    ? 'bg-[#FAF6F0] border-[#C67B5C] text-[#2B2420] shadow-xs ring-1 ring-[#C67B5C]/30'
                    : 'bg-[#FAF6F0] hover:bg-[#F3ECE4] active:scale-[0.97] border-[#E8DFD5] hover:border-[#C67B5C]/60 text-[#2B2420] shadow-2xs'
                }`}
                aria-label="Share or copy link to this proposal"
              >
                <AnimatePresence mode="wait">
                  {isLinkCopied ? (
                    <motion.span
                      key="link-copied"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Check className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-semibold">Link copied!</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="share-link"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Share2 className="w-4 h-4 text-[#C67B5C] shrink-0" />
                      <span className="font-medium">Copy link</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Google Calendar fallback */}
            <div className="flex items-center justify-end">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#A8583A] hover:text-[#2B2420] underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded inline-flex items-center gap-1"
              >
                <span>Google Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Perforated tear-line between card and action buttons */}
      <div className="relative flex items-center justify-center my-1 px-2 overflow-hidden" aria-hidden="true">
        <div className="flex-1 border-t-2 border-dashed border-[#E8DFD5]" />
        <span className="px-3 text-[10px] uppercase text-[#766B65]/50 font-sans select-none" style={{ letterSpacing: '0.2em' }}>
          tear here
        </span>
        <div className="flex-1 border-t-2 border-dashed border-[#E8DFD5]" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onEdit && (
          <button
            id="btn-edit-details"
            type="button"
            onClick={() => {
              sound.playChipTick();
              onEdit();
            }}
            className="flex-1 min-h-[48px] rounded-full bg-white hover:bg-[#FAF6F0] text-[#2B2420] font-medium border border-[#E8DFD5] transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm shadow-2xs focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none"
          >
            <RotateCcw className="w-4 h-4 text-[#766B65]" />
            <span>Adjust our plans</span>
          </button>
        )}
        <button
          id="btn-plan-another"
          type="button"
          onClick={() => {
            sound.playChipTick();
            onReset();
          }}
          className="flex-1 min-h-[48px] rounded-full bg-transparent hover:bg-white text-[#766B65] hover:text-[#2B2420] text-sm font-medium transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none"
        >
          <span>Write a new note</span>
        </button>
      </div>
    </motion.div>
  );
};
