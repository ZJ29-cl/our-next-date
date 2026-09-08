/**
 * Client-side storage layer — replaces Firebase/Firestore entirely.
 *
 * Persistence: localStorage under `our-next-date:proposals`
 * Sharing:     Full ticket payload encoded as base64 JSON in the share URL
 *              (?share=<base64>) so the recipient's device can decode it
 *              without any backend lookup.
 */

import { HangoutRequest } from '../types';

const STORAGE_KEY = 'our-next-date:proposals';

// ---------------------------------------------------------------------------
// localStorage CRUD
// ---------------------------------------------------------------------------

export function getProposals(): HangoutRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HangoutRequest[];
  } catch {
    return [];
  }
}

export function saveProposal(ticket: HangoutRequest): void {
  const existing = getProposals();
  const updated = [ticket, ...existing.filter((t) => t.id !== ticket.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateProposal(id: string, patch: Partial<HangoutRequest>): HangoutRequest[] {
  const existing = getProposals();
  const updated = existing.map((t) => (t.id === id ? { ...t, ...patch } : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteProposal(id: string): HangoutRequest[] {
  const existing = getProposals();
  const updated = existing.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getProposalById(id: string): HangoutRequest | null {
  return getProposals().find((t) => t.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// URL share encoding / decoding
// ---------------------------------------------------------------------------

/**
 * Encode a ticket as a base64 URL-safe string for embedding in a share link.
 * Uses encodeURIComponent + btoa to handle non-ASCII characters safely.
 */
export function encodeTicketForUrl(ticket: HangoutRequest): string {
  try {
    const json = JSON.stringify(ticket);
    // encodeURIComponent handles multi-byte chars; btoa handles the result
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

/**
 * Decode a base64 share param back into a ticket object.
 * Returns null if the string is malformed or the resulting object is invalid.
 */
export function decodeTicketFromUrl(encoded: string): HangoutRequest | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json) as HangoutRequest;
    // Minimal validation: must have at least a date field
    if (!parsed || typeof parsed.date !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL for a sealed ticket.
 * Format: <origin>/ticket/<id>?share=<base64>
 * The `?share=` param carries all the ticket data so the recipient's device
 * can render the ticket without any backend lookup.
 */
export function buildShareUrl(ticket: HangoutRequest): string {
  if (typeof window === 'undefined') return '';
  const encoded = encodeTicketForUrl(ticket);
  return `${window.location.origin}/ticket/${ticket.id}${encoded ? `?share=${encoded}` : ''}`;
}

/**
 * Read the `?share=` param from the current URL and decode it.
 * Returns null if the param is absent or malformed.
 */
export function readShareParamFromUrl(): HangoutRequest | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('share');
  if (!encoded) return null;
  return decodeTicketFromUrl(encoded);
}
