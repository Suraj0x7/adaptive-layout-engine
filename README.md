# Adaptive Layout Engine for Multi-Surface Ads

A genuine constraint-based layout engine built in TypeScript and React that receives **one declarative advertisement specification** and automatically computes optimal spatial layouts for diverse display surfaces and aspect ratios.

**Architectural Rule:** This engine contains **zero hardcoded surface branches** (`no if (surface.id === 'mobile')`). Layouts are mathematically derived at runtime using physical and geometric constraints.

---

## 1. Project Overview

Digital advertising campaigns span radically disparate digital canvases:
* Compact mobile viewports (e.g. 360 × 640 portrait)
* Horizontal mobile formats (e.g. 640 × 360 landscape)
* Broadcast television lower thirds (e.g. 1920 × 250 ultrawide ribbon)
* High-resolution public retail kiosks (e.g. 1080 × 1080 square touchscreen)
* Constrained micro-displays (e.g. 280 × 200 constrained embedded screen)

Traditionally, ad platforms maintain separate manual templates for each surface breakpoint. This approach fails to scale, creates brittle UI regressions, and cannot accommodate emerging surfaces.

The **Adaptive Layout Engine** solves this with a **pure TypeScript, framework-independent constraint resolver**. The user declares an advertisement once, and the engine evaluates:
1. **Geometric bounds** (aspect ratio, available safe-area width and height)
2. **Physical viewing contexts** (viewing distance, touch capabilities, density)
3. **Semantic element roles** (`hero`, `primary`, `secondary`, `action`, `branding`)
4. **Hierarchical priorities** (`P1` critical down to `P3` droppable)
5. **Hard interaction constraints** (minimum tap targets, minimum readable text sizes)

---

## 2. System Architecture

```
Ad Specification (Content, Roles, Priorities)
       +
Surface Profile (Dimensions, Safe Area, Min Font, Min Tap)
       ↓
Constraint Resolver (Pure TypeScript Engine)
       ↓
Resolved Layout (X, Y, Width, Height, Font Size, Visibility, Diagnostics)
       ↓
DOM Renderer (Absolute CSS Positioning + Styling)
       ↓
Final Rendered Advertisement
```

The core engine in `src/engine/` is decoupled from React and DOM APIs. React is used strictly as a host UI to drive the preview, surface switching, custom surface testing, and developer diagnostics.

---

## 3. Quick Start

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Running Tests
```bash
npm test
```
Runs 9 comprehensive Vitest suites covering overlap prevention, bounds containment, broadcast font thresholds, kiosk tap targets, priority degradation, and unknown surface resolution.

### Production Build
```bash
npm run build
```

---

## 4. The Constraint-Solving Algorithm

The resolver (`src/engine/resolver.ts`) executes a deterministic 9-step pipeline:

```
[1. Validate Inputs]
       ↓
[2. Calculate Safe Area Usable Box]
       ↓
[3. Analyze Surface Geometry & Aspect Ratio]
       ↓
[4. Generate Normalized Element Candidates]
       ↓
[5. Classify Composition: Vertical | Horizontal | Balanced]
       ↓
[6. Allocate Spatial Zones & Fit Content]
       ↓
[7. Constraint & Collision Validation]
       ↓ (If invalid / overflows)
[8. Apply Priority Degradation Level (0 → 7)] ─── (Re-solve)
       ↓ (When valid fit found)
[9. Return Typed ResolvedLayout + Full Diagnostics]
```

### Detailed Pipeline Stages:
1. **Validation (`src/engine/validation.ts`)**: Rejects duplicate IDs, zero or negative dimensions, safe areas exceeding display bounds, and missing content attributes.
2. **Usable Area Calculation**: Subtracts `safeArea.top`, `safeArea.right`, `safeArea.bottom`, and `safeArea.left` from display boundaries.
3. **Geometry Classification**: Purely based on `aspectRatio = usableWidth / usableHeight`:
   * `aspectRatio < 0.85` → **Vertical Flow** (columnar hierarchy)
   * `aspectRatio > 1.90` → **Horizontal Flow** (ribbon / lower-third with anchor zones)
   * `0.85 ≤ aspectRatio ≤ 1.90` → **Balanced Flow** (quadrant or split-column stage)
4. **Candidate Normalization (`src/engine/constraints.ts`)**: Calculates preferred and minimum sizes, line-wrap estimations, viewing distance multipliers (e.g. `1.65×` font scale for TV "far" viewing distance), and minimum touch bounding boxes.
5. **Spatial Allocation**: Solves element positioning and role-weighted scaling.
6. **Constraint Validation**: Enforces:
   * No two visible elements intersect (`findOverlaps()`).
   * Every visible element resides within usable bounds (`isInsideBounds()`).
   * Action buttons meet `minTapTarget` (e.g., 60px for Kiosk, 44px for Mobile).
   * Text sizes never drop below `surface.minTextSize`.
7. **Degradation Loop**: If bounds or constraints fail, the engine steps through deterministic degradation levels until all hard constraints are satisfied.

---

## 5. Priority-Based Degradation

When spatial budgets become constrained, the engine protects high-priority content (`P1`) by sacrificing lower-priority elements (`P3`, `P2`) in a deterministic sequence:

| Level | Action | Description |
| :--- | :--- | :--- |
| **Level 0** | Preferred Fit | All elements at preferred sizes with default spacing. |
| **Level 1** | Spacing Compression | Reduces inter-element gaps and padding by 40%. |
| **Level 2** | Shrink Branding | Shrinks priority 3 branding logos towards their minimum size. |
| **Level 3** | Reduce Secondary Font | Compresses secondary text font size (never below `surface.minTextSize`). |
| **Level 4** | Truncate Secondary Text | Enforces single-line truncation with ellipsis on secondary copy. |
| **Level 5** | Drop Branding Element | Removes priority 3 logo completely to salvage critical content. |
| **Level 6** | Compress Hero Visual | Scales down hero image towards its minimum bound. |
| **Level 7** | Drop Secondary Content | Removes priority 2 price/badge if extreme constraints persist. |

**Protected Invariants:**
* Priority 1 items (`headline`, `product-image`, `cta`) are preserved whenever physically possible.
* CTA interactive area never falls below `minTapTarget` on touch surfaces.
* Text font size never falls below `surface.minTextSize`.

Every degradation decision is logged with its rationale in `layout.diagnostics.degradationSteps`.

---

## 6. TypeScript Data Model

```typescript
// Core Element Types
export type ElementType = 'text' | 'image' | 'button';
export type ElementRole = 'primary' | 'secondary' | 'hero' | 'action' | 'branding';
export type ElementPriority = 1 | 2 | 3; // 1 = highest, 3 = lowest

// Surface Profile Model
export interface SurfaceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  safeArea?: { top: number; right: number; bottom: number; left: number };
  minTextSize?: number;
  minTapTarget?: number;
  touchOnly?: boolean;
  viewingDistance?: 'near' | 'medium' | 'far';
  maxElements?: number;
  density?: 'compact' | 'normal' | 'spacious';
}

// Final Resolved Output
export interface ResolvedLayout {
  surfaceId: string;
  surfaceName: string;
  width: number;
  height: number;
  safeArea: SafeArea;
  elements: ResolvedElement[];
  orientation: 'vertical' | 'horizontal' | 'balanced';
  diagnostics: LayoutDiagnostics;
}
```

---

## 7. Adding a New Surface (Zero Resolver Changes)

To add a completely new surface, pass a configuration object directly to `resolveLayout`:

```typescript
import { resolveLayout } from './engine/resolver';
import { DEMO_AD } from './data/demoAd';

const smartWatchSurface: SurfaceProfile = {
  id: 'smart-watch',
  name: 'Smart Watch Display',
  width: 280,
  height: 280,
  safeArea: { top: 12, right: 12, bottom: 12, left: 12 },
  minTextSize: 11,
  minTapTarget: 36,
  touchOnly: true,
  viewingDistance: 'near',
  density: 'compact',
};

// Works immediately without changing any code in resolver.ts!
const layout = resolveLayout(DEMO_AD, smartWatchSurface);
console.log(layout.orientation); // 'balanced'
```

---

## 8. Demo Application Features

1. **Surface Switcher**: Segmented toggle between Mobile Portrait, Mobile Landscape, Broadcast Lower Third, Retail Kiosk, and Constrained Display.
2. **Interactive Custom Surface Builder**: Enter arbitrary dimensions, safe area insets, min text size, and tap targets. Includes presets for interview testing.
3. **Visual Layout Bounds**: Overlay toggle showing exact resolved bounding boxes, element roles, IDs, and pixel dimensions (`[hero:product-image] 320x320`).
4. **Safe Area Overlay**: Visual guide for broadcast and display safe zones.
5. **Live Diagnostics Panel**: Inspect element coordinates, visible/dropped counts, computation time (sub-1ms), and degradation decision audit trails.
6. **JSON Export**: One-click download of the complete `ResolvedLayout` schema.

---

## 9. Known Limitations

1. **Canvas Text Measurement**: Uses heuristic font-metric estimation based on proportional character widths (`charWidth = fontSize * 0.55`). Future iterations can integrate HTML5 Canvas `measureText` for pixel-perfect font kerning.
2. **Element Types**: Supports `text`, `image`, and `button`. Does not currently support video players or carousels.
3. **Solver Class**: Employs a priority-aware greedy geometric solver rather than a full simplex/simplex linear programming solver (like Cassowary), prioritizing explainability and execution speed.

---

## 10. Future Improvements

* **Fluid Animated Transitions**: Animate elements between surface transitions using FLIP technique or Web Animations API.
* **Canvas Renderer**: Alternate rendering backend for embedded display devices without DOM support.
* **Accessibility / Contrast Engine**: Automatically adjust font weights or background contrast under high ambient light surfaces.

---

## 11. AI Usage Disclosure

AI-assisted development tools were used for architecture discussion, code generation assistance, debugging, and documentation. The final design and implementation were reviewed and understood by the developer.
