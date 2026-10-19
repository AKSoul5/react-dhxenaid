import { isPaperSize } from "./paper";
import { z } from "zod";
import { GEDCOM_MAX_CHARS } from "./gedcom";

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

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colours must be #rrggbb");

export const themeSchema = z
  .object({
    preset: z.enum(["refined", "luxe", "heritage", "classic", "silver-gold", "emerald", "mono"]),
    colorBy: z.enum(["generation", "gender"]),
    male: hexColor,
    female: hexColor,
    ancestor: hexColor,
    branch: hexColor,
    background: z.enum(["parchment", "white"]),
    metallic: z.boolean(),
    nodeShape: z.enum(["auto", "leaf", "circle", "oval"]),
    labelMode: z.enum(["name", "withFather"]),
    showYears: z.boolean(),
    motherNames: z.boolean(),
    trunkStyle: z.enum(["carved", "badges"]),
    spouseStyle: z.enum(["manuscript", "capsule", "inscribed"]),
    soilStyle: z.enum(["column", "spine", "banner", "pedestal", "paragraph"]),
    nodeRim: hexColor,
    bismillah: z.boolean(),
    verse: z.boolean(),
    hadith: z.boolean(),
    frame: z.boolean(),
    femaleCapsule: z.boolean(),
    branchColors: z.boolean(),
  })
  .partial();

export const updateTreeSchema = createTreeSchema.partial().extend({
  rootMemberId: z.string().nullable().optional(),
  crownBaseId: z.string().nullable().optional(),
  trunkStartId: z.string().nullable().optional(),
  soilText: optionalText(5000),
  settings: z
    .object({
      showFemales: z.boolean().optional(),
      posterSize: z.string().refine(isPaperSize, "Unknown paper size").optional(),
      focusId: z.string().nullable().optional(),
      centerBranchId: z.string().nullable().optional(),
      familiesThrough: z.array(z.string()).max(1000).optional(),
      hiddenIds: z.array(z.string()).max(1000).optional(),
      seed: z.number().int().optional(),
      theme: themeSchema.optional(),
      pinned: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export const importNasabSchema = z.object({
  /** One nasab per line, newest name first: "أحمد بن نوفل بن …". */
  text: z.string().trim().min(1, "Paste at least one nasab").max(50_000),
});

export const importGedcomSchema = z.object({
  /** The text of a GEDCOM 5.5.1 file (decoded in the browser). */
  text: z.string().min(1, "The file is empty").max(GEDCOM_MAX_CHARS, "The file is too large (over 20 MB)"),
});

export const undoImportSchema = z.object({
  memberIds: z.array(z.string()).max(50_000),
  marriageIds: z.array(z.string()).max(50_000),
  sourceIds: z.array(z.string()).max(50_000).default([]),
  citationIds: z.array(z.string()).max(200_000).default([]),
  mediaIds: z.array(z.string()).max(200_000).default([]),
  restore: z.array(z.object({ id: z.string(), fatherId: z.string().nullable(), motherId: z.string().nullable() })).max(50_000),
  rootMemberId: z.string().nullable(),
});

const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const sourceFields = z.object({
  title: z.string().trim().min(1, "A source needs a title").max(300),
  author: nullableText(200),
  publication: nullableText(300),
  notes: nullableText(2000),
});
export const createSourceSchema = sourceFields.partial({ author: true, publication: true, notes: true });
export const updateSourceSchema = sourceFields.partial();
export const mergeSourcesSchema = z.object({
  /** The source that stays; the one in the URL is merged into it and removed. */
  intoId: z.string().min(1),
});

export const citationFields = z.object({
  /** GEDCOM event tag ("BIRT", "DEAT", "MARR" …), or null for the person in general. */
  eventType: z.string().trim().toUpperCase().regex(/^[A-Z_]{3,15}$/, "Unknown event").nullable(),
  page: nullableText(300),
});
export const createCitationSchema = citationFields
  .partial()
  .extend({ sourceId: z.string(), memberId: z.string() });

/** Any URL or path except a data: URL: uploaded files go to /api/media/blob first. */
const mediaUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((u) => !/^data:/i.test(u), "Upload the file first; the tree stores its URL")
  .refine((u) => !/^\s*javascript:/i.test(u), "Not a file URL");
export const mediaFields = z.object({
  url: mediaUrl,
  caption: nullableText(500),
  fileType: z.string().trim().max(100).nullable(),
});
export const createMediaSchema = mediaFields
  .partial({ caption: true, fileType: true })
  .extend({ memberId: z.string().nullable().optional(), sourceId: z.string().nullable().optional() })
  .refine((m) => !!m.memberId || !!m.sourceId, "A photo or document belongs to a person or a source");
export const updateMediaSchema = mediaFields.partial();

/**
 * A whole tree, as the editor holds it, to put back (undo/redo). Fields are
 * checked like the single-member routes; the tree as a whole (references,
 * cycles) by snapshotError.
 */
export const restoreTreeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().max(200).nullable(),
  subtitle: z.string().max(300).nullable(),
  lineage: z.enum(["PATRILINEAL", "MATRILINEAL"]),
  rootMemberId: z.string().nullable(),
  crownBaseId: z.string().nullable(),
  trunkStartId: z.string().nullable(),
  soilText: z.string().max(5000).nullable(),
  settings: updateTreeSchema.shape.settings.unwrap(),
  members: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().trim().min(1).max(120),
        laqab: z.string().max(120).nullable(),
        gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
        birthYear: z.number().int().min(-5000).max(3000).nullable(),
        deathYear: z.number().int().min(-5000).max(3000).nullable(),
        isDeceased: z.boolean(),
        birthOrder: z.number().int().min(0).max(100_000),
        generation: z.number().int(),
        notes: z.string().max(2000).nullable(),
        fatherId: z.string().nullable(),
        motherId: z.string().nullable(),
      }),
    )
    .max(50_000),
  marriages: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        spouseAId: z.string(),
        spouseBId: z.string(),
        startYear: z.number().int().min(-5000).max(3000).nullable(),
        endYear: z.number().int().min(-5000).max(3000).nullable(),
      }),
    )
    .max(50_000),
  sources: z.array(z.object({ id: z.string().min(1).max(64) }).merge(sourceFields)).max(50_000),
  citations: z.array(z.object({ id: z.string().min(1).max(64), sourceId: z.string(), memberId: z.string() }).merge(citationFields)).max(200_000),
  media: z
    .array(
      z.object({ id: z.string().min(1).max(64), memberId: z.string().nullable(), sourceId: z.string().nullable() }).merge(mediaFields),
    )
    .max(200_000),
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
  /** Add the new member as this existing member's father (or mother, for a woman): the tree grows upward. */
  parentOfId: z.string().nullable().optional(),
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
export type ImportNasabInput = z.infer<typeof importNasabSchema>;
export type ImportGedcomInput = z.infer<typeof importGedcomSchema>;
export type UndoImportInput = z.infer<typeof undoImportSchema>;
export type RestoreTreeInput = z.infer<typeof restoreTreeSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type CreateCitationInput = z.infer<typeof createCitationSchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
