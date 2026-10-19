import type { PaperSize } from "./paper";
// Plain data-transfer types shared by the API, the editor and the layout
// engine. They mirror the Prisma models but are free of Prisma runtime types
// so they can be used in client components.

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type Lineage = "PATRILINEAL" | "MATRILINEAL";

export interface MemberDTO {
  id: string;
  name: string;
  laqab: string | null;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  isDeceased: boolean;
  birthOrder: number;
  generation: number;
  notes: string | null;
  fatherId: string | null;
  motherId: string | null;
}

export interface MarriageDTO {
  id: string;
  spouseAId: string;
  spouseBId: string;
  startYear: number | null;
  endYear: number | null;
}

export type ThemePreset = "refined" | "luxe" | "heritage" | "classic" | "silver-gold" | "emerald" | "mono";

/** User-customisable poster styling, stored in FamilyTree.settings.theme. */
export interface PosterTheme {
  preset: ThemePreset;
  /** Colour person nodes by generation band, or by gender. */
  colorBy: "generation" | "gender";
  male: string;
  female: string;
  /** Frame colour of the ancestral (trunk) badges. */
  ancestor: string;
  branch: string;
  background: "parchment" | "white";
  /** Metallic gradients on nodes (silver / gold look). */
  metallic: boolean;
  /** "auto": leaves for a small canopy, ovals for a large one (see AUTO_LEAF_LIMIT). */
  nodeShape: "auto" | "leaf" | "circle" | "oval";
  labelMode: "name" | "withFather";
  showYears: boolean;
  /** Spouses on the branch: each wife a man had children with on his branch, her children growing from her (see LayoutOptions.motherNames). */
  motherNames: boolean;
  /** Ancestors carved into the bark, or stacked as framed badges. */
  trunkStyle: "carved" | "badges";
  /** How the ancient lineage below the trunk (the foundation) is drawn: see src/lib/layout/soil. */
  soilStyle: "column" | "spine" | "banner" | "pedestal" | "paragraph";
  /** Rim colour of name roundels. */
  nodeRim: string;
  /** "بسم الله الرحمن الرحيم" header. */
  bismillah: boolean;
  /** Corner medallion with Al-Hujurat 49:13. */
  verse: boolean;
  /** Corner medallion with the hadith on learning one's lineage. */
  hadith: boolean;
  /** Use the frame artwork (public/poster-frame.jpg or .png, made in Canva) as the background. */
  frame: boolean;
  /** Daughters as capsules even when sons are leaves. */
  femaleCapsule: boolean;
  /**
   * Colour each major lineage's branches (and its members' rims) with one
   * muted colour, carried through all its descendants.
   */
  branchColors: boolean;
}

export interface PosterSettings {
  showFemales?: boolean;
  /** Show one branch only: this member, their ancestors and descendants. */
  focusId?: string | null;
  /**
   * Primary lineage: this member's branch is placed at the centre of the
   * canopy (straight above the trunk), its brothers to either side.
   */
  centerBranchId?: string | null;
  /**
   * People (usually daughters) whose families the poster also shows: the
   * husband's name with hers, and their children and descendants drawn from
   * her on dotted lines, as relatives outside the lineage.
   */
  familiesThrough?: string[];
  /** Printed size the poster is designed for (legibility is judged at it). Default A2. */
  posterSize?: PaperSize;
  seed?: number;
  theme?: Partial<PosterTheme>;
}

export interface TreeDTO {
  id: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  lineage: Lineage;
  rootMemberId: string | null;
  /**
   * Where the canopy starts (the branching ancestor). Everyone on the path
   * from the root to this member forms the trunk. Null = automatic.
   */
  crownBaseId: string | null;
  /** First ancestor on the trunk; older ancestors are inscribed in the soil. Null = automatic. */
  trunkStartId: string | null;
  /** Verbatim soil inscription overriding the generated lineage text. */
  soilText: string | null;
  settings: PosterSettings | null;
  members: MemberDTO[];
  marriages: MarriageDTO[];
  sources: SourceDTO[];
  citations: CitationDTO[];
  media: MediaDTO[];
  /**
   * The tree's version on the server (its last change, as an ISO time).
   * Sent back with every change so a change made from a stale copy (another
   * tab) is refused instead of silently overwriting. Absent in the demo.
   */
  version?: string;
}

/** Where facts come from: a register, a book, a family document. */
export interface SourceDTO {
  id: string;
  title: string;
  author: string | null;
  publication: string | null;
  notes: string | null;
}

/** A source cited for a person, optionally for one event and a page. */
export interface CitationDTO {
  id: string;
  sourceId: string;
  memberId: string;
  /** GEDCOM event tag: "BIRT", "DEAT", "MARR" …; null for the person in general. */
  eventType: string | null;
  page: string | null;
}

/** A photo or document attached to a person or to a source. */
export interface MediaDTO {
  id: string;
  memberId: string | null;
  sourceId: string | null;
  /** /api/media/blob/<sha256> for uploads, a data: URL in the demo, or the path a GEDCOM file recorded. */
  url: string;
  caption: string | null;
  fileType: string | null;
}

export interface TreeSummary {
  id: string;
  name: string;
  title: string | null;
  memberCount: number;
  updatedAt: string;
}
