import { z } from "zod";

const year = z.number().int().min(-5000).max(3000).nullable().optional();
/** Optional text; empty strings are stored as NULL. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

export const createTreeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: optionalText(200),
  subtitle: optionalText(300),
  lineage: z.enum(["PATRILINEAL", "MATRILINEAL"]).default("PATRILINEAL"),
});

export const updateTreeSchema = createTreeSchema.partial().extend({
  rootMemberId: z.string().nullable().optional(),
  settings: z
    .object({ showFemales: z.boolean().optional(), seed: z.number().int().optional() })
    .nullable()
    .optional(),
});

export const memberFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  laqab: optionalText(120),
  gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).default("MALE"),
  birthYear: year,
  deathYear: year,
  isDeceased: z.boolean().optional(),
  birthOrder: z.number().int().min(0).max(1000).optional(),
  notes: optionalText(2000),
  fatherId: z.string().nullable().optional(),
  motherId: z.string().nullable().optional(),
});

export const createMemberSchema = memberFieldsSchema.extend({
  /** Also create a marriage with this existing member. */
  spouseOfId: z.string().nullable().optional(),
});

export const updateMemberSchema = memberFieldsSchema.partial();

export const createMarriageSchema = z.object({
  spouseAId: z.string(),
  spouseBId: z.string(),
  startYear: year,
  endYear: year,
});

export type CreateTreeInput = z.infer<typeof createTreeSchema>;
export type UpdateTreeInput = z.infer<typeof updateTreeSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type CreateMarriageInput = z.infer<typeof createMarriageSchema>;
