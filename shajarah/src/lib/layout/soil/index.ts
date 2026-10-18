// Soil styles: the registry. To add a style, write a SoilStyleDef (see
// types.ts and column.ts) and list it here; the theme setting, the Style
// panel and the renderer pick it up from this list.

import { banner } from "./banner";
import { column } from "./column";
import { paragraph } from "./paragraph";
import { pedestal } from "./pedestal";
import { spine } from "./spine";
import type { SoilStyleDef, SoilStyleId } from "./types";

export * from "./types";

export const SOIL_STYLES: Record<SoilStyleId, SoilStyleDef> = { column, spine, banner, pedestal, paragraph };

/** In the order the Style panel offers them. */
export const SOIL_STYLE_ORDER: SoilStyleId[] = ["column", "spine", "banner", "pedestal", "paragraph"];

/** The style for a setting; an unknown or missing one is the inscribed panel. */
export const soilStyle = (id: string | null | undefined): SoilStyleDef => SOIL_STYLES[id as SoilStyleId] ?? paragraph;
