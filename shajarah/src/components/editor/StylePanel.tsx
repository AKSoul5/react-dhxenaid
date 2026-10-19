"use client";

import { SOIL_STYLES, SOIL_STYLE_ORDER } from "@/lib/layout/soil";
import { useState } from "react";
import { THEME_PRESETS } from "@/lib/theme";
import type { PosterTheme, ThemePreset } from "@/lib/types";

interface Props {
  theme: PosterTheme;
  onChange: (theme: Partial<PosterTheme>) => void;
  soilText: string | null;
  onSoilTextChange: (text: string | null) => void;
  /** Whether the frame artwork (public/poster-frame.jpg or .png) was found. */
  frameAvailable?: boolean;
}

/** Theme presets, colour pickers, node shape and label options. */
export function StylePanel({ theme, onChange, soilText, onSoilTextChange, frameAvailable = true }: Props) {
  const [open, setOpen] = useState(false);
  const [soilDraft, setSoilDraft] = useState(soilText ?? "");
  const color = (key: "male" | "female" | "ancestor" | "branch", label: string) => (
    <label className="flex items-center justify-between gap-2 text-sm">
      {label}
      <input
        type="color"
        className="h-7 w-12 cursor-pointer rounded border border-parchment-300"
        value={theme[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="relative">
      <button type="button" className="btn-outline" onClick={() => setOpen((o) => !o)}>
        🎨 Style ▾
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 max-h-[80vh] w-80 space-y-4 overflow-auto rounded-lg border border-parchment-300 bg-white p-4 shadow-xl">
          <section>
            <h4 className="section-title">Theme</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((p) => {
                const t = THEME_PRESETS[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ ...t, preset: p })}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs ${
                      theme.preset === p ? "border-bark-700 bg-parchment-100" : "border-parchment-300"
                    }`}
                  >
                    <span className="flex">
                      <span className="h-4 w-4 rounded-full border border-black/20" style={{ background: t.male }} />
                      <span className="-ms-1.5 h-4 w-4 rounded-full border border-black/20" style={{ background: t.female }} />
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Colours</h4>
            {color("male", "Male")}
            {color("female", "Female")}
            {color("ancestor", "Trunk medallions")}
            {color("branch", "Branches & trunk")}
            <label className="flex items-center justify-between text-sm">
              Colour nodes by
              <select className="input w-36" value={theme.colorBy} onChange={(e) => onChange({ colorBy: e.target.value as PosterTheme["colorBy"] })}>
                <option value="gender">Gender</option>
                <option value="generation">Generation</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.metallic} onChange={(e) => onChange({ metallic: e.target.checked })} />
              Metallic finish
            </label>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Nodes & labels</h4>
            <label className="flex items-center justify-between text-sm">
              Shape
              <select className="input w-36" value={theme.nodeShape} onChange={(e) => onChange({ nodeShape: e.target.value as PosterTheme["nodeShape"] })}>
                <option value="auto">Auto</option>
                <option value="leaf">Leaves</option>
                <option value="circle">Circular badges</option>
                <option value="oval">Oval medallions</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Label
              <select className="input w-36" value={theme.labelMode} onChange={(e) => onChange({ labelMode: e.target.value as PosterTheme["labelMode"] })}>
                <option value="name">First name</option>
                <option value="withFather">Name بن father</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Trunk ancestors
              <select className="input w-36" value={theme.trunkStyle} onChange={(e) => onChange({ trunkStyle: e.target.value as PosterTheme["trunkStyle"] })}>
                <option value="carved">Carved in bark</option>
                <option value="badges">Framed badges</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title="How a wife's (or husband's) name is set on the branch, when spouses are shown">
              Spouses
              <select className="input w-36" value={theme.spouseStyle} onChange={(e) => onChange({ spouseStyle: e.target.value as PosterTheme["spouseStyle"] })}>
                <option value="manuscript">Manuscript cartouche</option>
                <option value="capsule">Soft capsule</option>
                <option value="inscribed">Inscribed, no box</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title="How the ancient lineage below the trunk is drawn">
              Foundation
              <select className="input w-36" value={theme.soilStyle} onChange={(e) => onChange({ soilStyle: e.target.value as PosterTheme["soilStyle"] })}>
                {SOIL_STYLE_ORDER.map((id) => (
                  <option key={id} value={id} title={SOIL_STYLES[id].description}>{SOIL_STYLES[id].label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Background
              <select className="input w-36" value={theme.background} onChange={(e) => onChange({ background: e.target.value as PosterTheme["background"] })}>
                <option value="parchment">Parchment</option>
                <option value="white">Plain white</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.showYears} onChange={(e) => onChange({ showYears: e.target.checked })} />
              Show birth / death years
            </label>
            <label className="flex items-center gap-2 text-sm" title="Each wife a man had children with is a name panel on his branch, and the children she bore him grow from it">
              <input type="checkbox" checked={theme.motherNames} onChange={(e) => onChange({ motherNames: e.target.checked })} />
              Show spouses on the branch
            </label>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Ornaments</h4>
            {(
              [
                ["frame", "Gold-foil frame & parchment (Canva artwork)"],
                ["femaleCapsule", "Daughters as gold capsules"],
                ["branchColors", "Colour each main branch (lineage colours)"],
                ["bismillah", "Basmala header ﷽"],
                ["verse", "Verse medallion (الحجرات ١٣)"],
                ["hadith", "Hadith medallion (تعلموا من أنسابكم)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={theme[key]} onChange={(e) => onChange({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
            {theme.frame && !frameAvailable && (
              <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Frame artwork not found. Save the Canva frame as{" "}
                <code>public/poster-frame.jpg</code> (or <code>.png</code>); until then the paper is plain.
              </p>
            )}
            <label className="flex items-center justify-between gap-2 text-sm">
              Roundel rim
              <input type="color" className="h-7 w-12 cursor-pointer rounded border border-parchment-300" value={theme.nodeRim} onChange={(e) => onChange({ nodeRim: e.target.value })} />
            </label>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Soil inscription</h4>
            <p className="text-xs text-gray-500">
              Leave empty to inscribe the ancestors older than the trunk. Or paste the lineage exactly as
              your source writes it.
            </p>
            <textarea
              className="input min-h-[70px] font-naskh text-base"
              dir="auto"
              value={soilDraft}
              onChange={(e) => setSoilDraft(e.target.value)}
              onBlur={() => {
                const next = soilDraft.trim() || null;
                if (next !== (soilText ?? null)) onSoilTextChange(next);
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
