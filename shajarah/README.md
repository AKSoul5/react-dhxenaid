# شجرة · Shajarah — Family Tree Poster Generator

Enter a family (parents, children, spouses) and Shajarah grows it into an
ornamental, botanical nasab poster: the ancestral chain on the trunk, the
sons of the first branching ancestor as golden main limbs, and curved
tapered branches. **Every leaf is a person** with their name written on it:
green for sons, rose for daughters. Members with descendants sit at their
branch forks as generation-coloured tags. You can export it as
vector SVG or a high-DPI PDF/PNG for printing.

| Generated poster (demo data) | Al-Kalali lineage: soil, trunk, canopy | Editor |
| --- | --- | --- |
| ![poster](docs/demo-poster.jpg) | ![kalali](docs/kalali-tiers.jpg) | ![editor](docs/editor.jpg) |

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **SVG** rendering, **d3-hierarchy** for the tree model, **d3-zoom** for pan/zoom
- **Prisma 5** + **PostgreSQL** for relational family data
- **jsPDF** for print PDF export · **Vitest** for layout tests

## Getting started

```bash
cd shajarah
npm install                    # also copies the Amiri fonts and generates the Prisma client
docker compose up -d           # PostgreSQL 16 on localhost:5432 (or use your own server)
cp .env.example .env           # adjust DATABASE_URL if needed
npm run db:migrate             # applies prisma/migrations
npm run db:seed                # optional: a 321-member sample family + the Al-Kalali lineage
npm run dev                    # http://localhost:3000
```

The page at **`/demo`** works without a database. It runs the same editor
with an in-memory repository. **`/demo?sample=kalali`** loads the Al-Kalali
lineage (85 generations, آدم → أحمد بن نوفل).

## Entering a family quickly: paste a nasab

Click **بن…** in the member list and paste one lineage per line, newest name
first:

```
أحمد بن نوفل بن أحمد بن محمد بن سالم … بن شيث بن آدم عليه السلام
فاطمة بنت نوفل بن أحمد بن محمد
```

- Each line becomes a chain of fathers. "بنت" marks the first person as a
  daughter. Text in parentheses, such as «يريم (ذو رعين الأكبر)», and
  honorifics like «عليه السلام» are stored as the laqab.
- Matching uses spelling-tolerant names (أ/إ/ا, ة/ه, «عبد الله»/«عبدالله»).
  People already in the tree are reused, and new ones are added below or
  above them. A line can start mid-tree. At least two consecutive names
  must agree before a line joins, so a lone «محمد» never links strangers.
- A preview shows how many names are reused and how many are new. It warns
  when a line fits in two places equally well.

## The three tiers: soil, trunk, canopy

The ancestral chain is split into three tiers. You set the two boundaries
on any member's panel:

| Tier | Who | Drawn as | Set with |
| --- | --- | --- | --- |
| **Soil** | ancestors older than the trunk start (e.g. آدم … نصر) | the lineage inscribed in a gilt cartouche set in the soil, among the roots | 🪵 **Start the trunk here** → `FamilyTree.trunkStartId` |
| **Trunk** | trunk start … the canopy's father (e.g. عبد كلال الأصغر … سالم) | golden oval medallions up the trunk | — |
| **Canopy** | the canopy base and all descendants | Bézier branches, leaves / badges | 🌳 **Start the canopy here** → `FamilyTree.crownBaseId` |

- **Long trunks:** short trunks use one column of medallions. Longer ones
  grow taller, as the canopy gives up height, and then stagger into a
  two-column zigzag. The Al-Kalali trunk of 33 ancestors fits this way.
  Only beyond that do the oldest move into the soil.
- **Automatic mode:** without a trunk start, the nearest ~11 ancestors go
  on the trunk and the rest into the soil. Without a canopy base, the
  canopy starts at the first real fork.
- **Custom soil text:** to inscribe a lineage exactly as a source writes
  it, paste it under **Style → Soil inscription** (`FamilyTree.soilText`).
- **Laqabs** in the soil use the classical ornate brackets «يريم ﴿ذو رعين
  الأكبر﴾».
- **Side branches:** brothers of trunk ancestors grow as side branches with
  their own small canopy. Brothers without descendants become short stubs.

## The frame: Canva artwork + code-drawn tree (hybrid)

The poster has two layers:

1. **Frame artwork (Canva).** The gold-foil border, the corner arabesques
   and the parchment texture are a single image, `public/poster-frame.png`.
   It was designed in Canva and is drawn full-bleed behind everything.
2. **The tree (code).** The trunk, branches, name leaves, capsules,
   medallions, title and panels are computed and drawn as vector SVG on top
   of the frame, so they stay sharp and editable.

The frame is never a picture of a tree. All names come from the data.

**Adding the frame.** Export the frame page of the Canva design as a PNG
(4000×6000 or larger) and save it as `public/poster-frame.png`. The editor
checks for it on load. If the file is missing, the poster uses plain
parchment and **Style → Ornaments** shows a note. The poster is A-series
(1:√2), so the 2:3 artwork is stretched about 6% vertically.

**Keep-out zones.** With **Gold-foil frame** on, the layout keeps clear of
the artwork:

- The crown is narrower than without the frame, so it stays inside the
  mid-side rosettes.
- The basmala and title sit below the top rosette.
- The verse and hadith medallions sit inside the corner arabesques.
- The legend and statistics panels sit on either side of the trunk.
- The footer sits above the bottom rosette.

Names are pushed off the medallions and panels during collision
relaxation.

**Default Luxe style:**

- **Sons:** metallic silver leaves (`#E8E8E8 / #C0C0C0 / #999999`) with the
  name on the leaf.
- **Daughters:** metallic gold capsules (`#FFE57F / #D4AF37 / #AA7C11`).
- **Ancestors:** gold scalloped medallions on the trunk.
- **Branches:** clean tapered vector branches in a soft walnut gradient.
- **Title:** gilded Aref Ruqaa calligraphy.
- **Names and text:** Amiri.

## Foliage and ornaments

Ornaments are toggled under **Style → Ornaments**:

- the frame;
- daughters as gold capsules;
- the leafy canopy;
- the basmala ﷽;
- Al-Hujurat 49:13;
- the Tirmidhi hadith «تعلموا من أنسابكم ما تصلون به أرحامكم…».

**How the foliage grows.** `src/lib/layout/foliage.ts` uses *space
colonization*:

1. Attraction points are scattered through the egg-shaped canopy.
2. Twigs grow in small steps from seeds on the real genealogical branches
   toward the points around them, removing points as they reach them.
3. Twig thickness follows the pipe model.
4. Leaves form fans at the tips and alternate along the twigs.

As a result even a small family gets a full, natural canopy. Names repel
the growth, so foliage never covers a name.

**Rule: leaves only decorate when names are roundels or ovals.** With
leaf-shaped names, every leaf is a person and no decorative leaves are
added. Each ornament can be toggled under **Style → Ornaments**.

## Rendering details

The tree is pure vector SVG. The only bitmap is the frame artwork, which is
embedded into the exported file.

- **Wood:** clean tapered branches in a walnut gradient
  (`#3B2314 → #6E472A → #24140B`), with rounded joints and soft drop
  shadows.
- **Metal:**
  - Male nodes use a silver bevel (`#E8E8E8 / #C0C0C0 / #999999`).
  - Female nodes use a gold bevel (`#FFE57F / #D4AF37 / #AA7C11`).
  - Both have dark borders, a specular gloss and a drop shadow.
  - Trunk and canopy-base medallions are gold with a parchment field and
    a beaded inner ring.
- **Paper:** the Canva frame artwork, or flat parchment (`#f4ecd8`) when
  it is absent.
- **Panels:** legend, statistics and the soil inscription sit on
  semi-transparent parchment with gilt double borders and corner lozenges.
- **Canopy:** a soft oval or teardrop silhouette behind the canopy keeps
  the tree shape balanced, even for a small family.
- **Type:** names in Amiri, falling back to Traditional Arabic. Headings
  in Aref Ruqaa. Both fonts are embedded in exports.

## Styles

**🎨 Style** has six presets, and every setting can be overridden. Settings
are saved per tree in `settings.theme`.

| Preset | Look |
| --- | --- |
| Luxe (default) | Canva gold-foil frame, silver name leaves for sons, gold capsules for daughters, gold trunk medallions, Ruqaa title |
| Heritage | ivory roundels with gold rims, gold scalloped medallions, leafy canopy, basmala, verse and hadith medallions |
| Silver & Gold | metallic silver (male) and gold (female) ovals, framed ancestor badges |
| Classic botanical | green leaves, generation-coloured forks, names carved in the bark |
| Parchment & Emerald | emerald and gold leaves on parchment |
| Minimal black & white | white circles, fine line branches, like hand-drawn family charts |

Options:

- **Colours:** male, female, ancestor frame and branch colours, each with a
  colour picker.
- **Colour by:** gender or generation band.
- **Finish:** metallic gradients on or off.
- **Node shape:** leaves, circular badges or oval medallions.
- **Labels:** first name, or «name بن father», with optional
  birth/death years.
- **Trunk:** ancestors carved in the bark, or shown as framed badges.

| Script | What it does |
| --- | --- |
| `npm test` | Layout engine and genealogy-rule tests |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run db:studio` | Browse the data in Prisma Studio |

## Project structure

```
shajarah/
├── prisma/
│   ├── schema.prisma            FamilyTree · Member · Marriage
│   ├── migrations/              SQL migrations
│   └── seed.ts                  loads the sample family
├── src/
│   ├── app/
│   │   ├── page.tsx             tree list + "new tree" form
│   │   ├── trees/[treeId]/      editor backed by the database
│   │   ├── demo/                editor backed by memory (no DB)
│   │   └── api/                 REST routes (see below)
│   ├── components/
│   │   ├── editor/              TreeWorkspace, MemberForm, RelationsPanel, MemberPicker, repository
│   │   └── poster/              TreePoster (SVG), PosterViewport (d3-zoom), ExportMenu
│   └── lib/
│       ├── layout/              ← procedural layout engine (pure, framework-free)
│       │   ├── botanical.ts     hierarchy → trunk/crown → positions → branches/leaves
│       │   ├── geometry.ts      Bézier + tapered "ribbon" outlines
│       │   ├── palette.ts       generation colours (ألوان الأجيال)
│       │   └── random.ts        seeded PRNG
│       ├── export/exportPoster.ts  SVG / PNG / PDF export
│       ├── data/                Prisma client, tree service, HTTP helpers
│       ├── genealogy.ts         generations, cycle checks, nasab chain
│       ├── nasab.ts             nasab parser + matcher for "X بن Y" import
│       ├── theme.ts             style presets and colour helpers
│       ├── samples/kalali.ts    the Al-Kalali lineage
│       ├── validation.ts        zod schemas shared by API and UI
│       └── sampleData.ts        deterministic sample family
└── tests/                       layout, trunk/side-branch and nasab tests
```

## Data model

- **FamilyTree** owns members and marriages (cascade delete). It also stores
  the poster title and subtitle, the `lineage` (patrilineal or matrilineal),
  an optional explicit `rootMember`, the tier boundaries `trunkStart` and
  `crownBase`, an optional `soilText`, and poster `settings` (JSON,
  including the theme).
- **Member** has `name`, `laqab`, `gender`, `birthYear`, `deathYear`,
  `isDeceased`, and `birthOrder` (sibling order on the poster). Parentage is
  two self-relations, `fatherId` and `motherId`, with `ON DELETE SET NULL`.
  `generation` is denormalised and indexed. The API recomputes it in a
  transaction whenever parentage changes.
- **Marriage** is a separate table, so a member can have several spouses,
  each with optional dates.

**Why tiers are two pointers, not per-member flags.** A member's tier
(soil, trunk or canopy) follows from their position relative to
`trunkStartId` and `crownBaseId`. Storing an `isTrunkNode` or soil flag on
each member would mean rewriting dozens of rows whenever a boundary moves,
and any missed row would leave the poster silently wrong. Two pointers keep
the data correct by construction, and moving a boundary is a single
update. The soil text is generated from the real member records, so the
ancients stay searchable, editable people. `soilText` exists only as an
optional verbatim override.

The service layer (`src/lib/data/treeService.ts`) enforces the genealogy
rules:

- No loops (a member can't become their own ancestor).
- Fathers can't be female and mothers can't be male.
- Parents and spouses must belong to the same tree.
- No duplicate marriages.
- The first member added becomes the tree's root.

## REST API

Every mutation returns the full, updated tree, so the client never has to
reconcile partial state.

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/api/trees` | list / create trees |
| GET / PATCH / DELETE | `/api/trees/:treeId` | read / update (title, lineage, root, settings) / delete |
| POST | `/api/trees/:treeId/members` | add a member (`spouseOfId` also creates a marriage) |
| PATCH / DELETE | `/api/members/:memberId` | edit / remove a member |
| POST | `/api/trees/:treeId/marriages` | link two spouses |
| DELETE | `/api/marriages/:marriageId` | unlink spouses |
| POST | `/api/trees/:treeId/import-nasab` | import pasted nasab lines (`{ text }`) in one transaction |

## The layout algorithm

`computePosterLayout(tree, { seed, showFemales })` is a pure function. The
same input and seed always produce the same poster.

1. **Hierarchy.** It builds the lineage tree (father-first or mother-first,
   depending on `lineage`) with d3-hierarchy and counts each subtree's
   leaves.
2. **Tiers.** The chain from the root to the crown base (the chosen
   `crownBaseId`, or else the first real fork) is split at `trunkStartId`
   into soil and trunk.
   - The poster switches to a taller base band for the soil.
   - A long trunk pushes the crown base up and the canopy shrinks to fit.
     Beyond one column the medallions zigzag.
   - Soil text is wrapped onto curved baselines, drawn with `<textPath>`,
     inside a soil mound drawn over the trunk base.
   - Brothers of trunk ancestors become stubs if childless, like غانم and
     قتيبع in the sample. Otherwise they become side branches: a small
     canopy fanning out from the trunk at their father's height.
3. **Partition.** Each crown node gets a slice of a 0–1 axis proportional to
   `leaves^0.8`. That axis maps to an angle around the crown base by the
   arc length of the crown outline (a superellipse), so the rim fills
   evenly. Sibling order is kept, so branches never cross. In RTL (Arabic)
   trees the eldest son sits on the right.
4. **Radius.** Distance from the crown base blends absolute generation depth
   with how much a branch still has to grow. Small families get a
   proportionally smaller crown.
5. **Collision relaxation.** Label boxes are pushed apart along their axis of
   least overlap. A uniform grid keeps each pass O(n), and springs pull
   tags back toward their targets. Trunk labels and stubs take part as
   fixed obstacles. The engine is tested to leave zero overlaps for every
   node shape.
6. **Branches.** Each edge is a cubic Bézier. Its start tangent continues the
   parent's growth direction and its end leans upward, which gives the
   "rise, then spread" silhouette. Width follows the pipe model
   (∝ √leaves) and is drawn as a filled, tapered outline rather than a
   stroke.
7. **Leaves are people.** Every childless crown member becomes a leaf
   pointing away from its parent on a thin stalk, with the name written
   along the blade and flipped so it always reads upright. Collision boxes
   use the rotated leaf's bounds. There are no decorative leaves, and
   generation colours avoid green so a tag is never mistaken for a leaf.
   **↻ Re-grow** changes the seed (branch jitter).

## Print export

- **SVG** is vector, with the Amiri fonts embedded as base64 and a physical
  size in mm. It opens unchanged in Illustrator, Inkscape or a print shop's
  software.
- **PDF / PNG** are rendered in the browser at the chosen A3–A0 size and
  150/200/300 DPI. Rendering in the browser guarantees correct Arabic letter
  joining, which many PDF text engines get wrong.
- **Font loading:** an SVG rendered as an image loads its fonts
  asynchronously, so a cold first export could paint invisible text. Before
  rendering, the exporter paints a small probe image and waits until all
  four Amiri faces have actually drawn.

For a fully vector PDF today, open the SVG in Inkscape and use "Save as PDF".

## Next steps

- Server-side vector PDF route (headless Chromium `page.pdf()`), plus
  CMYK/bleed options for print shops
- Hijri dates, and editable title, credits and sources panels like the
  reference posters
- Undo/redo, drag-to-reorder siblings, CSV/GEDCOM import
- Authentication and per-family sharing
