import { SOIL_STYLES, type SoilStyleId } from "@/lib/layout/soil";
import { TreeWorkspace } from "@/components/editor/TreeWorkspace";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliFilledTree, kalaliTree } from "@/lib/samples/kalali";
import { denseFamily, marriagesFamily, multiMarriageFamily, namesFamily, smallFamily } from "@/lib/samples/fixtures";

const SAMPLES = {
  kalali: kalaliTree, "kalali-filled": kalaliFilledTree, small: smallFamily, marriages: marriagesFamily, names: namesFamily,
  dense: denseFamily, multi: multiMarriageFamily,
  // ~500 people with daughters, for checking dense layouts and the size warning
  huge: () => {
    const t = generateSampleTree(5, 5000);
    return { ...t, id: "huge", settings: { ...t.settings, showFemales: true } };
  },
};

export const metadata = { title: "Demo — Shajarah" };

/**
 * Fully working editor backed by an in-memory repository (no database).
 * /demo?sample=kalali loads the Al-Kalali lineage (آدم → أحمد بن نوفل);
 * kalali-filled: its trunk from شعلان, every generation to أحمد filled to 6–7 (test data);
 * small, marriages, names, dense, multi and huge load the validation families.
 * &colors=1 turns on lineage colours, &poster=A1 sets the poster size and
 * &soil=column|spine|banner|pedestal|paragraph the foundation style, so
 * variants can be compared on identical data. &focus=<id or name> draws one
 * branch (a branch poster).
 */
export default function DemoPage({ searchParams }: { searchParams: { sample?: string; colors?: string; poster?: string; soil?: string; focus?: string } }) {
  const make = SAMPLES[searchParams.sample as keyof typeof SAMPLES];
  const base = make ? make() : generateSampleTree();
  const posterSize = ["A3", "A2", "A1", "A0", "2A0"].includes(searchParams.poster ?? "")
    ? (searchParams.poster as "A3" | "A2" | "A1" | "A0" | "2A0")
    : undefined;
  // &focus=<member id or name>: a branch poster (a name shared by several
  // people picks the canopy base if it is one of them, else the eldest)
  const named = searchParams.focus
    ? base.members.filter((m) => m.id === searchParams.focus || m.name === searchParams.focus)
    : [];
  const focus = named.find((m) => m.id === base.crownBaseId) ?? [...named].sort((a, b) => a.generation - b.generation)[0];
  const tree = {
    ...base,
    settings: {
      ...base.settings,
      ...(posterSize ? { posterSize } : {}),
      ...(focus ? { focusId: focus.id } : {}),
      theme: {
        ...base.settings?.theme,
        ...(searchParams.colors === "1" ? { branchColors: true } : {}),
        ...(searchParams.soil && searchParams.soil in SOIL_STYLES ? { soilStyle: searchParams.soil as SoilStyleId } : {}),
      },
    },
  };
  return <TreeWorkspace key={tree.id} initialTree={tree} mode="local" />;
}
