# شجرة · Shajarah — Family Tree Poster Generator

Enter a family (parents, children, spouses) and Shajarah grows it into an
ornamental, botanical nasab poster: the ancestral chain on the trunk, the
sons of the first branching ancestor as main limbs, and curved tapered
branches. **Every leaf is a person** with their name written on it:
satin-silver leaves for sons, soft-gold capsules for daughters. Members
with descendants are ivory capsules with a gold rim at their branch forks.
You can export it as vector SVG, a high-DPI PDF/PNG, or a tiled PDF for
printing on smaller sheets.

The genealogy is the primary element. The layout sizes itself from the
family, keeps every name legible at the chosen poster size, and says so
when a family needs a larger poster.

| Generated poster (demo data) | Al-Kalali lineage: foundation, trunk, canopy | Editor |
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

## The three tiers: foundation, trunk, canopy

The ancestral chain is split into three tiers. You set the two boundaries
on any member's panel:

| Tier | Who | Drawn as | Set with |
| --- | --- | --- | --- |
| **Foundation** (soil) | ancestors older than the trunk start (e.g. آدم … نصر) | the lineage as running text in a gold-ruled panel below the trunk, reached by fine roots | 🪵 **Start the trunk here** → `FamilyTree.trunkStartId` |
| **Trunk** | trunk start … the canopy's father (e.g. عبد كلال الأصغر … سالم) | ivory badges up the trunk, eldest at the bottom, joined by a gold thread | — |
| **Canopy** | the canopy base and all descendants | Bézier branches, leaves and capsules | 🌳 **Start the canopy here** → `FamilyTree.crownBaseId` |

- **Long trunks stay readable.** The trunk gets the height it needs: one
  row per ancestor at about the size of the names. When two staggered
  columns let every name print clearly larger (at least 25% larger), the
  trunk uses them, with the gold thread showing the order. The
  34-ancestor Al-Kalali trunk prints at about 8 mm on A2.
- **Automatic mode:** without a trunk start, up to 12 of the nearest
  ancestors go on the trunk (fewer if they would not fit legibly) and the
  rest into the foundation. Without a canopy base, the canopy starts at
  the first real fork.
- **Custom foundation text:** to inscribe a lineage exactly as a source
  writes it, paste it under **Style → Soil inscription**
  (`FamilyTree.soilText`).
- **Laqabs and honorifics** appear as a quiet second line under the name
  (الشيخ، رحمه الله …). In the foundation text they use the classical ornate
  brackets «يريم ﴿ذو رعين الأكبر﴾».
- **Side branches:** brothers of trunk ancestors grow as side branches with
  their own small canopy. Brothers without descendants become small
  medallions beside the trunk.
- **Matrilineal trees:** the women are the line, so they are always shown
  (the "Show daughters" toggle only appears for patrilineal trees). Hiding
  them would detach their children from the tree.
- **Several marriages:** half-siblings are kept together, grouped by mother
  in the order the mothers first appear, with birth order kept within each
  group.

## Design and the optional Canva frame

**Default style: Refined ivory.** The genealogy is the primary element:

- **Paper:** flat ivory paper inside a fine double gold rule.
- **Sons:** satin-silver leaves with the name on the leaf.
- **Daughters:** soft-gold capsules.
- **Fathers:** members with descendants are ivory capsules with a gold
  rim.
- **Branch heads:** ivory medallions with a fine double gold ring. The
  crown base gets a scalloped outer ring.
- **Branches:** clean, flat bronze, with no shadows or textures.
- **Type:** the title is gilded Aref Ruqaa; names are Amiri.
- **Footer:** one quiet line with the key and the family counts.

There are no heavy shadows, gloss, grass or soil mound.

**Luxe preset: the Canva frame (hybrid).**

1. **Frame artwork.** The gold-foil border, corner arabesques and
   parchment texture are one image, `public/poster-frame.jpg`. It was
   designed in Canva and is drawn full-bleed behind everything.
2. **Tree.** Everything else is computed and drawn as vector SVG on top
   of the frame. The frame is never a picture of a tree.

The frame is a flexible layer, not a constraint. In framed mode the
content area shrinks to the frame's inner field, and the layout sizes the
genealogy to that field:

- the canopy stays inside the mid-side rosettes;
- the header sits below the top rosette;
- the verse and hadith medallions sit inside the corner arabesques;
- the footer sits above the bottom rosette.

**Replacing the frame.** Export the frame page from Canva at 4000×6000 and
save it as `public/poster-frame.jpg`. A quality-92 JPEG is about 2 MB and
looks the same as the 16 MB PNG; a `.png` with the same name also works.
The editor checks for the file on load. Without it, a fine gold rule is
drawn instead and **Style → Ornaments** shows a note. The 2:3 artwork is
stretched about 6% vertically to fit the A-series page.

## Foliage and ornaments

Ornaments are toggled under **Style → Ornaments**:

- the Canva gold-foil frame;
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

The tree is pure vector SVG. The only bitmap is the optional frame
artwork, which is embedded into the exported file.

- **Branches:** flat, tapered filled outlines in the branch colour, with
  rounded joints. The trunk has a gentle side-to-side tone. No shadows.
- **Names:** a soft three-stop satin finish (`satinStops`: highlight, body,
  shade), a thin darker rim, and dark ink text. No gloss or drop shadows.
- **Hierarchy:**
  - Medallions mark sons who head a branch.
  - Ivory capsules mark fathers.
  - Leaves and capsules mark childless members.
  - Text size steps down gently with generation, never below the legible
    minimum.
- **Foundation:** running text in an ivory panel with a fine double gold
  rule, under a thin ground line and a few fine roots.
- **Canopy:** a faint warm wash behind the canopy gives a sparse tree its
  shape.
- **Type:** names in Amiri, falling back to Traditional Arabic. Headings
  in Aref Ruqaa. Both fonts are embedded in exports.
- **Editor vs. print:** selection and ancestor highlights are drawn in a
  separate `data-ui` layer. Export removes that layer, along with hover
  tooltips and pointer cursors, so prints show the finished poster only.

## Styles

**🎨 Style** has seven presets, and every setting can be overridden.
Settings are saved per tree in `settings.theme`; the poster size is saved
in `settings.posterSize`.

| Preset | Look |
| --- | --- |
| Refined ivory (default) | fine gold rule on ivory, satin-silver leaves for sons, soft-gold capsules for daughters, ivory medallions, one muted colour per main branch, basmala and Ruqaa title |
| Luxe | the same tree inside the Canva gold-foil frame, with the verse and hadith medallions |
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

- Setting a `deathYear` on a member also marks them deceased.
- `settings: null` resets the poster settings to the defaults.
- Poster settings change optimistically in the editor. If the save fails,
  they go back to what was saved and the error is shown.

## The layout algorithm

`computePosterLayout(tree, options)` is a pure function. The same input and
seed always produce the same poster.

1. **Hierarchy.** It builds the lineage tree (father-first or mother-first,
   depending on `lineage`) with d3-hierarchy. Half-siblings are grouped by
   mother.
2. **Tiers.** The chain from the root to the crown base (the chosen
   `crownBaseId`, or else the first real fork) is split at `trunkStartId`
   into foundation and trunk.
3. **Space allocation from the content.** Nothing uses fixed page
   fractions.
   - For a name size *f* the engine estimates what each part needs:
     - **Canopy:** the summed area of its name tags times a packing
       factor, as an egg-shaped crown as wide as the page allows.
     - **Trunk:** one row per ancestor.
     - **Foundation:** the wrapped lines of its text.
   - It picks the largest *f* (up to a cap) at which everything fits
     between the header and the footer.
   - A small family's canopy then spreads into the spare height, and the
     whole is centred. Space therefore follows the actual family.
4. **Legibility for the paper.** `paperWidthMm` and `minTextMm` (default
   A2 and 3.2 mm ≈ 9 pt) set the smallest acceptable printed text.
   - The arrangements are tried most-faithful first: one trunk column, a
     two-column trunk, and in automatic mode fewer trunk ancestors.
   - If none fits legibly, the family is still laid out, smaller.
     `layout.legibility` then reports `ok: false` and how much larger the
     paper must be. The editor offers that size.
5. **Partition by capacity.** Each crown node gets a slice of a 0–1 axis
   proportional to the number of names in its sub-branch.
   - The axis maps to an angle around the crown base by *capacity*: how
     many horizontal names fit side by side at each angle. At the top a
     name takes its full width; on the sides only its height.
   - Sibling order is kept. In RTL (Arabic) trees the eldest sits on the
     right.
6. **Generation rings (a radial tidy tree).**
   - Every name sits on the ring of its generation, inside its family's
     sector, and siblings share a ring.
   - On each ring, names are spaced along the ring in family order, with a
     corridor between neighbours.
   - Because the order is the same on every ring, lines between
     consecutive rings cannot cross. No line has to pass a sibling's
     place.
7. **Collision relaxation along rays.** Overlaps are resolved by moving a
   name outward along its own ray only, never sideways into a neighbouring
   family. Labels near the page edge stay on their ray: the radius is
   capped instead of clamping x.
8. **Connections from the data.** Each line runs from the parent's label to
   the child's label: a gentle cubic that arrives along the child's ray.
   - Leaf stalks aim at the leaf's centre, and the leaf is drawn over it.
   - Widths follow the pipe model, with fine twigs.
9. **Relationship-clarity check** (`src/lib/layout/clarity.ts`). Every
   layout is validated against the genealogy:
   - every expected parent → child connection is drawn, from the right
     parent, and ends at the right child;
   - the trunk follows the father → son order;
   - no line passes under an unrelated name;
   - crossings are steep (≥ 30°) and away from labels;
   - no two lines run together;
   - no line's visible end touches another line (a false junction);
   - siblings' lines neither cross nor touch in their outer half.
10. **Untangling and retry.** A few remaining ambiguities are fixed locally:
    mirror a leaf, move a name out along its ray, or turn it slightly
    without changing the order. If ambiguity remains, the layout is
    redone with more room per name.
    - **Clean at a legible size:** done.
    - **Clean only below the legible size:** `legibility.ok` is false, and
      the editor recommends the larger poster.
    - **Never clean:** the remaining spots are listed in
      `layout.clarity.issues` and circled in the editor. They never print.
11. **Lineage colours** (Refined style; *Style → Ornaments*). Each major
    lineage gets one muted colour: forest green, burgundy, dusty blue,
    ochre, deep teal, plum.
    - A major lineage is a son of the crown base who has descendants, or a
      side branch.
    - The colour is carried by every descendant's line and name rim, and by
      the branch head's ring.
    - Fills keep their role meaning (silver son, gold daughter, ivory
      father), and text stays dark ink. Neighbouring branches never share
      a colour, and each colour is at least 3:1 against the paper.
    - Colour reinforces the lines and never replaces them.
12. **Crossing convention.** Every branch is drawn with a fine paper-coloured
    edge, so where two lines do cross, one visibly passes over the other
    with a small gap. A crossing never looks like a shared junction.

**Tracing a line in the editor.** With **Trace lineage** on, selecting a
person veils the rest of the poster and draws their line in red:
ancestors up the trunk and every descendant. The set comes from the data
(`lineagePath`), so half-siblings and cousins are never included. This
layer is editor-only and never exported.

**Measured clarity** (automated tests, `tests/clarity.test.ts`; all at a
legible size, clean means zero issues):

| Family | People | Clean on |
| --- | --- | --- |
| Small, Al-Kalali, several marriages, names | 11–38 | A2 |
| Three wives, interleaved half-siblings | 82 | A2 |
| Large | 195 | A1 |
| Dense (7–11 children per father) | 220 | A1 |
| Very large | 496 | not fully: 3 spots remain on 2A0, circled in the editor; use a branch poster (below) |

Passing these checks is necessary, not sufficient: the renders are also
inspected at print scale.

### Families too large for one clear poster

When no single sheet up to 2A0 is clear and legible, the warning offers
three ways out instead of only reporting the problem:

- **Poster of one branch.** Pick a branch (largest first). The poster then
  shows that person's ancestors on the trunk and all their descendants in
  the canopy, and says whose branch it is under the title ("فرع عبدالله بن
  نصار"). Any member's panel has the same button ("🌿 Poster of this branch
  only"). A banner in the editor shows the number of people on the poster,
  and "Show the whole family" goes back. A branch that is still too big
  offers its own sub-branches. Saved as `settings.focusId`; a focus on a
  deleted person falls back to the whole family.
- **Hide daughters** (patrilineal trees only).
- **Use 2A0, printed as a Tiled PDF.**

Measured on the 496-person family (`tests/hardening.test.ts`): every branch
except the largest is clean and legible on A1 alone. The largest (282 people)
is clean once narrowed to its biggest sub-branch.

## Print export

- **Poster size.** Choose A3, A2, A1, A0 or 2A0 in the header. The layout
  is designed for that size, and the export menu defaults to it.
- **SVG** is vector, with the fonts embedded as base64 and a physical size
  in mm. It opens unchanged in Illustrator, Inkscape or a print shop's
  software.
- **PDF / PNG** are rendered in the browser at the chosen size and
  150/200/300 DPI. Rendering in the browser guarantees correct Arabic letter
  joining, which many PDF text engines get wrong.
- **Tiled PDF** splits the poster over A4 or A3 sheets for home or
  copy-shop printing. Each sheet has 10 mm overlap, crop marks and its
  row/column.
- **Clean output.** Exports never contain editor marks: selection,
  highlights, tooltips and cursors are removed.
- **Font loading:** an SVG rendered as an image loads its fonts
  asynchronously, so a cold first export could paint invisible text. Before
  rendering, the exporter paints a small probe image and waits until every
  embedded face has actually drawn.

For a fully vector PDF today, open the SVG in Inkscape and use "Save as PDF".

**Validation families.** `/demo?sample=` with one of the following values
loads each family used by `tests/composition.test.ts` and
`tests/clarity.test.ts` (also `dense` and `multi`). Add `&poster=A1` to set
the poster size, and `&colors=1` to force lineage colours:

- `small`: three generations;
- `marriages`: several marriages and many daughters;
- `names`: long names and honorifics;
- `kalali`: an 85-name chain;
- `huge`: about 500 people.

Without a sample value, `/demo` loads the large demo family.

## Next steps

- Server-side vector PDF route (headless Chromium `page.pdf()`), plus
  CMYK/bleed options for print shops
- Hijri dates, and editable title, credits and sources panels like the
  reference posters
- Undo/redo, drag-to-reorder siblings, CSV/GEDCOM import
- Authentication and per-family sharing
