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

export interface PosterSettings {
  showFemales?: boolean;
  seed?: number;
}

export interface TreeDTO {
  id: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  lineage: Lineage;
  rootMemberId: string | null;
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
