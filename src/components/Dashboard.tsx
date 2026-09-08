import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  ExternalLink,
  ArrowLeft,
  Trash2,
  Check,
  Compass,
  User,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Ticket,
} from 'lucide-react';
import { HangoutRequest } from '../types';
import { prefersReducedMotion } from '../lib/motion';
import { formatDateShort, formatTimeFriendly, isPastDateTime } from '../lib/dateTime';
import {
  getProposals,
  updateProposal,
  deleteProposal,
} from '../lib/storage';

/**
 * Dashboard: Private Shared Note for the Two of Us
 * Built around density, personal warmth, and screenshot-readiness.
 * Includes Upcoming / History segmented separation and compact archival records.
 * Reads and writes to localStorage — no backend required.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

export const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<HangoutRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [filterProposer, setFilterProposer] = useState<string>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Load from localStorage and subscribe to cross-tab storage events
  useEffect(() => {
    const load = () => {
      try {
        setRequests(getProposals());
        setError(null);
      } catch (err) {
        console.error('Error reading proposals from storage:', err);
        setError('Could not read proposals from this device.');
      } finally {
        setLoading(false);
      }
    };

    load();

    // Keep dashboard in sync when another tab creates/updates a proposal
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'our-next-date:proposals') {
        load();
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  const showToast = (msg: string, duration = 2500) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), duration);
  };

  const handleToggleStatus = (item: HangoutRequest) => {
    if (!item.id) return;
    try {
      const nextStatus = item.status === 'confirmed' ? 'pending' : 'confirmed';
      const updated = updateProposal(item.id, { status: nextStatus });
      setRequests(updated);
      showToast(`Marked as ${nextStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Could not update status. Please try again.', 4000);
    }
  };

  const handleMarkCompleted = (item: HangoutRequest) => {
    if (!item.id) return;
    try {
      const updated = updateProposal(item.id, { status: 'completed' });
      setRequests(updated);
      showToast('Date moved to History \u2661');
    } catch (err) {
      console.error('Error marking completed:', err);
      showToast('Could not move to History.', 4000);
    }
  };

  const handleReopenProposal = (item: HangoutRequest) => {
    if (!item.id) return;
    try {
      const updated = updateProposal(item.id, { status: 'confirmed' });
      setRequests(updated);
      showToast('Date restored to Upcoming');
    } catch (err) {
      console.error('Error reopening proposal:', err);
      showToast('Could not restore proposal.', 4000);
    }
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    try {
      const updated = deleteProposal(id);
      setRequests(updated);
      showToast('Proposal removed');
    } catch (err) {
      console.error('Error deleting proposal:', err);
      showToast('Could not remove proposal. Please try again.', 4000);
    }
  };

  const isHistoryItem = (item: HangoutRequest): boolean => {
    return item.status === 'completed' || isPastDateTime(item.date, item.time);
  };

  const upcomingList = requests.filter((r) => !isHistoryItem(r));
  const historyList = requests.filter((r) => isHistoryItem(r));

  const currentTabItems = activeTab === 'upcoming' ? upcomingList : historyList;

  const displayedItems = currentTabItems.filter((r) => {
    if (filterProposer !== 'all' && (r.proposedBy?.trim() || '') !== filterProposer) {
      return false;
    }
    return true;
  });

  const uniqueProposers = Array.from(
    new Set(requests.map((r) => r.proposedBy?.trim()).filter(Boolean))
  ) as string[];

  return (
    <div
      id="dashboard-root"
      className="min-h-screen bg-[#FAF6F0] text-[#2B2420] antialiased flex justify-center stationery-texture selection:bg-[#E8C4B8] selection:text-[#2B2420]"
    >
      <div className="w-full max-w-2xl min-h-screen flex flex-col px-4 sm:px-6 pt-6 sm:pt-10 pb-24">
        {/* Minimal, Intimate Header */}
        <header
          id="dashboard-header"
          className="pb-4 border-b border-[#E8DFD5] flex items-center justify-between gap-4 mb-5"
        >
          <div>
            <h1
              id="dashboard-title"
              className="text-2xl sm:text-3xl font-serif tracking-tight text-[#2B2420]"
            >
              Our Shared Dates
            </h1>
            <p className="text-xs text-[#766B65] pt-0.5">
              A private note between Zakh and Andrea
            </p>
          </div>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '';
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-xs font-medium text-[#766B65] hover:text-[#2B2420] transition-colors inline-flex items-center gap-1.5 min-h-[48px] px-3 rounded-full hover:bg-white border border-transparent hover:border-[#E8DFD5] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Propose a date</span>
          </a>
        </header>

        {/* Visible Feedback Toast Banner */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-4 px-4 py-2.5 rounded-xl bg-[#2B2420] text-[#FAF6F0] text-xs font-medium flex items-center justify-between shadow-md"
              role="status"
            >
              <span>{feedbackToast}</span>
              <button
                type="button"
                onClick={() => setFeedbackToast(null)}
                className="text-[#E8DFD5] hover:text-white text-xs ml-3"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Segmented Switch: Upcoming / History */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <div
            id="tab-segmented-control"
            className="inline-flex p-1 rounded-full bg-white border border-[#E8DFD5] shadow-xs"
            role="tablist"
            aria-label="Filter proposals by status"
          >
            <button
              type="button"
              id="tab-upcoming"
              role="tab"
              aria-selected={activeTab === 'upcoming'}
              onClick={() => setActiveTab('upcoming')}
              className={`relative flex items-center justify-center min-h-[48px] px-5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                activeTab === 'upcoming'
                  ? 'text-[#2B2420] font-semibold'
                  : 'text-[#766B65] hover:text-[#2B2420]'
              }`}
            >
              {activeTab === 'upcoming' && (
                <motion.div
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-[#FAF6F0] rounded-full border border-[#E8DFD5] shadow-xs -z-10"
                />
              )}
              <span>Upcoming</span>
              {upcomingList.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#C67B5C]/15 text-[#A8583A] font-semibold">
                  {upcomingList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-history"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`relative flex items-center justify-center min-h-[48px] px-5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none z-10 focus-visible:ring-2 focus-visible:ring-[#C67B5C] focus-visible:ring-offset-2 outline-none ${
                activeTab === 'history'
                  ? 'text-[#2B2420] font-semibold'
                  : 'text-[#766B65] hover:text-[#2B2420]'
              }`}
            >
              {activeTab === 'history' && (
                <motion.div
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-[#FAF6F0] rounded-full border border-[#E8DFD5] shadow-xs -z-10"
                />
              )}
              <span>History</span>
              {historyList.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#766B65]/15 text-[#766B65] font-semibold">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>

          {/* Proposer filter (if names exist) */}
          {uniqueProposers.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[#766B65]">
              <span>From:</span>
              <select
                id="select-filter-proposer"
                value={filterProposer}
                onChange={(e) => setFilterProposer(e.target.value)}
                className="bg-white border border-[#E8DFD5] rounded-xl px-2.5 py-2 text-xs text-[#2B2420] focus:outline-none focus:border-[#C67B5C] min-h-[44px]"
              >
                <option value="all">Both of us</option>
                {uniqueProposers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <p className="font-serif italic text-sm text-[#766B65] py-8">
            Opening notes...
          </p>
        )}

        {/* Error State */}
        {error && (
          <p className="text-xs text-[#C67B5C] py-4">{error}</p>
        )}

        {/* Genuinely Plain One-Sentence Empty State */}
        {!loading && !error && displayedItems.length === 0 && (
          <div className="py-12 text-center sm:text-left">
            <p className="font-serif italic text-base text-[#766B65]">
              {activeTab === 'upcoming'
                ? "No upcoming dates planned yet — propose one whenever you're ready."
                : 'No past dates in your history yet.'}
            </p>
          </div>
        )}

        {/* Cards Render */}
        <motion.div
          id="proposals-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {displayedItems.map((item) => {
              const isConfirmed = item.status === 'confirmed';
              const isCompleted = item.status === 'completed';
              const placeName =
                item.location?.placeName || item.location?.address || 'Surprise me';
              const directLink = item.location?.locationLink?.trim();
              const hasImages =
                item.location?.imageUrls && item.location.imageUrls.length > 0;
              const targetUrl =
                directLink ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  placeName
                )}`;

              // -------------------------------------------------------------
              // HISTORY TAB: Compact Archival Card Treatment
              // -------------------------------------------------------------
              if (activeTab === 'history') {
                return (
                  <motion.article
                    key={item.id}
                    id={`history-card-${item.id}`}
                    variants={cardVariants}
                    exit="exit"
                    layout={prefersReducedMotion() ? undefined : 'position'}
                    className="bg-white/80 hover:bg-white rounded-xl border border-[#E8DFD5] p-3.5 sm:p-4 shadow-2xs transition-colors flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <a
                          href={`/ticket/${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState(null, '', `/ticket/${item.id}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="font-serif text-base sm:text-lg text-[#2B2420] tracking-tight font-medium hover:text-[#A8583A] transition-colors cursor-pointer inline-flex items-center gap-2"
                        >
                          <span>{formatDateShort(item.date)}</span>
                          <span className="text-xs font-sans text-[#766B65]">
                            • {formatTimeFriendly(item.time)}
                          </span>
                        </a>
                        <div className="text-xs text-[#2B2420] flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#A8583A]">{placeName}</span>
                          <span className="text-[#E8DFD5]">•</span>
                          <span className="text-[#766B65]">{item.hangoutType}</span>
                          {item.proposedBy?.trim() && (
                            <>
                              <span className="text-[#E8DFD5]">•</span>
                              <span className="text-[#766B65]">by {item.proposedBy.trim()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#766B65]/10 text-[#766B65] font-medium shrink-0">
                        {isCompleted ? 'Done' : 'Past date'}
                      </span>
                    </div>

                    {item.sweetNote && (
                      <p className="font-handwriting text-sm text-[#A8583A] italic pl-1 border-l-2 border-[#E8DFD5]">
                        &ldquo;{item.sweetNote}&rdquo;
                      </p>
                    )}

                    {/* History Actions: View Ticket, Reopen or Remove */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#E8DFD5]/40 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/ticket/${item.id}`}
                          id={`btn-view-history-ticket-${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState(null, '', `/ticket/${item.id}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="text-[#A8583A] hover:text-[#2B2420] transition-colors inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 rounded-lg bg-[#FAF6F0] hover:bg-[#F3ECE4] border border-[#E8DFD5] cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
                          title="Open sealed ticket view"
                        >
                          <Ticket className="w-3.5 h-3.5 text-[#C67B5C]" />
                          <span>View Ticket</span>
                        </a>

                        <button
                          type="button"
                          id={`btn-reopen-${item.id}`}
                          onClick={() => handleReopenProposal(item)}
                          className="text-[#766B65] hover:text-[#2B2420] transition-colors flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
                          title="Move back to Upcoming dates"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#C67B5C]" />
                          <span className="hidden sm:inline">Reopen / Move to Upcoming</span>
                          <span className="sm:hidden">Reopen</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id={`btn-delete-history-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        className="text-[#766B65]/50 hover:text-red-700 transition-colors p-2 rounded cursor-pointer min-h-[44px] flex items-center gap-1 text-[11px]"
                        title="Remove from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </motion.article>
                );
              }

              // -------------------------------------------------------------
              // UPCOMING TAB: Full Interactive Date Note Card
              // -------------------------------------------------------------
              return (
                <motion.article
                  key={item.id}
                  id={`proposal-card-${item.id}`}
                  variants={cardVariants}
                  exit="exit"
                  layout={prefersReducedMotion() ? undefined : 'position'}
                  className="bg-white rounded-2xl border border-[#E8DFD5] shadow-[0_1px_3px_rgba(43,36,32,0.03)] overflow-hidden transition-all hover:border-[#C67B5C]/50"
                >
                  {/* Photo Hero Banner (when attached photos exist) */}
                  {hasImages && (
                    <div className="relative w-full bg-[#FAF6F0] border-b border-[#E8DFD5] flex gap-1.5 p-2 overflow-x-auto">
                      {item.location.imageUrls!.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative h-32 sm:h-36 flex-1 min-w-[140px] max-w-[240px] rounded-xl overflow-hidden border border-[#E8DFD5] bg-white group block shrink-0 shadow-2xs"
                        >
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                '/assets/illustrations/paper_texture.png';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Top Row: Date & Status Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <a
                          href={`/ticket/${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState(null, '', `/ticket/${item.id}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="font-serif text-lg sm:text-xl text-[#2B2420] tracking-tight hover:text-[#A8583A] transition-colors cursor-pointer block"
                        >
                          {formatDateShort(item.date)} at {formatTimeFriendly(item.time)}
                        </a>

                        {/* Metadata Line (Proposer & Budget) */}
                        <div className="flex items-center gap-2 text-xs text-[#766B65] flex-wrap">
                          {item.proposedBy?.trim() && (
                            <span className="inline-flex items-center gap-1 font-medium text-[#A8583A]">
                              <User className="w-3 h-3" />
                              <span>Proposed by {item.proposedBy.trim()}</span>
                            </span>
                          )}
                          {item.proposedBy?.trim() && item.budget && <span>•</span>}
                          {item.budget && (
                            <span className="inline-flex items-center gap-1">
                              <Compass className="w-3 h-3 text-[#C67B5C]" />
                              <span>{item.budget}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pill */}
                      <button
                        type="button"
                        id={`btn-toggle-status-${item.id}`}
                        onClick={() => handleToggleStatus(item)}
                        className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none ${
                          isConfirmed
                            ? 'bg-[#F3ECE4] text-[#2B2420] border-[#C67B5C]'
                            : 'bg-transparent text-[#766B65] border-[#E8DFD5] hover:border-[#C67B5C]'
                        }`}
                        title="Click to toggle status between Confirmed and Pending"
                      >
                        {isConfirmed && <Check className="w-3.5 h-3.5 text-[#C67B5C]" />}
                        <span>{isConfirmed ? 'Confirmed' : 'Pending'}</span>
                      </button>
                    </div>

                    {/* Vibe, Craving, Place Details */}
                    <div className="text-xs text-[#2B2420] space-y-1.5 pt-0.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-[#C67B5C]">
                          {item.hangoutType}
                        </span>
                        {item.craving && (
                          <>
                            <span className="text-[#E8DFD5]">•</span>
                            <span className="text-[#766B65]">{item.craving}</span>
                          </>
                        )}
                        {item.vibe && (
                          <>
                            <span className="text-[#E8DFD5]">•</span>
                            <span className="text-[#766B65]">{item.vibe}</span>
                          </>
                        )}
                      </div>

                      {/* Location Line */}
                      <div className="flex items-center gap-1.5 text-xs text-[#2B2420] pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C67B5C] shrink-0" />
                        <span className="font-medium truncate">{placeName}</span>
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#A8583A] hover:text-[#2B2420] inline-flex items-center ml-1 p-1 min-h-[36px] min-w-[36px] justify-center"
                          title="Open map link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Handwritten Personal Margin Note */}
                    {item.sweetNote && (
                      <div className="pt-2 pb-1 border-t border-[#E8DFD5]/60">
                        <p className="font-handwriting text-base sm:text-lg leading-snug pl-1 text-[#A8583A]">
                          &ldquo;{item.sweetNote}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Card Actions: View Ticket, Mark as Done & Delete */}
                    <div className="pt-2.5 flex items-center justify-between border-t border-[#E8DFD5]/40 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/ticket/${item.id}`}
                          id={`btn-view-ticket-${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState(null, '', `/ticket/${item.id}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="text-[#2B2420] hover:text-[#A8583A] text-xs font-semibold inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full bg-[#FAF6F0] hover:bg-[#F3ECE4] border border-[#E8DFD5] hover:border-[#C67B5C] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none shadow-2xs"
                          title="Open sealed ticket view"
                        >
                          <Ticket className="w-3.5 h-3.5 text-[#C67B5C]" />
                          <span>View Ticket</span>
                        </a>

                        <button
                          type="button"
                          id={`btn-mark-done-${item.id}`}
                          onClick={() => handleMarkCompleted(item)}
                          className="text-[#766B65] hover:text-[#2B2420] text-xs font-medium inline-flex items-center gap-1.5 min-h-[44px] px-2.5 rounded-lg hover:bg-[#FAF6F0] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C67B5C] outline-none"
                          title="Mark date as completed and move to History"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#C67B5C]" />
                          <span>Mark as Done</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id={`btn-delete-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        className="text-[#766B65]/60 hover:text-red-700 transition-colors p-2 rounded-lg cursor-pointer min-h-[44px] flex items-center gap-1 text-xs"
                        title="Delete proposal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
