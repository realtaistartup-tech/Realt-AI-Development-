import { MOCK_PROPERTIES } from "@/lib/mock-properties";
import type { Property } from "@/types";
import type { PropertyRepository } from "../types";

/**
 * Wraps the static mock dataset behind the same interface a real listings
 * database would implement, so the route handler that calls
 * `getPropertyRepository()` doesn't change when a real source is connected.
 */
export class MockPropertyRepository implements PropertyRepository {
  async listAll(): Promise<Property[]> {
    return MOCK_PROPERTIES;
  }
}
