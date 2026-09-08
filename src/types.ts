export type PlaceCategory =
  | 'Café'
  | 'Restaurant'
  | 'Bar & Lounge'
  | 'Park & Outdoor'
  | 'Cinema & Shows'
  | 'Art & Workshop'
  | 'Dessert & Bakery'
  | 'Game Night'
  | 'Live Music'
  | 'Road Trip'
  | 'Other';

export interface LocationData {
  placeName: string;
  category: PlaceCategory;
  categories?: PlaceCategory[];
  locationLink?: string;
  imageUrls?: string[];
  address?: string; // backwards compatibility
  lat?: number;
  lng?: number;
}

export interface HangoutRequest {
  id: string; // always present; generated locally via crypto.randomUUID()
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  hangoutType: string;
  hangouts?: string[];
  craving: string;
  cravings?: string[];
  location: LocationData;
  vibe?: 'Just hang out' | 'Keep it cozy' | string;
  budget?: 'Keep it low-key' | 'Treat ourselves' | string;
  proposedBy?: 'Zakh' | 'Andrea' | string;
  sweetNote?: string;
  createdAt: string; // ISO date string — simple and localStorage-serializable
  status: 'pending' | 'confirmed' | 'completed';
}
