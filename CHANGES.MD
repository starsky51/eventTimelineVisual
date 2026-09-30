# Code Review & Refactoring Plan

> **Scope:** All source files in `src/`, plus `style/visual.less`, `capabilities.json`, and `package.json`.
>
> **Goal:** Reduce size of `visual.ts` (currently 4,055 lines / ~192KB), eliminate dead code, remove `as any` casts (179 across the codebase, 152 in `visual.ts` alone), fix duplicated logic, and improve overall readability.

## File Size Summary

| File | Lines |
|------|------:|
| `src/visual.ts` | 4,055 |
| `style/visual.less` | 2,088 |
| `src/ui/detailsPanel.ts` | 585 |
| `src/utils/dateUtils.ts` | 584 |
| `src/ui/tooltipManager.ts` | 563 |
| `src/ui/topBar.ts` | 553 |
| `src/settings.ts` | 364 |
| `src/utils/domUtils.ts` | 367 |
| `src/data/dataParser.ts` | 280 |
| `src/formattingSettingsService.ts` | 271 |
| `src/data/columnResolver.ts` | 264 |
| `src/utils/colorUtils.ts` | 212 |
| `src/ui/landingPage.ts` | 190 |
| `src/ui/statusOverlay.ts` | 146 |
| `src/styling/markerStyling.ts` | 127 |
| `src/styling/colorThemes.ts` | 103 |
| `src/types.ts` | 89 |
| `src/constants.ts` | 61 |
| **Total** | **10,902** |

---

## 1. Extract Major Modules from `visual.ts`

The `Visual` class is a 4,055-line monolith. The following extractions would dramatically reduce its size and improve maintainability.

### 1.1 Extract Data Transformation Module

**Target:** Lines ~3278–3837 (~560 lines)
**New file:** `src/data/timelineDataConverter.ts`

The `indexedRows.forEach` loop (Lines 3307–3691 alone is ~385 lines) handles all row-to-timeline-item conversion: date parsing, group/subgroup resolution, color theming, tooltip assembly, selectionId construction, cross-highlight evaluation, and item object building.

**What to extract:**
- Row iteration and item construction into a `convertRowsToTimelineData()` function
- Helper functions: `extractDates()`, `resolveGroup()`, `resolveItemColor()`, `buildTimelineItem()`
- The function should accept the visual options, row data, column map, and formatting settings
- Return a clean typed result:
  ```typescript
  interface TimelineParseResult {
      items: TimelineItem[];
      groups: TimelineGroup[];
      miniItems: MiniItem[];
      miniGroups: MiniGroup[];
      dateBounds: { min: Date; max: Date };
  }
  ```

### 1.2 Extract Selection Manager

**Target:** Selection state tracking and cross-filter logic scattered across Lines 963–1044, 1658–1714, 1812–1944
**New file:** `src/interaction/selectionManager.ts`

**What to extract:**
- Selection state properties: `currentSelectedIds`, `currentSelectedKeys`, `currentSelectedItemIds` (Lines 157–159) — consolidate into a single cohesive `SelectionState` object
- `isItemMatchingSelection()` (Lines 1678–1701)
- `applySelectionStyles()` (Lines 1812–1944, 130+ lines)
- `clearDomSelectionClasses()` (Lines 1704–1714)
- `updateGroupLabelSelectionStyles()` (Lines 2053–2095)
- `isCrossFilterEnabled()` (Lines 1658–1664)
- The click handler's selection/multi-selection/cross-filter orchestration (Lines 963–1044)

### 1.3 Extract Vis.js Interaction Utilities

**Target:** Vis.js internal access hacks and workarounds
**New file:** `src/interaction/visJsHelpers.ts`

**What to extract:**
- `resetAllTimelineHammers()` (Lines 1385–1425) — mutates deeply nested Vis.js Hammer.js internals
- `finishMainDrag()` (Lines 1427–1471) — manipulates Vis.js recognizer states
- `getItemFromElement()` (Lines 1236–1269) — DOM traversal for `vis-item`
- `getItemsUnderPointer()` (Lines 1271–1373) — spatial collision detection
- `getMarkerElementsByItemId()` (Lines 1557–1600) — Vis.js itemSet DOM lookup
- Monkey-patched Vis.js methods (Lines 557–608): `range._onDrag`, `range._onMouseWheel`, `itemSet._onGroupClick`
- Scroll restoration hacks (Lines 3929–3958)

### 1.4 Extract Style/CSS Manager

**Target:** CSS variable injection and font/padding application
**New file:** `src/styling/styleManager.ts`

**What to extract:**
- CSS variable injection block (Lines 2695–2790) — extensive `setElementCssVar()` calls for fonts, padding, colors
- `getHighContrastSettings()` (Lines 1543–1555)
- `getFontSettings()` (Lines 1793–1807)
- `applyFontSettings()` logic scattered throughout `update()`
- High-contrast styling application from `update()` (Lines ~2580–2610)

### 1.5 Extract Group Collapse Manager

**Target:** Group collapse/expand logic
**New file:** `src/interaction/groupCollapseManager.ts`

**What to extract:**
- `toggleGroupCollapse()` (Lines 2120–2199)
- `setAllGroupsCollapseState()` (Lines 2201–2306)
- Related DOM class manipulation for nested group labels (Lines 2171–2192, 2256–2284, 2292–2304)

### 1.6 Extract Time Tracking Manager

**Target:** Current-time indicator management
**New file:** `src/interaction/timeTrackingManager.ts`

**What to extract:**
- `startTimeTracking()` (Lines ~2904–2920)
- `stopTimeTracking()` (Lines ~2921–2930)
- `updateCurrentTimeTracking()` (Lines ~2931–2943)
- Mini-timeline custom time updates (Lines 3909–3918)

### 1.7 Break Up the Constructor

**Target:** Lines 210–481 (270+ lines)

The constructor should be broken into focused private methods:
- `setupDOMStructure()` — container/element creation
- `createFitTimelineButton()` — SVG icon creation (Lines 284–324), should move to `TopBarManager`
- `bindGlobalInteractionListeners()` — global pointer/keyboard listeners (Lines 333–376)
- `initializeManagers()` — TopBarManager, DetailsPanelManager, etc.
- `bindKeyboardShortcuts()` — keyboard event handlers

### 1.8 Break Up `ensureTimelinesInitialized()`

**Target:** Lines 483–800+ (300+ lines)

Split into:
- `initializeMainTimeline()` — main vis-timeline configuration and event binding
- `initializeMiniTimeline()` — mini-timeline configuration
- `bindMiniTimelineInteractions()` — pointer event handlers for mini-timeline (Lines 703–792), should move to `MiniTimelineManager`
- `patchVisJsInternals()` — the monkey-patching block (Lines 557–608)

### 1.9 Break Up `update()`

**Target:** Lines 2565–2901 (340 lines)

Split into:
- `applyHighContrastStyles()` — high-contrast theme handling
- `applyFormattingSettings()` — parsing and applying CSS variables from settings
- `resolveMinimumZoom()` — the 16-case zoom switch (Lines 2654–2686)
- `determineUpdateType()` — resize vs reload detection (Lines 2817–2836)
- `validateDataView()` — dataview validation checks

### 1.10 Break Up the Click Handler

**Target:** Lines 857–1044 (187 lines as a single anonymous function)

Split into named methods:
- `handleTimelineClick(event)`
- `handleGroupHeaderClick(event, groupId)`
- `handleMarkerSelection(items, isMulti)`
- `handleCanvasBackgroundClick()`

---

## 2. Eliminate Duplicated Logic

### 2.1 Mouse Button State Check (3 occurrences)
```typescript
const isDown = (event.buttons > 0) || ((event as any).which > 0);
```
**Lines:** 846, 1053, 1089
**Fix:** Extract to `private isPointerDown(event: PointerEvent): boolean`

### 2.2 Drag Finish Check (3 occurrences)
```typescript
if (!isDown && (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null)) {
    this.finishMainDrag(event);
}
```
**Lines:** 1057–1058, 1090–1091, and similar in `pointerenter`
**Fix:** Extract to `private checkAndFinishDrag(event: PointerEvent)`

### 2.3 Selection ID Key Extraction (3 occurrences)
```typescript
const key = typeof it.selectionId.getKey === 'function' ? it.selectionId.getKey() : null;
```
**Lines:** 997, 1003, 1031
**Fix:** Extract to `private getSelectionKey(selectionId: ISelectionId): string | null`

### 2.4 Vis.js Item Lookup (2+ occurrences)
```typescript
const itemObj = (this.mainTimeline as any)?.itemSet?.items?.[itemId]
    || (this.mainTimeline as any)?.itemSet?.items?.[String(itemId)];
```
**Lines:** 1563–1564, 1610–1611
**Fix:** Extract to `private getVisItemById(itemId: string | number): VisItem | null`

### 2.5 Hover Glow Clearing (2 identical blocks)
Lines 1631–1642 (mainTimelineContainer) and 1643–1654 (miniTimelineContainer) are copy-pasted.
**Fix:** Extract to `private clearHoverGlow(container: HTMLElement)`

### 2.6 Settings Fallback Chains (10+ occurrences)
```typescript
const keepRangeMarkers = (this.formattingSettings as any)?.generalCard?.keepRangeMarkers?.value === true
    || (this.formattingSettings as any)?.markersCard?.keepRangeMarkers?.value === true
    || (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.general?.keepRangeMarkers === true
    || (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.markers?.keepRangeMarkers === true;
```
**Lines:** 2484–2487, 2636–2640, 2646–2652, 3287–3291, 3740–3744, and more
**Fix:** Create a `getSettingValue<T>(key: string, ...fallbackPaths: string[]): T` helper on the formatting settings model

### 2.7 Interaction Guard (5+ occurrences)
```typescript
if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
```
**Lines:** 234, 276, 326, 443, 704
**Fix:** Extract to `private get isInteractive(): boolean`

### 2.8 Scroll/VerticalDrag Event Handlers (identical)
Lines 629–635 and 639–645 are 100% identical callbacks.
**Fix:** Define a single handler function and reference it for both events.

### 2.9 Date Column Check (3 occurrences in data parsing)
The same regex-based date string validation logic is repeated for `topLevelCol`, `groupCol`, and `subgroupCol`.
**Lines:** 2999–3005, 3020–3027, 3032–3039
**Fix:** Extract to `checkIfColumnHasDates(rows: any[], columnIndex: number): boolean`

### 2.10 Group Value Formatters (3 near-identical functions)
`formatTopLevelGroupValue`, `formatGroupVal`, `formatSubgroupVal` differ only in fallback string.
**Lines:** 3009–3017, 3043–3049, 3051–3057
**Fix:** Unify into `formatGroupValue(val: any, fallback: string): string`

### 2.11 Content Field Assembly (2 near-identical blocks)
Lines 3404–3424 and 3425–3443 duplicate the null-check → column-name → `formatContentFieldValue` → HTML generation pattern.
**Fix:** Unify into a single loop over content indices.

### 2.12 Mini-Timeline Custom Time Set/Add (duplicated try-catch)
Lines 3909–3918 duplicate `try { setCustomTime } catch { addCustomTime }` for start and end.
**Fix:** Extract to `setOrAddCustomTime(timeline, time, id)`

### 2.13 `columnResolver.ts` Sorting Functions (2 identical)
Sorting functions for `contentIndices` (Lines 185–202) and `groupIndices` (Lines 210–227) are identical.
**Fix:** Extract to a shared `sortIndicesByRoleOrder()` function.

### 2.14 `domUtils.ts` Date Formatting (3 occurrences)
`parseDate(val)` followed by `moment(parsed).format('DD MMM YYYY HH:mm')` is duplicated three times in `formatContentFieldValue`.
**Fix:** Extract to `formatDateValue(val: any): string | null`

### 2.15 `statusOverlay.ts` / `landingPage.ts` Toggle Logic
Both `hideStatus` and `hideLandingPage` duplicate the logic for toggling `fitTimelineButton` and `contentContainer` display.
**Fix:** Extract to a shared utility or pass a callback.

---

## 3. Remove Dead Code

### 3.1 Unused Function: `renderTopBarGroupOrderSection`
**File:** `src/ui/topBar.ts`, Lines 153–267 (114 lines)
This function is fully implemented but **never called** anywhere in the codebase. Remove it entirely.

### 3.2 Unused Dependencies
**File:** `package.json`
- `d3` and `@types/d3` — never imported in any source file
- `leader-line-new` — never imported in any source file

Remove from `dependencies` and `devDependencies`.

### 3.3 Potentially Dead Backward-Compatibility Aliases
**File:** `src/settings.ts`, Lines 330–333
Type aliases `MarkersCardSettings`, `MiniTimelineCardSettings`, etc. may be dead if the codebase has fully migrated. Verify usage and remove if unused.

### 3.4 Redundant Capability Object Properties
**File:** `capabilities.json`
After the settings migration, several properties are duplicated across old and new capability objects:
- `showFutureEvents` in both `elements` and `timeline`
- `show` (tooltips) in both `elements` and `tooltips`
- `showSearch` in both `elements` and `topBar`
- `minZoom` in both `general` and `timeline`
- `collapseSubgroupsOnLoad` in both `miscellaneous` and `groupOrderCard`
- `crossFilter` in both `miscellaneous` and `markers`
- `keepRangeMarkers` in both `general` and `markers`

Once the fallback migration period is over, remove the old duplicates and simplify the fallback chains in `formattingSettingsService.ts`.

---

## 4. Improve Type Safety (Eliminate `as any`)

There are **179 `as any` casts** across the codebase (152 in `visual.ts` alone). These fall into distinct categories:

### 4.1 Vis.js Timeline Type Extensions
Create `src/types/vis-timeline.d.ts` with proper type augmentations:
```typescript
interface ExtendedTimeline extends Timeline {
    props: { scrollTop: number; ... };
    itemSet: {
        items: Record<string, VisItem>;
        groups: Record<string, VisGroup>;
        itemFromElement(el: Element): VisItem | null;
    };
    range: { ... };
    _setScrollTop(val: number): void;
    _redraw(): void;
    setSelection(ids: any[], options?: object): void;
    redraw(): void;
}
```
This eliminates 40+ `(this.mainTimeline as any)` casts.

### 4.2 Power BI Host Type Augmentation
Augment `IVisualHost` to include `allowInteractions`:
```typescript
declare module 'powerbi-visuals-api' {
    interface IVisualHost {
        allowInteractions?: boolean;
    }
}
```
This eliminates 10+ `(this.host as any).allowInteractions` casts.

### 4.3 Formatting Settings Type Safety
Replace `(this.formattingSettings as any)?.someCard` with properly typed access:
- The `VisualFormattingSettingsModel` already has typed card properties
- Use the model's typed getters instead of casting to `any`
- This eliminates 30+ casts

### 4.4 DataView Metadata Objects
Create a typed interface for the metadata objects shape:
```typescript
interface DataViewMetadataObjects {
    general?: { minZoom?: string; keepRangeMarkers?: boolean; ... };
    markers?: { crossFilter?: boolean; keepRangeMarkers?: boolean; ... };
    // ...
}
```
This eliminates 15+ `(options.dataViews[0]?.metadata?.objects as any)` casts.

### 4.5 Timer Types
Replace `any` timer variables with proper types:
```typescript
private checkItemWidthsTimer: ReturnType<typeof setTimeout> | null = null;
```

### 4.6 Moment.js Import
Replace `const moment: any = (_moment as any).default || _moment;` with a proper typed import or declaration.

### 4.7 Data Item Types
Replace `item: any` and `const updates: any[] = []` with proper `TimelineItem` interfaces throughout. Define interfaces in `src/types.ts`:
```typescript
interface TimelineItem {
    id: string | number;
    content: string;
    start: Date;
    end?: Date;
    group?: string;
    className?: string;
    style?: string;
    selectionId?: ISelectionId;
    // ...
}
```

---

## 5. Simplify Complex Logic

### 5.1 Min Zoom Switch Statement
**Location:** Lines 2654–2686 in `visual.ts`
A 16-case `switch` on `String(minZoomSetting).toLowerCase()` maps strings like `'1hour'`, `'hour'`, `'1h'` to milliseconds.
**Fix:** Replace with a dictionary lookup:
```typescript
const ZOOM_LEVELS: Record<string, number> = {
    '1hour': 3600000, 'hour': 3600000, '1h': 3600000,
    // ...
};
const minZoomMs = ZOOM_LEVELS[String(minZoomSetting).toLowerCase()] ?? defaultZoom;
```
Move to `src/constants.ts`.

### 5.2 Font Settings Lookup
**Location:** Lines 1793–1807 in `visual.ts`
A long `if/else if` chain comparing `cardName` and `objectName`.
**Fix:** Replace with dictionary lookup:
```typescript
const FONT_OFFSET_MAP: Record<string, number> = {
    timelineCard: FONT_SIZE_OFFSETS.xAxis,
    // ...
};
```

### 5.3 Group Click ID Resolution
**Location:** Lines 888–919 in `visual.ts`
Four nested fallback mechanisms to determine `groupId` from a click event.
**Fix:** Extract to a `resolveGroupIdFromClick(event, timeline): string | null` function with clear early returns.

### 5.4 Scroll Top Validation
**Location:** Line 875 in `visual.ts`
```typescript
else if (this.mainTimeline && (this.mainTimeline as any).props &&
    typeof (this.mainTimeline as any).props.scrollTop === 'number' &&
    (this.mainTimeline as any).props.scrollTop < 0)
```
**Fix:** Extract to `private getVisScrollTop(): number | null` accessor.

### 5.5 `isOngoing` Event Check
**Location:** Lines 3335–3337 in `visual.ts`
Complex inline date logic checking three conditions for "ongoing" events.
**Fix:** Extract to `isOngoingEvent(rawEndDate, effectiveEndDate, endDate): boolean` in `dateUtils.ts`.

---

## 6. Address Empty Catch Blocks

There are **47 empty `catch` blocks** across `visual.ts` (36 `catch {}` + 11 `catch (e)` with no body or only a comment).

**Key locations in `visual.ts`:** Lines 1625, 1881, 2154, 2198, 2239, 2289, 2305, 2552–2557, 3238, 3576, 3882, 3912, 3917, 3948, 3969, 3997, 4044, 4048.

**Fix for each:**
- **Critical operations** (selection, data parsing): Add at minimum `console.warn()` logging
- **DOM operations** that genuinely may fail (e.g., `getBoundingClientRect` on detached nodes): Keep silent but add a comment explaining why
- **Vis.js internal calls** (e.g., `setCustomTime` fallback to `addCustomTime`): These are intentional fallback patterns — add inline comments documenting the pattern

---

## 7. Supporting File Improvements

### 7.1 `src/data/columnResolver.ts`
- **Deduplicate role parsing:** `getRoleOrderForCol` has identical logic blocks for `content` (Lines 114–122) and `group` (Lines 125–133) roles. Unify.
- **Deduplicate metadata column finding:** `getMetadataColumnIndex` (Lines 167–182) duplicates logic from `getRoleOrderForCol` (Lines 144–162).
- **Deduplicate sorting functions:** Content indices sorting (Lines 185–202) and group indices sorting (Lines 210–227) are identical — extract shared helper.
- **Break up `resolveColumnRoles`:** At 265 lines, this function is too long. Split into `resolveContentColumns()`, `resolveGroupColumns()`, `resolveSpecialColumns()`.

### 7.2 `src/data/dataParser.ts`
- **Type the `any` parameters:** Rows and columns are typed as `any[]` (Lines 14–17). Create proper interfaces.
- **Deduplicate highlight checks:** `hasExternalHighlights` and `isRowExternallyHighlighted` (Lines 107–152) share duplicated iteration logic.
- **Break up `sortGroups`:** At 126 lines (Lines 154–280), this function handles too many sorting branches. Extract comparator functions.

### 7.3 `src/utils/domUtils.ts`
- **Move `formatContentFieldValue` out:** This function parses dates — it belongs in `dateUtils.ts` or a new `formatUtils.ts`, not `domUtils.ts`.
- **Deduplicate date formatting:** The `parseDate → moment.format` pattern is repeated 3 times inside `formatContentFieldValue`.
- **Consolidate DOM parsers:** `sanitizeHtmlToText` and `renderHtmlContent` both instantiate `DOMParser` with overlapping fallback logic — share a common helper.

### 7.4 `src/styling/colorThemes.ts`
- **Remove duplicate palette:** The `standard` and `eventColor` themes define identical 15-color palettes. Deduplicate by referencing a shared array.
- **Type the `themeKey` parameter:** `getColorTheme` accepts `themeKey?: any` — type it properly.

### 7.5 `src/styling/markerStyling.ts`
- **Move `findMostRecentItemId` out:** This function iterates items to compare timestamps — it's data logic, not styling. Move to `dataParser.ts` or a utility.
- **Type all parameters:** `item: any`, `mostRecentSelectedId: any`, `searchMatchedItemIds: Set<any>` should all be properly typed.

### 7.6 `src/formattingSettingsService.ts`
- **Reduce `any` usage:** Lines 42, 57, 62, 65, 232, 241, 256 use `any` for slices and objects. Create proper types for `FormattingSlice` variants.

### 7.7 `src/utils/dateUtils.ts`
- **Document magic numbers:** Values like `86400000`, `3600000` should be named constants.
- **Reduce nesting:** The time parsing logic has deeply nested branches for military time, epoch ms, decimal hours, and fraction of a day.

---

## 8. UI Manager Improvements

### 8.1 `src/ui/topBar.ts`
- Remove dead `renderTopBarGroupOrderSection` function (Lines 153–267)
- Fix type safety: `(sortSelect.value as OrderByOption)` and empty catch blocks

### 8.2 `src/ui/detailsPanel.ts`
- **Break up `renderDetailsItemCard`:** At 190 lines (Lines 273–463), this function is far too long
- **Type timeline items:** Replace `(item: any)` and `Set<any>` with proper interfaces
- **Remove DOM property hack:** `(card as any).__itemId = item.id` — use a `WeakMap` or data attribute instead

### 8.3 `src/ui/tooltipManager.ts`
- **Break up `showEnhancedColorTooltip`:** At 200+ lines (Lines 212–418), this is far too long
- **Reduce fragility of `applyEnhancedTooltipStyles`:** The `requestAnimationFrame` + `setTimeout` polling approach (Lines 137–210) to modify PowerBI tooltip DOM elements is brittle
- **Type items properly:** Replace generic `any` for items from `getItemsUnderPointer`

### 8.4 `src/ui/landingPage.ts`
- **Break up `showLandingPage`:** At 126 lines (Lines 44–170), it's mostly manual DOM creation. Consider using a template or builder pattern.

### 8.5 Move Mini-Timeline Interactions
Lines 703–792 in `visual.ts` contain pointer event handlers for the mini timeline that calculate X-coordinates and manage drag states. This logic belongs inside `MiniTimelineManager`, not `Visual`.

---

## 9. CSS/LESS Improvements (`style/visual.less`)

### 9.1 Deduplicate Flag/Sash Color Variables
Lines 10–18 (`--flag-color`) and Lines 20–28 (`--sash-color`) define the exact same hex values. Extract shared color variables:
```less
@marker-red: #c8483b;
@marker-blue: #3677a8;
// ...
.flag-red { --flag-color: @marker-red; }
.sash-red { --sash-color: @marker-red; }
```

### 9.2 Reduce Cross-Highlight Selector Bloat
Selectors like `.cross-highlight-selected.has-flag .vis-dot` and `&.vis-selected.has-flag .vis-dot` create massive repetitive blocks. Refactor using CSS variables or shared modifier classes to reduce overall size.

---

## 10. Consolidate Magic Values

### 10.1 Scatter Hex Color Codes
Magic hex codes like `#3677a8`, `#0078d4`, `#555555` appear across `colorUtils.ts`, `markerStyling.ts`, `visual.ts`, and `visual.less`.
**Fix:** Consolidate all color constants into `constants.ts` or `colorThemes.ts`.

### 10.2 Hardcoded Padding/Offset Values
`PADDING_OFFSETS` and `PADDING_VALUES` in `constants.ts` use hardcoded numeric values with comments like "hard coded".
**Fix:** Verify these are still actively used; if styling has moved to CSS, remove them.

---

## 11. Redundant Variable Declarations

### 11.1 Shadowed `isMultiSelect`
**Location:** Line 2479 and 2525 in `visual.ts`
`const isMultiSelect = selectedCount > 1;` is declared at top of `doCheckItemWidths` and re-declared inside the `.forEach` loop.
**Fix:** Remove the shadowed inner declaration.

### 11.2 Redundant Update Type Booleans
**Location:** Lines 2817–2829 in `visual.ts`
Variables `isResizeOnly`, `isStyleOnly`, `isViewModeOnly`, `isExplicitReload` are created only to be immediately combined into `isFilterChangeOrReload` on Line 2836.
**Fix:** Inline the conditions directly.

### 11.3 Redundant Fallback `|| ''`
**Location:** Line 3314 in `visual.ts`
```typescript
const eventType = (colMap['eventType'] !== undefined && row[colMap['eventType']] != null
    ? String(row[colMap['eventType']]) : '') || '';
```
The ternary already returns `''` — the trailing `|| ''` is redundant.

### 11.4 Throwaway Intermediate Variables
**Location:** Lines 3445–3447 in `visual.ts`
`contentWithoutNames` and `contentWithNames` are declared solely to be immediately combined into `content`.
**Fix:** Inline directly.

### 11.5 Unnecessary Selection Loop
**Location:** Lines 1823–1830 in `visual.ts`
Uses `.forEach` + `.push` to populate `selectedItems`.
**Fix:** Replace with `.filter()`.

---

## Suggested Execution Order

For maximum impact with minimum risk, execute these changes in this order:

1. **Remove dead code** (§3) — zero-risk, immediate size reduction
2. **Remove unused dependencies** (§3.2) — clean up `package.json`
3. **Extract type definitions** (§4.1–4.7) — foundation for all other changes
4. **Extract data transformation module** (§1.1) — largest single extraction (~560 lines)
5. **Deduplicate logic** (§2) — systematic cleanup pass
6. **Extract selection manager** (§1.2) — second-largest extraction
7. **Extract remaining modules** (§1.3–1.6) — incremental extractions
8. **Break up long methods** (§1.7–1.10) — improve readability
9. **Simplify complex logic** (§5) — dictionary lookups, early returns
10. **Address empty catches** (§6) — add logging or documentation
11. **Supporting file improvements** (§7) — utility cleanup
12. **UI manager improvements** (§8) — break up long methods
13. **CSS improvements** (§9) — reduce stylesheet size
14. **Consolidate magic values** (§10) — final polish

After all changes, `visual.ts` should be reduced from ~4,055 lines to approximately **1,500–2,000 lines**, with the extracted logic living in well-typed, focused modules.
