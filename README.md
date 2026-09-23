# Power BI Timeline Visual

<p>
  <small>Custom Visual for Microsoft Power BI</small>
</p>

### An interactive, multi-track timeline visual for exploring chronological events, project milestones, clinical pathways, and temporal workflows.

The **Power BI Timeline Visual** provides a rich, responsive interface for plotting time-based data across horizontal swimlanes. It enables report consumers to seamlessly navigate between macro-level multi-year overviews and micro-level minute-by-minute event logs, perform real-time keyword searches with instant canvas highlighting, inspect in-depth event metadata in an expandable side panel, and cross-filter other visuals on the report page.

---

## Features

- **Multi-Track Swimlanes**: Organize events into rows by category, department, or pathway, with customizable sorting (Group Order field, alphabetical, or most recent event).
- **Point & Range Events**: Seamlessly render both instantaneous point events (single timestamp) and duration intervals (start date to end date).
- **Synchronized Mini Timeline Navigator**: An integrated brush/overview slider providing high-level context and rapid pan/zoom navigation across extensive date ranges.
- **Dynamic Top Filter Bar**: Filter by high-level category (Top Level Group), reorder swimlanes on the fly, and perform real-time text searches.
- **Interactive In-Visual Search**: Instantly highlight matching markers on the canvas with real-time match counts (`X of Y events found`).
- **Rich Event Details Side Panel**: Inspect complete event metadata, formatted dates, and descriptions with expandable *"see more..."* text and automatic hyperlink detection.
- **Bi-Directional Cross-Filtering**: Selecting an event marker can cross-filter other visuals on the report page (tables, charts, cards) while respecting external report filters.
- **Comprehensive Formatting Controls**: Full control over fonts, font sizes, colors, and granular padding for the timeline axis, swimlanes, top bar, and details panel.
- **Accessibility & High Contrast Support**: Built-in compatibility with Power BI high contrast themes and keyboard focus navigation.

---

## Getting Started

The Power BI Timeline Visual requires a minimum of **one** data field: **Start Date**. All other fields are optional.

When only **Start Date** is mapped, the visual renders all records as point markers along a single default timeline track. Adding optional fields unlocks multi-row grouping, duration ranges, top-level filtering, custom color-coding, and rich detail inspection.

### Minimum Data Required

| Field | Required | Description |
| :--- | :---: | :--- |
| **Start Date** | **Yes** | A valid Date or DateTime field indicating when the event occurred or began. Observations are plotted chronologically along the horizontal time axis. |

### Optional Data Fields

| Field | Description |
| :--- | :--- |
| **End Date** | An optional end date or datetime. When populated and distinct from **Start Date**, the visual renders a horizontal duration bar (range) spanning from start to end instead of a single point marker. |
| **Group** | Categorical field used to group events into distinct horizontal swimlanes (e.g. *Department*, *Patient Pathway*, *Stream*, *Milestone Category*). When omitted, all events appear in a single unified row. |
| **Top Level Group** | A higher-level categorical entity (e.g. *Patient ID*, *Project Name*, *Case Number*, *Facility*). When populated, the visual renders a dedicated filter dropdown in the top bar (or a landing selector) allowing report consumers to focus on a single subject's timeline at a time. |
| **Event Type** | Classification or category of the event (e.g. *Consultation*, *Prescription*, *Milestone*, *Alert*, *Phase*). Displayed prominently in tooltips and the Event Details panel header, and used to differentiate marker icons and colors. |
| **Content** | Descriptive body text, clinical notes, or detailed event comments. Displayed in the hover tooltip and the Event Details side panel with automatic URL hyperlinking and expandable text formatting. |
| **Color** | Custom hex color code (e.g. `#0078d4`, `#d83b01`) supplied from your data model to color code individual event markers or duration bars. |
| **Group Color** | Custom hex color code applied to the swimlane track background or group label header. |
| **Group Order** | A numeric or alphanumeric sort column used to enforce explicit custom ordering of swimlane rows (overriding standard alphabetical or chronological sorting). |
| **Event Class** | Custom CSS class string mapped from your dataset to apply bespoke styling or highlight badges to matching markers. |

---

## Visual Components & Interaction

```
+-----------------------------------------------------------------------------------------------+-------------------------------+
| [Top Level Group: Patient A v] [Order by: Most Recent v]       [ Search events... (Q) [x] ]  | EVENT DETAILS (1 selected)   |
+-----------------------------------------------------------------------------------------------+-------------------------------+
| Main Timeline Canvas                                                                           | Type: Consultation            |
|                                                                                               | Date: 14 Oct 2024 10:30       |
| Cardiology   |-----[*]---------------------[==========]------------------------|             | Group: Outpatient Clinic      |
|                                                                                               |                               |
| Pharmacy     |------------------[*]--------------------------------------------|             | Description:                  |
|                                                                                               | Patient attended follow-up... |
| Radiology    |-------------[*]-------------------------------------------------|             | see more...                   |
+-----------------------------------------------------------------------------------------------+                               |
| Mini Timeline Navigator (Overview Brush)                                                      | Links:                        |
| [===========|====== viewport ======|=========================================]               | https://example.com/record    |
+-----------------------------------------------------------------------------------------------+-------------------------------+
```

### 1. Main Timeline Canvas
- **Horizontal Time Axis**: Displays formatted time divisions adapting dynamically to the current zoom level (Years &rarr; Quarters &rarr; Months &rarr; Weeks &rarr; Days &rarr; Hours &rarr; Minutes).
- **Swimlanes**: Distinct horizontal rows corresponding to unique values of the **Group** field.
- **Markers & Duration Bars**: 
  - Point events display as distinct markers (diamond, circle, or icon).
  - Duration events display as filled horizontal bars spanning from **Start Date** to **End Date**.
- **Zoom & Pan**: Use the mouse scroll wheel (or trackpad pinch) to zoom in and out smoothly. Click and drag the background canvas to pan through time.

### 2. Mini Timeline Navigator
- Situated below the main canvas, the Mini Timeline shows an uninterrupted overview of the entire dataset date range.
- The highlighted window represents the active viewport of the main canvas. Drag the window to pan quickly, or drag its resize handles to expand or contract the visible date range.

### 3. Top Filter & Search Bar
- **Top Level Group Dropdown**: Switch between individual cases, patients, or entities without needing a separate report slicer.
- **Group Ordering Dropdown**: Sort swimlanes by Group Order field value, alphabetically, or by most recent event date in real time.
- **Live Text Search**: 
  - Type any keyword to search across event types, contents, and group names.
  - Matching markers remain highlighted on the timeline while non-matching markers are dimmed.
  - A dynamic counter indicates `X of Y events found`.
  - Click the **[x]** button or clear the input to restore the full visual state.
  - The search input can be shown or hidden via the Formatting Pane.

### 4. Event Details Panel
- Located on the right side of the visual, this panel displays rich contextual information when an event is clicked.
- **Header**: Shows selection status (`1 event selected` or matching count).
- **Core Metadata**: Highlights Event Type, formatted Date/Time, and Group name.
- **Content Section**: Renders the complete textual notes or descriptions. For lengthy narratives, text is truncated with a matching *"see more..."* toggle that expands inline to reveal the full content.
- **Automatic Link Detection**: Any URL starting with `http://` or `https://` is automatically converted into a secure, clickable hyperlink displaying as *"View"* that opens in a new browser tab.
- **Empty State**: Displays a customizable prompt when no event is currently selected.

### 5. Selection & Cross-Filtering
- **Single Selection**: Click any event marker to view its details and cross-filter other visuals on the report page (when cross-filtering is enabled).
- **Multi-Selection**: Hold <kbd>Ctrl</kbd> (Windows) or <kbd>Cmd</kbd> (macOS) while clicking markers to select multiple events.
- **Clear Selection**: Click anywhere on the empty timeline canvas to deselect and reset the details panel and cross-filters.
- **External Selection**: When filtering records from an external visual (e.g. selecting a row in a Power BI table), the timeline highlights the filtered events while preserving overall timeline navigation context.

---

## Format Options

The **Format** pane in Power BI provides comprehensive controls for styling every element of the visual:

### Timeline
| Option | Description |
| :--- | :--- |
| **Maximum Zoom Level** | Sets the maximum zoom depth limit (*12 Hours*, *Day*, *Week*, or *Month*) to prevent excessive zoom on dense datasets. |
| **Font Family** | Font family applied to timeline axis headers and time tick labels. |
| **Font Size** | Font size (in points) for timeline axis labels. |
| **Font Color** | Color of the axis text and scale divisions. |

### Markers
| Option | Description |
| :--- | :--- |
| **Marker Height** | Height of event markers and duration bars in pixels. |
| **Padding** | Vertical padding around markers in pixels, dictating the height of the swimlanes. |
| **Cross-filter other visuals** | When turned **On**, clicking an event marker filters other visuals on the report page. When **Off**, selections only update the in-visual Details Panel. |

### Mini Timeline
| Option | Description |
| :--- | :--- |
| **Show Mini Timeline** | Shows or hides the bottom overview navigator bar. |
| **Size** | Height of the mini timeline navigator in pixels. |
| **Font Family / Size / Color** | Typography settings for the mini timeline axis labels. |

### Groups
| Option | Description |
| :--- | :--- |
| **Show Ordering Dropdown** | Displays or hides the swimlane sorting dropdown on the top bar. |
| **Order by** | Sets the default sorting mode: *Group Order* (default, uses the Group Order field value), *Alphabetical*, or *Most Recent Event*. |
| **Direction** | Sort direction: *Ascending* or *Descending* (automatically disabled when *Group Order* is selected). |
| **Font Family / Size / Color** | Typography settings for the swimlane group headers on the left of the canvas. |

### Top Bar
| Option | Description |
| :--- | :--- |
| **Show Text Search** | Toggle to show or hide the text search input box on the top bar. |
| **Top / Bottom / Left / Right padding** | Granular padding adjustments (in pixels) for the top navigation bar. |
| **Font Family / Size / Color** | Typography settings for the top bar dropdowns, search input, and counters. |

### Details Panel
| Option | Description |
| :--- | :--- |
| **Show Details Panel** | Toggles the visibility of the right-hand Event Details panel. |
| **Initial Width** | Width of the details panel in pixels. |
| **Top / Bottom / Left / Right padding** | Granular padding adjustments (in pixels) for the details panel content body. |
| **Header Font Family / Size / Color** | Typography settings for the Event Details header title and selection counter. |
| **Font Family / Size / Color** | Typography settings for the details body text, fields, and *"see more..."* links. |
| **No Selection Message** | Custom placeholder text displayed when no event is selected (e.g. *"Select a marker to view details"*). |
| **Show field names** | Toggle showing or hiding data field labels before values in the content section. |

---

## Usage Notes & Best Practices

1. **Date & Time Formatting**:
   - Ensure your date columns in Power BI are set to Date or DateTime data types.
   - Event dates in both the Event Details panel and hover tooltips are consistently formatted as `dd MMM yyyy HH:mm` (e.g. `14 Oct 2024 10:30` or `14 Oct 2024 10:30 - 14 Oct 2024 11:45`).
   - The visual automatically detects whether times are present. If all events occur at midnight (`00:00`), timestamps are omitted from timeline axis labels for a cleaner display.
2. **Optimizing Large Datasets**:
   - Power BI custom visuals can load up to 30,000 data rows. When visualizing high-volume event logs, map a high-level categorical column to **Top Level Group** (such as *Case ID* or *Customer ID*) or use standard report slicers to keep rendering lightning-fast.
3. **Point vs. Range Visualizations**:
   - If an event has no **End Date**, or if **End Date** matches **Start Date**, it is rendered as an instantaneous point event marker.
   - If **End Date** is after **Start Date**, the visual automatically renders a duration bar. If your data contains rows where End Date precedes Start Date, the visual gracefully clamps the range to a point event.
4. **Interactive Hyperlinks**:
   - Any URLs included within event content are recognized automatically and presented with clean *"View"* link text in both the Event Details panel and hover tooltips. When clicked in the details panel, they launch in a secure external browser window (`rel="noopener noreferrer"`).
5. **High Contrast Mode**:
   - The visual automatically detects when Power BI is operating under a High Contrast theme, applying high-contrast borders and text colors to maintain full accessibility compliance.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
