import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  PenLine,
  AlertCircle,
  Volume2,
  VolumeX,
  Plus,
  X,
  User,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  saveProposal,
  getProposalById,
  buildShareUrl,
  readShareParamFromUrl,
} from './lib/storage';
import { PlaceSelector } from './components/PlaceSelector';
import { Dashboard } from './components/Dashboard';
import { QuickPresets } from './components/QuickPresets';
import { AmbientMoodBackground } from './components/AmbientMoodBackground';
import { PressToSealCTA } from './components/PressToSealCTA';
import { InteractiveTicket } from './components/InteractiveTicket';
import { LocationData, HangoutRequest } from './types';
import { sound } from './lib/sound';
import { prefersReducedMotion } from './lib/motion';
import { getDefaultDate } from './lib/dateTime';

const formContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const formSectionVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 32,
    },
  },
};

type HangoutType =
  | 'Casual'
  | 'Fancy Dinner'
  | 'Cozy Movie Night'
  | 'Outdoor Adventure'
  | 'Game Night'
  | 'Live Music/Gig'
  | 'Road Trip'
  | 'Staying In'
  | 'Surprise Me'
  | string;

type CravingType =
  | 'Filipino'
  | 'Italian'
  | 'Japanese'
  | 'Korean'
  | 'Fast Food'
  | 'Street Food'
  | 'Sweets/Dessert'
  | 'Other'
  | string;

type VibeType = 'Just hang out' | 'Keep it cozy' | '';
type BudgetType = 'Keep it low-key' | 'Treat ourselves' | '';

const PROFILE_STORAGE_KEY = 'our-next-date:profile-name';

const DEFAULT_HANGOUT_OPTIONS: string[] = [
  'Casual',
  'Fancy Dinner',
  'Cozy Movie Night',
  'Outdoor Adventure',
  'Game Night',
  'Live Music/Gig',
  'Road Trip',
  'Staying In',
  'Surprise Me',
];

const DEFAULT_CRAVING_OPTIONS: string[] = [
  'Filipino',
  'Italian',
  'Japanese',
  'Korean',
  'Fast Food',
  'Street Food',
  'Sweets/Dessert',
  'Other',
];



export const getTicketIdFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  const pathMatch = pathname.match(/\/ticket\/([a-zA-Z0-9_-]+)/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  const hash = window.location.hash;
  const hashMatch = hash.match(/ticket(?:\/|=)([a-zA-Z0-9_-]+)/);
  if (hashMatch && hashMatch[1]) return hashMatch[1];

  const searchParams = new URLSearchParams(window.location.search);
  const ticketParam = searchParams.get('ticket');
  if (ticketParam) return ticketParam;

  return null;
};

export default function App() {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => getTicketIdFromLocation());
  const [ticketData, setTicketData] = useState<HangoutRequest | null>(null);
  const [isTicketLoading, setIsTicketLoading] = useState<boolean>(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;

      if (
        pathname.includes('/dashboard') ||
        hash.includes('dashboard') ||
        search.includes('view=dashboard') ||
        search.includes('dashboard')
      ) {
        return '/dashboard';
      }

      const tId = getTicketIdFromLocation();
      if (tId) return '/ticket';
    }
    return '/';
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());

  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;

      if (
        pathname.includes('/dashboard') ||
        hash.includes('dashboard') ||
        search.includes('view=dashboard') ||
        search.includes('dashboard')
      ) {
        setActiveTicketId(null);
        setCurrentPath('/dashboard');
        return;
      }

      const tId = getTicketIdFromLocation();
      if (tId) {
        setActiveTicketId(tId);
        setCurrentPath('/ticket');
        return;
      }

      setActiveTicketId(null);
      setCurrentPath('/');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Load ticket when activeTicketId is set.
  // Priority: localStorage (proposer's device) → ?share= URL param (recipient's device)
  useEffect(() => {
    if (!activeTicketId) {
      return;
    }

    if (ticketData && ticketData.id === activeTicketId) {
      return;
    }

    setIsTicketLoading(true);
    setTicketError(null);

    // 1. Check localStorage first (the device that created this ticket)
    const stored = getProposalById(activeTicketId);
    if (stored) {
      setTicketData(stored);
      setIsTicketLoading(false);
      return;
    }

    // 2. Fall back to decoding the ?share= URL param (recipient's device)
    const sharedTicket = readShareParamFromUrl();
    if (sharedTicket) {
      // Ensure the decoded ticket ID matches the URL path segment
      const resolved: HangoutRequest = { ...sharedTicket, id: activeTicketId };
      setTicketData(resolved);
      setIsTicketLoading(false);
      return;
    }

    // 3. Not found anywhere
    setTicketError(
      'This proposal note could not be found. It may only be viewable on the device that created it — try opening the full share link.'
    );
    setIsTicketLoading(false);
  }, [activeTicketId]);

  // Form State: Starts as an inviting, pressure-free blank slate for both partners
  const [date, setDate] = useState<string>(getDefaultDate());
  const [time, setTime] = useState<string>('19:00');
  const [selectedDatePreset, setSelectedDatePreset] = useState<string | null>(null);
  const [selectedTimePreset, setSelectedTimePreset] = useState<string | null>(null);

  // Per-device profile persisted in localStorage
  const [proposedBy, setProposedBy] = useState<'Zakh' | 'Andrea' | ''>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored === 'Zakh' || stored === 'Andrea') return stored;
    } catch {
      // LocalStorage fallback
    }
    return '';
  });

  const handleSelectProfile = (name: 'Zakh' | 'Andrea') => {
    sound.playSegmentedTick();
    const next = proposedBy === name ? '' : name;
    setProposedBy(next);
    try {
      if (next) {
        localStorage.setItem(PROFILE_STORAGE_KEY, next);
      } else {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  };

  const [selectedHangouts, setSelectedHangouts] = useState<HangoutType[]>([]);
  const [customHangouts, setCustomHangouts] = useState<string[]>([]);
  const [isAddingHangout, setIsAddingHangout] = useState<boolean>(false);
  const [newHangoutInput, setNewHangoutInput] = useState<string>('');

  const [selectedCravings, setSelectedCravings] = useState<CravingType[]>([]);
  const [customCravings, setCustomCravings] = useState<string[]>([]);
  const [isAddingCraving, setIsAddingCraving] = useState<boolean>(false);
  const [newCravingInput, setNewCravingInput] = useState<string>('');

  const [otherCraving, setOtherCraving] = useState<string>('');
  const [vibe, setVibe] = useState<VibeType>('');
  const [budget, setBudget] = useState<BudgetType>('');
  const [sweetNote, setSweetNote] = useState<string>('');
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);

  const [location, setLocation] = useState<LocationData>({
    placeName: '',
    category: 'Other',
    categories: [],
    locationLink: '',
    imageUrls: [],
    address: '',
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (currentPath === '/dashboard') {
    return <Dashboard />;
  }

  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      sound.playChipTick();
    }
  };

  const toggleHangout = (option: string) => {
    sound.playChipTick();
    setSelectedHangouts((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleAddCustomHangout = () => {
    const val = newHangoutInput.trim();
    if (!val) return;
    sound.playChipTick();
    if (!customHangouts.includes(val) && !DEFAULT_HANGOUT_OPTIONS.includes(val)) {
      setCustomHangouts((prev) => [...prev, val]);
    }
    if (!selectedHangouts.includes(val)) {
      setSelectedHangouts((prev) => [...prev, val]);
    }
    setNewHangoutInput('');
    setIsAddingHangout(false);
  };

  const toggleCraving = (option: string) => {
    sound.playChipTick();
    setSelectedCravings((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleAddCustomCraving = () => {
    const val = newCravingInput.trim();
    if (!val) return;
    sound.playChipTick();
    if (!customCravings.includes(val) && !DEFAULT_CRAVING_OPTIONS.includes(val)) {
      setCustomCravings((prev) => [...prev, val]);
    }
    if (!selectedCravings.includes(val)) {
      setSelectedCravings((prev) => [...prev, val]);
    }
    setNewCravingInput('');
    setIsAddingCraving(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    // Compassionate, pressure-free fallbacks: never block whoever's filling this out with harsh form errors
    const effectiveDate = date || getDefaultDate();
    const effectiveTime = time || '19:00';

    try {
      const selectedCats =
        location.categories && location.categories.length > 0
          ? location.categories
          : location.category && location.category !== 'Other'
          ? [location.category]
          : [];

      const isSurprise =
        location.category === 'Other' ||
        (selectedCats.length === 0 && !location.placeName.trim()) ||
        location.placeName.trim().toLowerCase().startsWith('surprise');

      const cleanPlaceName = isSurprise
        ? 'Surprise me'
        : location.placeName.trim() ||
          (selectedCats.length > 0 ? selectedCats.join(' & ') : 'Surprise me');

      const finalLocation: LocationData = {
        placeName: cleanPlaceName,
        category: selectedCats[0] || 'Other',
        categories: selectedCats,
        locationLink: location.locationLink?.trim() || '',
        imageUrls: location.imageUrls || [],
        address: location.address || cleanPlaceName,
      };

      const cravingsList = [...selectedCravings];
      if (cravingsList.includes('Other') && otherCraving.trim()) {
        const idx = cravingsList.indexOf('Other');
        cravingsList[idx] = otherCraving.trim();
      }

      const finalCravingString =
        cravingsList.length > 0 ? cravingsList.join(' • ') : 'Whatever sounds good to you';

      const finalHangoutString =
        selectedHangouts.length > 0 ? selectedHangouts.join(' • ') : 'You surprise me';

      const newTicketId = crypto.randomUUID();

      const newTicket: HangoutRequest = {
        id: newTicketId,
        date: effectiveDate,
        time: effectiveTime,
        hangoutType: finalHangoutString,
        hangouts: selectedHangouts,
        craving: finalCravingString,
        cravings: cravingsList,
        location: finalLocation,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...(vibe ? { vibe } : {}),
        ...(budget ? { budget } : {}),
        ...(proposedBy ? { proposedBy } : {}),
        ...(sweetNote.trim() ? { sweetNote: sweetNote.trim() } : {}),
      };

      // Persist to localStorage on this device
      saveProposal(newTicket);

      // Navigate to /ticket/:id with ?share= param so the share URL is ready immediately
      const shareUrl = buildShareUrl(newTicket);
      const sharePath = shareUrl.replace(window.location.origin, '');
      window.history.pushState(null, '', sharePath);
      setActiveTicketId(newTicketId);
      setTicketData(newTicket);
      setIsSubmitted(true);
      setCurrentPath('/ticket');
    } catch (err: unknown) {
      console.error('Error saving date proposal:', err);
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message || 'Unable to seal proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDetails = () => {
    if (ticketData) {
      if (ticketData.date) setDate(ticketData.date);
      if (ticketData.time) setTime(ticketData.time);
      if (ticketData.hangouts && ticketData.hangouts.length > 0) {
        setSelectedHangouts(ticketData.hangouts);
      }
      if (ticketData.cravings && ticketData.cravings.length > 0) {
        setSelectedCravings(ticketData.cravings);
      }
      if (ticketData.vibe) setVibe(ticketData.vibe as any);
      if (ticketData.budget) setBudget(ticketData.budget as any);
      if (ticketData.proposedBy && (ticketData.proposedBy === 'Zakh' || ticketData.proposedBy === 'Andrea')) {
        setProposedBy(ticketData.proposedBy);
      }
      if (ticketData.location) setLocation(ticketData.location);
      if (ticketData.sweetNote) {
        setSweetNote(ticketData.sweetNote);
        setIsNoteOpen(true);
      }
    }
    window.history.pushState(null, '', '/');
    setActiveTicketId(null);
    setTicketData(null);
    setTicketError(null);
    setIsSubmitted(false);
    setCurrentPath('/');
  };

  const handleResetForm = () => {
    sound.playChipTick();
    setDate(getDefaultDate());
    setTime('19:00');
    setSelectedDatePreset(null);
    setSelectedTimePreset(null);
    setSelectedHangouts([]);
    setSelectedCravings([]);
    setOtherCraving('');
    setVibe('');
    setBudget('');
    setSweetNote('');
    setIsNoteOpen(false);
    setLocation({
      placeName: '',
      category: 'Other',
      categories: [],
      locationLink: '',
      imageUrls: [],
      address: '',
    });
    setIsSubmitted(false);
    setSubmitError(null);
    setActiveTicketId(null);
    setTicketData(null);
    setTicketError(null);
    window.history.pushState(null, '', '/');
    setCurrentPath('/');
  };

  const todayIso = new Date().toISOString().split('T')[0];

  const allHangoutOptions = [
    ...DEFAULT_HANGOUT_OPTIONS,
    ...customHangouts.filter((c) => !DEFAULT_HANGOUT_OPTIONS.includes(c)),
  ];

  const allCravingOptions = [
    ...DEFAULT_CRAVING_OPTIONS,
    ...customCravings.filter((c) => !DEFAULT_CRAVING_OPTIONS.includes(c)),
  ];

  const isViewingTicket = Boolean(activeTicketId || isSubmitted || currentPath === '/ticket');

  return (
    <div
      id="app-root"
      className="min-h-screen bg-[#FAF6F0] text-[#2B2420] antialiased flex justify-center stationery-texture selection:bg-[#E8C4B8] selection:text-[#2B2420] relative overflow-x-hidden"
    >
      <AmbientMoodBackground time={time} />

      <main
        id="date-planner-container"
        className="w-full max-w-2xl min-h-screen flex flex-col relative z-10 px-3.5 sm:px-6 md:px-8 py-5 sm:py-10 pb-36 sm:pb-40"
      >
        {/* Subtle deckled paper backdrop layer behind card */}
        <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-15 overflow-hidden">
          <img
            src="/assets/illustrations/paper_texture.png"
            alt=""
            className="w-full h-full max-w-4xl max-h-[90vh] object-contain select-none mix-blend-multiply"
          />
        </div>

        <AnimatePresence mode="wait">
          {!isViewingTicket ? (
            /* Main Planning Form — Handwritten Stationery Note Card */
            <motion.form
              key="date-plan-form"
              id="date-plan-form"
              aria-labelledby="header-title"
              onSubmit={handleSubmit}
              noValidate
              variants={formContainerVariants}
              initial="hidden"
              animate="show"
              exit={{
                opacity: 0,
                y: -20,
                scale: 0.98,
                transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
              }}
              className="flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-[#E8DFD5] shadow-[0_1px_2px_rgba(43,36,32,0.04),_0_8px_24px_rgba(43,36,32,0.07),_0_24px_56px_rgba(43,36,32,0.05)] ring-1 ring-inset ring-white/70 paper-edge p-4.5 sm:p-7 md:p-10 space-y-6 sm:space-y-8 md:space-y-10 relative"
            >
              {/* Header with audio mute toggle */}
              <header id="main-header" className="space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    {/* Hand-Illustrated Boutique Stationery Hero */}
                    <div className="w-full pb-0.5 sm:pb-1">
                      <img
                        src="/assets/illustrations/hero_cafe_table.png"
                        alt="Hand-illustrated rendezvous table"
                        className="h-16 sm:h-22 md:h-28 w-auto object-contain select-none pointer-events-none"
                      />
                    </div>
                    <h1
                      id="header-title"
                      className="font-serif text-2xl sm:text-4xl md:text-5xl text-[#2B2420]"
                      style={{ letterSpacing: '-0.03em' }}
                    >
                      Our Next Date
                    </h1>
                    <p className="text-xs sm:text-sm text-[#766B65] font-normal pt-0.5">
                      A little plan between us — pick whatever sounds lovely, or leave it to surprise.
                    </p>
                    <div className="pt-1 flex opacity-80 pointer-events-none select-none">
                      <img
                        src="/assets/illustrations/botanical_header_sprig.jpg"
                        alt=""
                        className="h-4 sm:h-5 object-contain mix-blend-multiply"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      id="btn-view-dashboard"
                      onClick={() => {
                        window.location.hash = 'dashboard';
                        setCurrentPath('/dashboard');
                      }}
                      title="View shared proposals"
                      className="min-h-[48px] px-3 py-2 rounded-full text-xs font-medium text-[#766B65] hover:text-[#2B2420] hover:bg-[#FAF6F0] transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none border border-transparent hover:border-[#E8DFD5]"
                      aria-label="View shared proposals dashboard"
                    >
                      <BookOpen className="w-4 h-4 text-[#C67B5C]" />
                      <span className="hidden sm:inline">Proposals</span>
                    </button>

                    <button
                      type="button"
                      id="btn-toggle-sound"
                      onClick={handleToggleMute}
                      title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                      className="min-h-[48px] min-w-[48px] p-2.5 rounded-full text-[#766B65] hover:text-[#2B2420] hover:bg-[#FAF6F0] transition-colors flex items-center justify-center cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none"
                      aria-label={isMuted ? 'Unmute tactile sounds' : 'Mute tactile sounds'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 opacity-70" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-[#C67B5C]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Intimate Per-Device Profile Switch */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#766B65] font-medium whitespace-nowrap flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#C67B5C]" />
                      <span>Proposing:</span>
                    </span>
                    <div
                      id="proposer-profile-switch"
                      className="inline-flex p-1 rounded-full bg-[#FAF6F0] border border-[#E8DFD5] relative"
                      role="radiogroup"
                      aria-label="Select proposer profile"
                    >
                      {(['Zakh', 'Andrea'] as const).map((name) => {
                        const isSelected = proposedBy === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            id={`btn-profile-${name.toLowerCase()}`}
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => handleSelectProfile(name)}
                            className={`relative flex items-center justify-center min-h-[48px] px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                              isSelected
                                ? 'text-[#2B2420] font-semibold'
                                : 'text-[#766B65] hover:text-[#2B2420]'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="active-profile-pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                className="absolute inset-0 bg-white rounded-full border border-[#E8DFD5] shadow-xs -z-10"
                              />
                            )}
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {proposedBy && (
                    <span className="text-[11px] text-[#766B65] italic hidden sm:inline">
                      Saved on this device
                    </span>
                  )}
                </div>
              </header>

              {/* Error banner if any */}
              {submitError && (
                <motion.div
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-[#E8C4B8]/30 border-l-4 border-[#C67B5C] rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-[#C67B5C] shrink-0" />
                  <p className="text-xs sm:text-sm text-[#2B2420] font-medium">
                    {submitError}
                  </p>
                </motion.div>
              )}

              {/* Dominant Hero Element: When are we escaping together? */}
              <motion.section
                id="section-date-time"
                variants={formSectionVariants}
                className="space-y-3 sm:space-y-3.5 bg-[#FAF6F0]/60 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[#E8DFD5]/80"
              >
                <div className="flex items-baseline justify-between">
                  <h2
                    id="label-date-time"
                    className="font-serif text-xl sm:text-2xl text-[#2B2420]"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    When
                  </h2>
                </div>

                <QuickPresets
                  currentDate={date}
                  currentTime={time}
                  selectedDatePreset={selectedDatePreset}
                  selectedTimePreset={selectedTimePreset}
                  onSelectDate={(newDate, presetId) => {
                    setDate(newDate);
                    setSelectedDatePreset(presetId);
                  }}
                  onSelectTime={(newTime, presetId) => {
                    setTime(newTime);
                    setSelectedTimePreset(presetId);
                  }}
                />

                {/* Direct date and time inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="min-h-[48px] bg-white rounded-xl border border-[#E8DFD5] hover:border-[#C67B5C]/60 transition-colors flex items-center px-3.5">
                    <Calendar className="w-4 h-4 text-[#766B65] mr-2.5 shrink-0" />
                    <input
                      id="input-date"
                      type="date"
                      required
                      aria-label="Rendezvous date"
                      min={todayIso}
                      value={date}
                      onChange={(e) => {
                        sound.playChipTick();
                        setDate(e.target.value);
                        setSelectedDatePreset(null);
                      }}
                      className="w-full py-2.5 text-base font-medium text-[#2B2420] bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="min-h-[48px] bg-white rounded-xl border border-[#E8DFD5] hover:border-[#C67B5C]/60 transition-colors flex items-center px-3.5">
                    <Clock className="w-4 h-4 text-[#766B65] mr-2.5 shrink-0" />
                    <input
                      id="input-time"
                      type="time"
                      required
                      aria-label="Rendezvous time"
                      value={time}
                      onChange={(e) => {
                        sound.playChipTick();
                        setTime(e.target.value);
                        setSelectedTimePreset(null);
                      }}
                      className="w-full py-2.5 text-base font-medium text-[#2B2420] bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </motion.section>

              {/* Vibe Multi-select */}
              <motion.section
                id="section-hangout"
                variants={formSectionVariants}
                className="space-y-2.5"
              >
                <div>
                  <h2
                    id="label-hangout-type"
                    className="text-xs uppercase tracking-wider text-[#766B65] font-semibold"
                  >
                    Vibe
                  </h2>
                </div>
                <div
                  id="hangout-chips-group"
                  className="flex flex-wrap gap-1.5 sm:gap-2"
                >
                  {allHangoutOptions.map((option) => {
                    const isSelected = selectedHangouts.includes(option);
                    return (
                      <motion.button
                        key={option}
                        id={`hangout-chip-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        type="button"
                        onClick={() => toggleHangout(option)}
                        whileHover={prefersReducedMotion() ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={
                          prefersReducedMotion()
                            ? undefined
                            : {
                                scale: 0.94,
                                transition: { type: 'spring', stiffness: 600, damping: 22 },
                              }
                        }
                        className={`relative min-h-[48px] px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium border cursor-pointer select-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                          isSelected
                            ? 'border-[#C67B5C] bg-[#C67B5C] text-white font-semibold shadow-xs'
                            : 'border-[#E8DFD5] bg-white text-[#766B65] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0] hover:text-[#2B2420]'
                        }`}
                      >
                        <span>{option}</span>
                      </motion.button>
                    );
                  })}

                  {/* Add your own hangout chip button */}
                  {!isAddingHangout ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingHangout(true)}
                      className="min-h-[48px] px-3 sm:px-4 py-2 rounded-full text-xs font-medium border border-dashed border-[#E8DFD5] bg-white text-[#766B65] hover:border-[#C67B5C] hover:text-[#2B2420] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C67B5C]" />
                      <span>Add your own</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 min-h-[48px]">
                      <input
                        type="text"
                        value={newHangoutInput}
                        onChange={(e) => setNewHangoutInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomHangout();
                          } else if (e.key === 'Escape') {
                            setIsAddingHangout(false);
                          }
                        }}
                        autoFocus
                        placeholder="Custom vibe..."
                        className="px-3 py-2 text-xs bg-white border border-[#C67B5C] rounded-full text-[#2B2420] focus:outline-none w-32 sm:w-40"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomHangout}
                        className="px-2.5 py-1.5 bg-[#C67B5C] text-white rounded-full text-xs font-medium"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingHangout(false)}
                        className="p-1 text-[#766B65] hover:text-[#2B2420]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Secondary Vibe & Budget Segmented Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Sub-vibe Segmented Control */}
                  <div
                    id="vibe-segmented-control"
                    className="w-full sm:w-auto flex sm:inline-flex p-1 rounded-full bg-[#FAF6F0] border border-[#E8DFD5] relative self-stretch sm:self-start"
                  >
                    {(['Keep it cozy', 'Just hang out'] as VibeType[]).map(
                      (vibeOption) => {
                        const isSelected = vibe === vibeOption;
                        return (
                          <button
                            key={vibeOption}
                            type="button"
                            id={`vibe-segment-${vibeOption.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => {
                              sound.playSegmentedTick();
                              setVibe((prev) => (prev === vibeOption ? '' : vibeOption));
                            }}
                            className={`relative flex-1 sm:flex-initial text-center justify-center flex items-center min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                              isSelected
                                ? 'text-[#2B2420] font-semibold'
                                : 'text-[#766B65] hover:text-[#2B2420]'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="active-vibe-segment"
                                transition={{
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 35,
                                }}
                                className="absolute inset-0 bg-white rounded-full border border-[#E8DFD5] shadow-xs -z-10"
                              />
                            )}
                            <span>{vibeOption}</span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Optional Pace / Budget Segmented Control */}
                  <div
                    id="budget-segmented-control"
                    className="w-full sm:w-auto flex sm:inline-flex p-1 rounded-full bg-[#FAF6F0] border border-[#E8DFD5] relative self-stretch sm:self-start"
                  >
                    {(['Keep it low-key', 'Treat ourselves'] as const).map(
                      (budgetOption) => {
                        const isSelected = budget === budgetOption;
                        return (
                          <button
                            key={budgetOption}
                            type="button"
                            id={`budget-segment-${budgetOption.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => {
                              sound.playSegmentedTick();
                              setBudget((prev) => (prev === budgetOption ? '' : budgetOption));
                            }}
                            className={`relative flex-1 sm:flex-initial text-center justify-center flex items-center min-h-[48px] px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                              isSelected
                                ? 'text-[#2B2420] font-semibold'
                                : 'text-[#766B65] hover:text-[#2B2420]'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="active-budget-segment"
                                transition={{
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 35,
                                }}
                                className="absolute inset-0 bg-white rounded-full border border-[#E8DFD5] shadow-xs -z-10"
                              />
                            )}
                            <span>{budgetOption}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </motion.section>

              {/* A few things I'm craving... Multi-select */}
              <motion.section
                id="section-craving"
                variants={formSectionVariants}
                className="space-y-3"
              >
                <div>
                  <h2
                    id="label-craving"
                    className="text-xs uppercase tracking-wider text-[#766B65] font-semibold"
                  >
                    Craving
                  </h2>
                </div>
                <div
                  id="craving-chips-group"
                  className="flex flex-wrap gap-1.5 sm:gap-2"
                >
                  {allCravingOptions.map((option) => {
                    const isSelected = selectedCravings.includes(option);
                    return (
                      <motion.button
                        key={option}
                        id={`craving-chip-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        type="button"
                        onClick={() => toggleCraving(option)}
                        whileHover={prefersReducedMotion() ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={
                          prefersReducedMotion()
                            ? undefined
                            : {
                                scale: 0.94,
                                transition: { type: 'spring', stiffness: 600, damping: 22 },
                              }
                        }
                        className={`relative min-h-[48px] px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium border cursor-pointer select-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                          isSelected
                            ? 'border-[#C67B5C] bg-[#C67B5C] text-white font-semibold shadow-xs'
                            : 'border-[#E8DFD5] bg-white text-[#766B65] hover:border-[#C67B5C]/60 hover:bg-[#FAF6F0] hover:text-[#2B2420]'
                        }`}
                      >
                        <span>{option}</span>
                      </motion.button>
                    );
                  })}

                  {/* Add your own craving chip button */}
                  {!isAddingCraving ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCraving(true)}
                      className="min-h-[48px] px-3 sm:px-4 py-2 rounded-full text-xs font-medium border border-dashed border-[#E8DFD5] bg-white text-[#766B65] hover:border-[#C67B5C] hover:text-[#2B2420] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C67B5C]" />
                      <span>Add your own</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 min-h-[48px]">
                      <input
                        type="text"
                        value={newCravingInput}
                        onChange={(e) => setNewCravingInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCraving();
                          } else if (e.key === 'Escape') {
                            setIsAddingCraving(false);
                          }
                        }}
                        autoFocus
                        placeholder="Custom craving..."
                        className="px-3 py-2 text-xs bg-white border border-[#C67B5C] rounded-full text-[#2B2420] focus:outline-none w-32 sm:w-40"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCraving}
                        className="px-2.5 py-1.5 bg-[#C67B5C] text-white rounded-full text-xs font-medium"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCraving(false)}
                        className="p-1 text-[#766B65] hover:text-[#2B2420]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {selectedCravings.includes('Other') && (
                  <div className="pt-1">
                    <input
                      id="input-other-craving"
                      type="text"
                      aria-label="Custom craving description"
                      value={otherCraving}
                      onChange={(e) => setOtherCraving(e.target.value)}
                      placeholder="What are you in the mood for?"
                      className="w-full min-h-[48px] px-4 py-2.5 text-base text-[#2B2420] placeholder-[#766B65]/70 bg-[#FAF6F0] rounded-xl border border-[#E8DFD5] focus:outline-none focus:border-[#C67B5C] focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2"
                      autoFocus
                    />
                  </div>
                )}
              </motion.section>

              {/* Where */}
              <motion.section
                id="section-location"
                variants={formSectionVariants}
                className="space-y-2.5"
              >
                <div>
                  <h2
                    id="label-location"
                    className="text-xs uppercase tracking-wider text-[#766B65] font-semibold"
                  >
                    Where
                  </h2>
                </div>
                <PlaceSelector
                  location={location}
                  onChange={(newLoc) => setLocation(newLoc)}
                />
              </motion.section>

              {/* Optional Sweet Note */}
              <motion.section
                id="section-sweet-note"
                variants={formSectionVariants}
              >
                <button
                  type="button"
                  id="btn-toggle-sweet-note"
                  onClick={() => {
                    sound.playPaperRustle();
                    setIsNoteOpen(!isNoteOpen);
                  }}
                  className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] flex items-center gap-1.5 cursor-pointer min-h-[48px] transition-colors px-1 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none rounded-lg"
                >
                  <motion.span
                    animate={{ rotate: isNoteOpen ? 15 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <PenLine className="w-3.5 h-3.5 text-[#C67B5C]" />
                  </motion.span>
                  <span>
                    {sweetNote
                      ? 'Edit note'
                      : '+ Add a note'}
                  </span>
                </button>
                <AnimatePresence>
                  {isNoteOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-2"
                    >
                      <div className="relative rounded-2xl overflow-hidden p-3 sm:p-4 border border-[#E8DFD5]/70 bg-[#FAF6F0]/90 shadow-xs">
                        {/* Organic deckled paper texture framing */}
                        <img
                          src="/assets/illustrations/paper_texture.png"
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none select-none mix-blend-multiply"
                        />
                        <textarea
                          id="sweet-note-input"
                          aria-label="Sweet note for each other"
                          value={sweetNote}
                          onChange={(e) => setSweetNote(e.target.value)}
                          rows={2}
                          maxLength={280}
                          placeholder="A note, reminder, or inside joke..."
                          className="w-full p-1.5 text-[#2B2420] placeholder-[#766B65]/70 bg-transparent focus:outline-none font-handwriting resize-none relative z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 rounded-lg"
                          style={{ fontSize: '18px', lineHeight: '1.6', letterSpacing: '0.01em' }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            </motion.form>
          ) : isTicketLoading ? (
            <motion.div
              key="ticket-loading-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DFD5] p-8 sm:p-14 shadow-[0_1px_2px_rgba(43,36,32,0.04),_0_8px_24px_rgba(43,36,32,0.07)] paper-edge flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto w-full my-8"
            >
              <div className="w-8 h-8 rounded-full border-2 border-[#C67B5C] border-t-transparent animate-spin" />
              <div className="space-y-1">
                <p className="font-serif italic text-lg text-[#2B2420]">
                  Unfolding our date note...
                </p>
                <p className="text-xs text-[#766B65]">
                  Retrieving your sealed proposal from Firestore
                </p>
              </div>
            </motion.div>
          ) : ticketError || !ticketData ? (
            <motion.div
              key="ticket-error-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DFD5] p-8 sm:p-12 shadow-[0_1px_2px_rgba(43,36,32,0.04),_0_8px_24px_rgba(43,36,32,0.07)] paper-edge flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto w-full my-8"
            >
              <div className="w-12 h-12 rounded-full bg-[#FAF6F0] border border-[#E8DFD5] flex items-center justify-center text-[#C67B5C]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-xl sm:text-2xl text-[#2B2420]">
                  Note not found
                </h2>
                <p className="text-xs sm:text-sm text-[#766B65]">
                  {ticketError || 'This proposal note could not be found. It may have been removed or moved to history.'}
                </p>
              </div>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  id="btn-error-new-note"
                  onClick={handleResetForm}
                  className="min-h-[48px] px-5 py-2 rounded-full bg-[#C67B5C] text-white text-xs font-semibold hover:bg-[#B3694C] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
                >
                  Write a new note
                </button>
                <button
                  type="button"
                  id="btn-error-view-dashboard"
                  onClick={() => {
                    window.location.hash = 'dashboard';
                    setActiveTicketId(null);
                    setCurrentPath('/dashboard');
                  }}
                  className="min-h-[48px] px-5 py-2 rounded-full bg-white text-[#766B65] hover:text-[#2B2420] border border-[#E8DFD5] text-xs font-medium hover:bg-[#FAF6F0] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
                >
                  View shared proposals
                </button>
              </div>
            </motion.div>
          ) : (
            <InteractiveTicket
              ticketId={activeTicketId || ticketData.id}
              date={ticketData.date || date}
              time={ticketData.time || time}
              proposedBy={ticketData.proposedBy ?? proposedBy}
              budget={ticketData.budget ?? budget}
              hangout={
                ticketData.hangoutType ||
                (ticketData as any).hangout ||
                (selectedHangouts.length > 0 ? selectedHangouts.join(' • ') : 'You surprise me')
              }
              hangouts={ticketData.hangouts || selectedHangouts}
              craving={
                ticketData.craving ||
                (selectedCravings.length > 0
                  ? selectedCravings.map((c) => (c === 'Other' && otherCraving ? otherCraving : c)).join(' • ')
                  : 'Whatever sounds good to you')
              }
              cravings={
                ticketData.cravings ||
                selectedCravings.map((c) => (c === 'Other' && otherCraving ? otherCraving : c))
              }
              otherCraving={otherCraving}
              vibe={ticketData.vibe ?? vibe}
              location={ticketData.location || location}
              sweetNote={ticketData.sweetNote ?? sweetNote}
              onReset={handleResetForm}
              onEdit={handleEditDetails}
            />
          )}
        </AnimatePresence>

        {/* Tactile Wax Seal Press-and-Hold CTA */}
        {!isViewingTicket && (
          <PressToSealCTA
            isSubmitting={isSubmitting}
            onComplete={handleSubmit}
            label="Seal this date for us ♡"
          />
        )}
      </main>
    </div>
  );
}
