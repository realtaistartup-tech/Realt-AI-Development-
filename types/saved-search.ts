import type { UserPriorities } from "./priorities";

export interface SavedSearch {
  id: string;
  accountId: string;
  priorities: UserPriorities;
  createdAt: string;
}
