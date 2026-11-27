import type { CommuteMode, HousingIntent } from "./priorities";

export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  /** SEK */
  price: number;
  listingType?: HousingIntent;
  bedrooms: number;
  bathrooms: number;
  /** Square meters */
  areaSqm: number;
  commuteMinutesByMode: Partial<Record<CommuteMode, number>>;
  amenities: string[];
  lifestyleTags: string[];
  yearBuilt: number;
  /** 0-100, higher is safer */
  neighborhoodSafetyScore: number;
  /** 0-10 */
  schoolRating: number;
  imageUrl: string;
  description: string;
  /** Who shows the home: a real-estate agency (e.g. "Svensk Fastighetsförmedling"), a landlord or a rental site. */
  agentName?: string;
  agentKind?: "broker" | "landlord" | "rentalSite";
  /** The agency's or rental site's logo, only when a data agreement allows showing it. */
  agentLogoUrl?: string;
  /** Link to the original listing, when a real listing is connected. */
  listingUrl?: string;
} 
