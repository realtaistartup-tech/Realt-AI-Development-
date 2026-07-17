import { z } from "zod";

import type { PriorityConfidence } from "@/types";

const MAX_LIST_ITEMS = 10;
const MAX_TAG_LENGTH = 60;

const tagSchema = z.string().trim().min(1).max(MAX_TAG_LENGTH);

export const priorityWeightSchema = z.object({
  category: z.enum(["budget", "commute", "space", "safety", "schools", "lifestyle"]),
  importance: z.number().int().min(1).max(5),
});

export const userPrioritiesSchema = z
  .object({
    budgetMin: z.number().nonnegative().max(50_000_000),
    budgetMax: z.number().positive().max(50_000_000),
    commuteMaxMinutes: z.number().int().positive().max(240),
    commuteMode: z.enum(["drive", "transit", "walk", "bike"]),
    minBedrooms: z.number().int().min(0).max(10),
    minBathrooms: z.number().min(0).max(10),
    mustHaves: z.array(tagSchema).max(MAX_LIST_ITEMS),
    dealBreakers: z.array(tagSchema).max(MAX_LIST_ITEMS),
    lifestyleTags: z.array(tagSchema).max(MAX_LIST_ITEMS),
    weights: z.array(priorityWeightSchema).max(6),
  })
  .refine((data) => data.budgetMin <= data.budgetMax, {
    message: "budgetMin must not exceed budgetMax",
    path: ["budgetMin"],
  });

export type UserPrioritiesInput = z.infer<typeof userPrioritiesSchema>;

export const priorityConfidenceSchema: z.ZodType<PriorityConfidence> = z.object({
  budget: z.boolean(),
  commute: z.boolean(),
  space: z.boolean(),
  weights: z.boolean(),
});

export const priorityIntakeRequestSchema = z.object({
  answers: z
    .string()
    .trim()
    .min(1, "Please describe what you're looking for.")
    .max(4000, "Please keep your answer under 4000 characters."),
});

export type PriorityIntakeRequest = z.infer<typeof priorityIntakeRequestSchema>;

export const recommendationRequestSchema = z.object({
  priorities: userPrioritiesSchema,
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const saveSearchRequestSchema = z.object({
  priorities: userPrioritiesSchema,
});

export type SaveSearchRequest = z.infer<typeof saveSearchRequestSchema>;

export const mockSignInRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export type MockSignInRequest = z.infer<typeof mockSignInRequestSchema>;
