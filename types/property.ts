import type { CommuteMode } from "./priorities";

export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
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
}
