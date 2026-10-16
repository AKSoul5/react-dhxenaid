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

export type ThemePreset = "classic" | "silver-gold" | "emerald" | "mono";

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
  nodeShape: "leaf" | "circle" | "oval";
  labelMode: "name" | "withFather";
  showYears: boolean;
  /** Ancestors carved into the bark, or stacked as framed badges. */
  trunkStyle: "carved" | "badges";
}

export interface PosterSettings {
  showFemales?: boolean;
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
}

export interface TreeSummary {
  id: string;
  name: string;
  title: string | null;
  memberCount: number;
  updatedAt: string;
}
