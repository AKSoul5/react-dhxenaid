# شجرة · Shajarah — Family Tree Poster Generator

Enter a family (parents, children, spouses) and Shajarah grows it into an
ornamental, botanical nasab poster: the ancestral chain on the trunk, the
sons of the first branching ancestor as golden main limbs, and curved
tapered branches. **Every leaf is a person** with their name written on it:
green for sons, rose for daughters. Members with descendants sit at their
branch forks as generation-coloured tags. You can export it as
vector SVG or a high-DPI PDF/PNG for printing.

| Generated poster (demo data) | Editor |
| --- | --- |
| ![poster](docs/demo-poster.jpg) | ![editor](docs/editor.jpg) |

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
npm run db:seed                # optional: a 321-member sample family
npm run dev                    # http://localhost:3000
```

The page at **`/demo`** works without a database. It runs the same editor
with an in-memory repository.

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
│       ├── validation.ts        zod schemas shared by API and UI
│       └── sampleData.ts        deterministic sample family
└── tests/layout.test.ts
```

## Data model

- **FamilyTree** owns members and marriages (cascade delete). It also stores
  the poster title and subtitle, the `lineage` (patrilineal or matrilineal),
  an optional explicit `rootMember`, and poster `settings` (JSON).
- **Member** has `name`, `laqab`, `gender`, `birthYear`, `deathYear`,
  `isDeceased`, and `birthOrder` (sibling order on the poster). Parentage is
  two self-relations, `fatherId` and `motherId`, with `ON DELETE SET NULL`.
  `generation` is denormalised and indexed. The API recomputes it in a
  transaction whenever parentage changes.
- **Marriage** is a separate table, so a member can have several spouses,
  each with optional dates.

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

## The layout algorithm

`computePosterLayout(tree, { seed, showFemales })` is a pure function. The
same input and seed always produce the same poster.

1. **Hierarchy.** It builds the lineage tree (father-first or mother-first,
   depending on `lineage`) with d3-hierarchy and counts each subtree's
   leaves.
2. **Trunk and crown.** From the root it follows the chain while there is
   only one line of descent. Those ancestors are written on the trunk.
   Childless brothers along the way become small stub branches, like غانم
   and قتيبع in the sample. The first real fork becomes the gold medallion
   at the top of the trunk.
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
   tags back toward their targets. The engine is tested to leave zero
   overlaps.
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

For a fully vector PDF today, open the SVG in Inkscape and use "Save as PDF".

## Next steps

- Server-side vector PDF route (headless Chromium `page.pdf()`), plus
  CMYK/bleed options for print shops
- Hijri dates, and editable title, credits and sources panels like the
  reference posters
- Undo/redo, drag-to-reorder siblings, CSV/GEDCOM import
- Authentication and per-family sharing
