/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict"; 

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "./formattingSettingsService";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

import { VisualFormattingSettingsModel } from "./settings";

import { Timeline, TimelineOptions, DataItem, DataGroup, Graph2d } from "vis-timeline/peer";
import { DataSet } from "vis-data";
import * as _moment from "moment";
type Moment = _moment.Moment;
const moment: any = (_moment as any).default || _moment;

import {
    OrderByOption,
    OrderDirectionOption,
    HighContrastSettings,
    FontSettings,
    ActiveSortInfo,
    GroupDateStats
} from "./types";
import { COLOR_MAP, SVG_NS, FONT_SIZE_OFFSETS, PADDING_OFFSETS, PADDING_VALUES } from "./constants";
import {
    normalizeColor,
    extractDecorationClass,
    extractFlagClass,
    extractSashClass,
    getItemSashFlagVars,
    getRgbFromColor,
    getReadableTextColorForBg,
    getDeselectedMarkerColors
} from "./utils/colorUtils";
import { parseDate, parseTime, combineDateAndTime, formatEventDate, isDateColumn, formatDateAsDDMMMYYYY } from "./utils/dateUtils";
import {
    openExternalUrl,
    bindAnchorLinkInteractions,
    measureMaxTextWidth,
    textContainsTerm,
    setElementCssVar,
    sanitizeHtmlToText,
    buildUrlFragment,
    renderHtmlContent,
    highlightSearchTermInElement,
    formatContentFieldValue
} from "./utils/domUtils";
import {
    computeItemStyleAndClass,
    findMostRecentItemId,
    getItemContent,
    formatContentForTooltip
} from "./styling/markerStyling";
import { getColorTheme } from "./styling/colorThemes";
import { resolveColumnRoles } from "./data/columnResolver";
import {
    computeDataSignature,
    getActiveSortInfo,
    hasExternalHighlights,
    isRowExternallyHighlighted,
    sortGroups
} from "./data/dataParser";
import { StatusOverlayManager } from "./ui/statusOverlay";
import { LandingPageManager } from "./ui/landingPage";
import { TopBarManager } from "./ui/topBar";
import { DetailsPanelManager } from "./ui/detailsPanel";
import { TooltipManager } from "./ui/tooltipManager";
import { MiniTimelineManager } from "./timeline/miniTimelineManager";

export class Visual implements IVisual {
    private statusOverlayManager!: StatusOverlayManager;
    private landingPageManager!: LandingPageManager;
    private topBarManager!: TopBarManager;
    private detailsPanelManager!: DetailsPanelManager;
    private miniTimelineManager!: MiniTimelineManager;
    private tooltipManager!: TooltipManager;

    private target!: HTMLElement;
    private statusOverlay!: HTMLElement;
    private statusTitle!: HTMLElement;
    private statusMessage!: HTMLElement;
    private statusDetails!: HTMLElement;
    private landingPageOverlay!: HTMLElement;
    private topBar!: HTMLElement;
    private fitTimelineButton!: HTMLElement;
    private contentContainer!: HTMLElement;
    private timelineArea!: HTMLElement;
    private detailsPanel!: HTMLElement;
    private detailsPanelResizer!: HTMLElement;
    private detailsPanelWidth: number | null = null;
    private lastConfiguredInitialWidth: number | null = null;
    private lastSelectedMarkerSignature: string = '';
    private miniTimelineLeftSpacer!: HTMLElement;
    private detailsPanelHeader!: HTMLElement;
    private detailsHeaderCount!: HTMLElement;
    private detailsPanelBody!: HTMLElement;
    private mostRecentSelectedId: any = null;
    private expandedItemIds: Set<any> = new Set();

    private mainTimelineContainer!: HTMLElement;
    private miniTimelineContainer!: HTMLElement;
    private mainTimeline: Timeline | null = null;
    private miniTimeline: Graph2d | null = null;
    private items!: DataSet<DataItem>;
    private miniItems!: DataSet<DataItem>;
    private groups!: DataSet<DataGroup>;
    private miniGroups!: DataSet<DataGroup>;
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService!: FormattingSettingsService;
    private host!: IVisualHost;
    private colorPalette: ISandboxExtendedColorPalette | null = null;
    private events: IVisualEventService | null = null;
    private localizationManager: ILocalizationManager | null = null;
    private allowInteractions: boolean = true;
    private selectionManager!: ISelectionManager;
    private tooltipService!: ITooltipService;
    private selectState: string = 'none';
    private dragStartTime: Date | null = null;
    private isDrawingMiniTimeline: boolean = false;
    private isInternalDataUpdate: boolean = false;
    private currentSelectedIds: any[] = [];
    private currentSelectedKeys: Set<string> = new Set();
    private currentSelectedItemIds: Set<any> = new Set();
    private miniShadeLeft!: HTMLElement;
    private miniShadeRight!: HTMLElement;
    private activeMiniDragBar: 'selectStartTime' | 'selectEndTime' | null = null;
    private lastMiniScale: string = '';
    private lastMiniStep: number = 0;
    private selectedTopLevelGroup: string | null = null;
    private lastUpdateOptions: VisualUpdateOptions | null = null;
    private lastRenderedTopLevelGroup: string | null = null;
    private lastGroupHeaderClickTime: number = 0;
    private lastGroupHeaderClickedId: any = null;
    private searchTerm: string = '';
    private searchInputEl: HTMLInputElement | null = null;
    private searchClearBtn: HTMLButtonElement | null = null;
    private searchMatchedItemIds: Set<any> = new Set<any>();
    private currentMainTimelineScrollTop: number = 0;
    private isMainTimelineDraggingGesture: boolean = false;
    private mainTimelinePointerDownPos: { x: number, y: number, time: number } | null = null;
    private previousCollapseSubgroupsOnLoad?: boolean;
    private hasSubgroups: boolean = false;
    private currentZoomMinMs: number = 1000 * 60 * 60 * 24;
    private lastDataSpanMs: number = 0;
    private static generateVisualInstanceId(): string {
        try {
            if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
                const array = new Uint32Array(2);
                window.crypto.getRandomValues(array);
                return Array.from(array, x => x.toString(36)).join('').substring(0, 7);
            }
        } catch {}
        return 'vis_' + Date.now().toString(36);
    }
    private visualInstanceId: string = Visual.generateVisualInstanceId();
    private currentHoveredMarkerId: any = null;
    private globalListeners: any = null;
    private loadingOverlay!: HTMLElement;
    private hasLoadedOnce: boolean = false;
    private lastDataSignature: string = '';
    private currentUpdateId: number = 0;
    private enhancedTooltipElement: HTMLElement | null = null;
    private enhancedTooltipHeader: HTMLElement | null = null;
    private enhancedTooltipTitleText: HTMLElement | null = null;
    private enhancedTooltipBadges: HTMLElement | null = null;
    private enhancedTooltipBadgeMore: HTMLElement | null = null;
    private enhancedTooltipDate: HTMLElement | null = null;
    private enhancedTooltipContentContainer: HTMLElement | null = null;
    private enhancedTooltipContent: HTMLElement | null = null;
    private enhancedTooltipMoreHint: HTMLElement | null = null;
    private currentTooltipFontFamily: string = '';
    private currentTooltipFontSize: number = 0;

    constructor(options: VisualConstructorOptions) {
        try {
            this.host = options.host;
            this.colorPalette = options.host ? options.host.colorPalette : (null as any);
            this.events = options.host ? options.host.eventService : (null as any);
            this.localizationManager = options.host && typeof options.host.createLocalizationManager === 'function'
                ? options.host.createLocalizationManager()
                : (null as any);
            this.allowInteractions = options.host && typeof (options.host as any).allowInteractions === 'boolean'
                ? (options.host as any).allowInteractions
                : true;
            this.tooltipService = options.host ? options.host.tooltipService : (null as any);
            this.selectionManager = this.host ? this.host.createSelectionManager() : (null as any);
            this.formattingSettingsService = new FormattingSettingsService();
            this.target = options.element;
            this.target.classList.add("visual-container");
            this.target.style.position = "relative";
            this.target.style.width = "100%";
            this.target.style.height = "100%";
            this.target.tabIndex = 0;
            this.target.setAttribute("role", "region");
            this.target.setAttribute("aria-label", "Event Timeline Visual");

            this.target.addEventListener("keydown", (event: KeyboardEvent) => {
                if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
                if (event.key === "Escape") {
                    if (this.searchTerm) {
                        this.clearTextSearch();
                    } else {
                        if (this.isCrossFilterEnabled() && this.selectionManager) {
                            this.selectionManager.clear().catch(() => {});
                        }
                        this.currentSelectedIds = [];
                        this.currentSelectedKeys.clear();
                        this.currentSelectedItemIds.clear();
                        this.applySelectionStyles([]);
                        this.renderDetailsPanel();
                    }
                } else if (event.key === "Home") {
                    this.showEntireTimeline();
                }
            });

            // Top Filter Bar
            this.topBarManager = new TopBarManager(this.target);
            this.topBar = this.topBarManager.topBar;

            // Main Content Container (holds timelines on left, details on right)
            this.contentContainer = document.createElement("div");
            this.contentContainer.className = "visual-content-container";
            this.target.appendChild(this.contentContainer);

            // Timeline Area
            this.timelineArea = document.createElement("div");
            this.timelineArea.className = "timeline-area";
            this.contentContainer.appendChild(this.timelineArea);

            // Fit entire timeline button
            this.fitTimelineButton = document.createElement("button");
            this.fitTimelineButton.className = "timeline-fit-button";
            const fitTitle = this.getLocalizedString("timelineFitButton_title", "Show entire timeline");
            this.fitTimelineButton.title = fitTitle;
            this.fitTimelineButton.setAttribute("aria-label", fitTitle);
            this.fitTimelineButton.tabIndex = 0;
            this.fitTimelineButton.setAttribute("role", "button");
            this.fitTimelineButton.addEventListener("keydown", (e: KeyboardEvent) => {
                if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showEntireTimeline();
                }
            });

            const svgNS = SVG_NS;
            const fitSvg = document.createElementNS(svgNS, "svg");
            fitSvg.setAttribute("width", "14");
            fitSvg.setAttribute("height", "14");
            fitSvg.setAttribute("viewBox", "0 0 24 24");
            fitSvg.setAttribute("fill", "none");
            fitSvg.setAttribute("stroke", "currentColor");
            fitSvg.setAttribute("stroke-width", "2");
            fitSvg.setAttribute("stroke-linecap", "round");
            fitSvg.setAttribute("stroke-linejoin", "round");

            const poly1 = document.createElementNS(svgNS, "polyline");
            poly1.setAttribute("points", "5 9 2 12 5 15");
            fitSvg.appendChild(poly1);

            const poly2 = document.createElementNS(svgNS, "polyline");
            poly2.setAttribute("points", "19 9 22 12 19 15");
            fitSvg.appendChild(poly2);

            const lineCenter = document.createElementNS(svgNS, "line");
            lineCenter.setAttribute("x1", "2");
            lineCenter.setAttribute("y1", "12");
            lineCenter.setAttribute("x2", "22");
            lineCenter.setAttribute("y2", "12");
            fitSvg.appendChild(lineCenter);

            const lineLeft = document.createElementNS(svgNS, "line");
            lineLeft.setAttribute("x1", "2");
            lineLeft.setAttribute("y1", "5");
            lineLeft.setAttribute("x2", "2");
            lineLeft.setAttribute("y2", "19");
            fitSvg.appendChild(lineLeft);

            const lineRight = document.createElementNS(svgNS, "line");
            lineRight.setAttribute("x1", "22");
            lineRight.setAttribute("y1", "5");
            lineRight.setAttribute("x2", "22");
            lineRight.setAttribute("y2", "19");
            fitSvg.appendChild(lineRight);

            this.fitTimelineButton.appendChild(fitSvg);
            this.fitTimelineButton.addEventListener("click", (e: MouseEvent) => {
                if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
                e.stopPropagation();
                e.preventDefault();
                this.showEntireTimeline();
            });
            this.timelineArea.appendChild(this.fitTimelineButton);

            // Global drag release handling for main timeline: finish drag when mouse is released anywhere
            const handleGlobalUp = (event: MouseEvent | PointerEvent) => {
                if (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null || this.isMainTimelineDraggingGesture) {
                    this.finishMainDrag(event);
                    setTimeout(() => {
                        this.isMainTimelineDraggingGesture = false;
                        this.mainTimelinePointerDownPos = null;
                    }, 120);
                }
            };
            window.addEventListener('pointerup', handleGlobalUp, true);
            window.addEventListener('mouseup', handleGlobalUp, true);
            document.addEventListener('pointerup', handleGlobalUp, true);
            document.addEventListener('mouseup', handleGlobalUp, true);

            const handleCheckButtons = (event: MouseEvent | PointerEvent) => {
                const isDown = (event.buttons > 0) || ((event as any).which > 0);
                if (this.mainTimelinePointerDownPos && isDown) {
                    const dx = event.clientX - this.mainTimelinePointerDownPos.x;
                    const dy = event.clientY - this.mainTimelinePointerDownPos.y;
                    if (Math.hypot(dx, dy) > 4) {
                        this.isMainTimelineDraggingGesture = true;
                    }
                }
                if (!isDown) {
                    if (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null) {
                        this.finishMainDrag(event);
                    }
                }
            };
            window.addEventListener('pointermove', handleCheckButtons, true);
            window.addEventListener('mousemove', handleCheckButtons, true);
            const handleBlur = (e: FocusEvent) => {
                if (e.target === window && (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null)) {
                    this.finishMainDrag();
                }
            };
            window.addEventListener('blur', handleBlur, false);

            this.globalListeners = {
                handleGlobalUp,
                handleCheckButtons,
                handleBlur
            };

            // Main Timeline Container
            this.mainTimelineContainer = document.createElement("div");
            this.mainTimelineContainer.id = "main-timeline-" + this.visualInstanceId;
            this.mainTimelineContainer.classList.add("main-timeline");
            this.timelineArea.appendChild(this.mainTimelineContainer);

            // Mini Timeline Manager
            this.miniTimelineManager = new MiniTimelineManager(this.timelineArea, this.visualInstanceId);
            this.miniTimelineContainer = this.miniTimelineManager.miniTimelineContainer;
            this.miniTimelineLeftSpacer = this.miniTimelineManager.miniTimelineLeftSpacer;
            this.miniShadeLeft = this.miniTimelineManager.miniShadeLeft;
            this.miniShadeRight = this.miniTimelineManager.miniShadeRight;

            // Details Panel Manager
            this.detailsPanelManager = new DetailsPanelManager(
                this.target,
                this.contentContainer,
                (key, fb) => this.getLocalizedString(key, fb),
                (url) => openExternalUrl(url, this.host),
                () => this.clearAllMarkerHoverGlow(),
                () => {
                    this.mainTimeline?.redraw();
                    this.updateMiniTimelineLayout();
                    this.checkItemWidths();
                },
                () => this.allowInteractions !== false && (!this.host || (this.host as any).allowInteractions !== false)
            );
            this.detailsPanel = this.detailsPanelManager.detailsPanel;
            this.detailsPanelResizer = this.detailsPanelManager.detailsPanelResizer;
            this.detailsPanelHeader = this.detailsPanelManager.detailsPanelHeader;
            this.detailsHeaderCount = this.detailsPanelManager.detailsHeaderCount;
            this.detailsPanelBody = this.detailsPanelManager.detailsPanelBody;

            // Status Overlay Manager
            this.statusOverlayManager = new StatusOverlayManager(
                this.target,
                () => this.fitTimelineButton,
                () => this.contentContainer,
                (key, fb) => this.getLocalizedString(key, fb)
            );
            this.statusOverlay = this.statusOverlayManager.statusOverlay;
            this.statusTitle = this.statusOverlayManager.statusTitle;
            this.statusMessage = this.statusOverlayManager.statusMessage;
            this.statusDetails = this.statusOverlayManager.statusDetails;
            this.loadingOverlay = this.statusOverlayManager.loadingOverlay;

            // Landing Page Manager
            this.landingPageManager = new LandingPageManager(
                this.target,
                () => this.fitTimelineButton,
                () => this.contentContainer,
                () => this.topBar,
                () => this.mainTimelineContainer,
                () => this.miniTimelineContainer
            );
            this.landingPageOverlay = this.landingPageManager.landingPageOverlay;

            this.items = new DataSet([]);
            this.groups = new DataSet([]);
            this.miniItems = new DataSet([]);
            this.miniGroups = new DataSet([]);

            // Power BI context menu on right click
            this.mainTimelineContainer.addEventListener('contextmenu', (event: MouseEvent) => {
                event.preventDefault();
                if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
                if (!this.selectionManager) return;
                try {
                    const props = (this.mainTimeline as any)?.getEventProperties ? (this.mainTimeline as any).getEventProperties(event) : null;
                    const targetId = props?.item;
                    const item = targetId != null ? this.items.get(targetId) as any : null;
                    this.selectionManager.showContextMenu(item?.selectionId || null, {
                        x: event.clientX,
                        y: event.clientY
                    });
                } catch (e) {
                    console.warn("contextmenu error:", e);
                }
            });

            // Tooltip Manager
            this.tooltipManager = new TooltipManager({
                target: this.target,
                tooltipService: this.tooltipService,
                getItemsUnderPointer: (x, y) => this.getItemsUnderPointer(x, y),
                getItemById: (id) => this.items.get(id),
                getHighContrastSettings: () => this.getHighContrastSettings(),
                getShowFieldNames: () => this.getShowFieldNames(),
                getLocalizedString: (key, fallback) => this.getLocalizedString(key, fallback)
            });
            this.enhancedTooltipElement = this.tooltipManager.enhancedTooltipElement;
            this.enhancedTooltipHeader = this.tooltipManager.enhancedTooltipHeader;
            this.enhancedTooltipTitleText = this.tooltipManager.enhancedTooltipTitleText;
            this.enhancedTooltipBadges = this.tooltipManager.enhancedTooltipBadges;
            this.enhancedTooltipBadgeMore = this.tooltipManager.enhancedTooltipBadgeMore;
            this.enhancedTooltipDate = this.tooltipManager.enhancedTooltipDate;
            this.enhancedTooltipContentContainer = this.tooltipManager.enhancedTooltipContentContainer;
            this.enhancedTooltipContent = this.tooltipManager.enhancedTooltipContent;
            this.enhancedTooltipMoreHint = this.tooltipManager.enhancedTooltipMoreHint;

        } catch (err) {
            console.error("Visual constructor error:", err);
        }
    }

    private ensureTimelinesInitialized(winStart?: Date, winEnd?: Date, minBuffer?: Date, maxBuffer?: Date) {
        if (this.mainTimeline) return;

        this.mainTimelineContainer.style.width = "100%";
        this.miniTimelineContainer.style.width = "100%";

        const defaultStart = winStart || moment().subtract(1, 'month').toDate();
        const defaultEnd = winEnd || moment().add(1, 'year').toDate();

        // Main Timeline Options
        const mainOptions: TimelineOptions = {
            width: "100%",
            height: "100%",
            locale: "en_EN",
            moment: (date: any) => moment(date),
            start: defaultStart,
            end: defaultEnd,
            min: minBuffer,
            max: maxBuffer,
            format: {
                minorLabels: {
                    millisecond: 'SSS',
                    second: 's',
                    minute: 'HH:mm',
                    hour: 'HH:mm',
                    weekday: 'ddd D',
                    day: 'D',
                    month: 'MMM',
                    year: 'YYYY'
                },
                majorLabels: {
                    millisecond: 'HH:mm:ss',
                    second: 'D MMMM HH:mm',
                    minute: 'ddd D MMMM',
                    hour: 'ddd D MMMM',
                    weekday: 'MMMM YYYY',
                    day: 'MMMM YYYY',
                    month: 'YYYY',
                    year: ''
                }
            },
            selectable: false,
            stack: false,
            verticalScroll: true,
            preferZoom: true,
            margin: {
                item: {
                    horizontal: 0,
                    vertical: 0
                },
                axis: 0
            },
            orientation: {
                axis: 'bottom',
                item: 'top'
            },
            tooltip: {
                delay: 0,
                overflowMethod: 'cap',
                template: function () {
                    return ""; // Disable default tooltip in favor of Power BI tooltip
                }
            },
            groupHeightMode: 'fixed',
            groupOrder: function (a: any, b: any) {
                const orderDiff = (a.order ?? 0) - (b.order ?? 0);
                if (orderDiff !== 0) return orderDiff;
                return String(a.id).localeCompare(String(b.id));
            },
            zoomMin: 1000 * 60 * 60 * 1 // 1 hour
        };

        this.mainTimeline = new Timeline(this.mainTimelineContainer, this.items, this.groups, mainOptions);

        // Protect against dragging continuing when mouse button was released outside the visual
        if ((this.mainTimeline as any)?.range) {
            const range = (this.mainTimeline as any).range;
            const origRangeOnDrag = range._onDrag.bind(range);
            range._onDrag = (event: any) => {
                const src = event?.srcEvent;
                if (src && (typeof src.buttons === 'number' || typeof src.which === 'number')) {
                    const isDown = (src.buttons > 0) || (src.which > 0);
                    if (!isDown) {
                        this.finishMainDrag(src);
                        return;
                    }
                }
                return origRangeOnDrag(event);
            };

            const origRangeWheel = range._onMouseWheel.bind(range);
            range._onMouseWheel = (event: any) => {
                if (event && (event.ctrlKey || event.metaKey)) {
                    return;
                }
                return origRangeWheel(event);
            };
        }
        if ((this.mainTimeline as any)?.itemSet) {
            const itemSet = (this.mainTimeline as any).itemSet;
            if (typeof itemSet._onDrag === 'function') {
                const origItemSetOnDrag = itemSet._onDrag.bind(itemSet);
                itemSet._onDrag = (event: any) => {
                    const src = event?.srcEvent;
                    if (src && (typeof src.buttons === 'number' || typeof src.which === 'number')) {
                        const isDown = (src.buttons > 0) || (src.which > 0);
                        if (!isDown) {
                            this.finishMainDrag(src);
                            return;
                        }
                    }
                    return origItemSetOnDrag(event);
                };
            }
            if (typeof itemSet._onGroupClick === 'function') {
                const origOnGroupClick = itemSet._onGroupClick.bind(itemSet);
                itemSet._onGroupClick = (event: any) => {
                    const target = event?.srcEvent?.target || event?.target;
                    // If the user clicked directly inside .vis-inner (the group name text), don't toggle nested groups so selection takes place without collapsing
                    if (target && target.closest && target.closest('.vis-inner')) {
                        return;
                    }
                    return origOnGroupClick(event);
                };
            }
        }

        this.mainTimelineContainer.addEventListener('scroll', (event: Event) => {
            if (this.isInternalDataUpdate) return;
            const target = event.target as HTMLElement | null;
            if (target && target.classList && target.classList.contains('vis-left')) {
                this.currentMainTimelineScrollTop = target.scrollTop;
            }
        }, true);

        this.mainTimeline.on('scrollSide', () => {
            this.isMainTimelineDraggingGesture = true;
            if (this.isInternalDataUpdate) return;
            const left = this.mainTimelineContainer ? this.mainTimelineContainer.querySelector('.vis-panel.vis-left') as HTMLElement | null : null;
            if (left && left.scrollTop >= 0) {
                this.currentMainTimelineScrollTop = left.scrollTop;
            }
        });
        this.mainTimeline.on('scroll', () => {
            this.isMainTimelineDraggingGesture = true;
            if (this.isInternalDataUpdate) return;
            if ((this.mainTimeline as any).props && typeof (this.mainTimeline as any).props.scrollTop === 'number') {
                const st = -(this.mainTimeline as any).props.scrollTop;
                if (st >= 0) {
                    this.currentMainTimelineScrollTop = st;
                }
            }
        });
        this.mainTimeline.on('verticalDrag', () => {
            this.isMainTimelineDraggingGesture = true;
            if (this.isInternalDataUpdate) return;
            if ((this.mainTimeline as any).props && typeof (this.mainTimeline as any).props.scrollTop === 'number') {
                const st = -(this.mainTimeline as any).props.scrollTop;
                if (st >= 0) {
                    this.currentMainTimelineScrollTop = st;
                }
            }
        });

        // Mini Timeline Options
        const configuredMiniHeight = Number((this.formattingSettings as any)?.miniTimelineCard?.height?.value);
        const initMiniHeight = (!isNaN(configuredMiniHeight) && configuredMiniHeight >= 50) ? configuredMiniHeight : 90;
        const miniOptions: any = {
            style: 'bar',
            moment: (date: any) => moment(date),
            barChart: {
                width: 2,
                sideBySide: false
            },
            drawPoints: false,
            dataAxis: {
                visible: false,
                left: {
                    range: {
                        min: 0,
                        max: 1
                    }
                }
            },
            start: minBuffer || defaultStart,
            end: maxBuffer || defaultEnd,
            min: minBuffer,
            max: maxBuffer,
            zoomable: false,
            moveable: false,
            showMinorLabels: true,
            showMajorLabels: false,
            height: initMiniHeight,
            autoResize: true
        };

        this.miniTimeline = new Graph2d(this.miniTimelineContainer, this.miniItems, this.miniGroups, miniOptions);
        this.miniTimelineManager.miniTimeline = this.miniTimeline;

        try {
            this.miniTimeline.addCustomTime(defaultStart, 'selectStartTime');
            this.miniTimeline.addCustomTime(defaultEnd, 'selectEndTime');
        } catch (e) {
            console.warn("Mini timeline custom time init warning:", e);
        }

        this.miniTimeline.on('timechange', () => {
            if (this.isDrawingMiniTimeline || this.activeMiniDragBar) return;
            this.selectState = 'adjusting';
            this.adjustTimeline();
        });

        this.miniTimeline.on('timechanged', () => {
            if (this.isDrawingMiniTimeline || this.activeMiniDragBar) return;
            this.selectState = 'none';
            this.adjustTimeline();
            this.checkItemWidths();
        });

        // Pointer event listeners to drag existing custom time bars or draw a new timeline window
        this.miniTimelineContainer.addEventListener("pointerdown", (event: PointerEvent) => {
            if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
            if (event.button !== 0 || !this.miniTimeline) return;

            // Area to the left of the minitimeline should not be interactive
            const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                || (this.miniTimeline as any)?.dom?.backgroundVertical;
            if (bgVert) {
                const bgRect = bgVert.getBoundingClientRect();
                if (event.clientX < bgRect.left) {
                    return;
                }
            }

            const target = event.target as HTMLElement | null;

            const nearBar = this.getNearMiniDragBar(event.clientX);
            const customTimeEl = target ? (target.closest(".vis-custom-time") as HTMLElement | null) : null;
            let detectedBar = nearBar;
            if (!detectedBar && customTimeEl) {
                if (customTimeEl.classList.contains("selectEndTime")) {
                    detectedBar = 'selectEndTime';
                } else if (customTimeEl.classList.contains("selectStartTime")) {
                    detectedBar = 'selectStartTime';
                } else {
                    detectedBar = this.getNearMiniDragBar(event.clientX) || 'selectStartTime';
                }
            }

            if (detectedBar) {
                // Dragging custom time bar handle directly
                this.activeMiniDragBar = detectedBar;
                try {
                    this.miniTimelineContainer.setPointerCapture(event.pointerId);
                } catch {}
                return;
            }

            const clickedTime = this.getMiniTimeFromX(event.clientX).toDate();
            this.isDrawingMiniTimeline = true;
            this.dragStartTime = clickedTime;

            try {
                this.miniTimelineContainer.setPointerCapture(event.pointerId);
            } catch {}

            this.miniTimeline.setCustomTime(clickedTime, 'selectStartTime');
            this.miniTimeline.setCustomTime(clickedTime, 'selectEndTime');
            this.setMiniShades(clickedTime, clickedTime);
        });

        this.miniTimelineContainer.addEventListener("pointermove", (event: PointerEvent) => {
            const bgVert = (this.miniTimeline as any)?.body?.dom?.backgroundVertical 
                || (this.miniTimeline as any)?.dom?.backgroundVertical;
            const isLeftOfTimeline = bgVert && event.clientX < bgVert.getBoundingClientRect().left;

            if (this.activeMiniDragBar && this.miniTimeline) {
                const currentTime = this.getMiniTimeFromX(event.clientX).toDate();
                this.miniTimeline.setCustomTime(currentTime, this.activeMiniDragBar);
                this.adjustTimeline(false);
                return;
            }

            if (!this.isDrawingMiniTimeline) {
                if (isLeftOfTimeline) {
                    this.miniTimelineContainer.style.cursor = 'default';
                    return;
                }
                // Update cursor based on proximity to drag bars
                const nearBar = this.getNearMiniDragBar(event.clientX);
                this.miniTimelineContainer.style.cursor = nearBar ? 'ew-resize' : 'crosshair';
                return;
            }

            if (!this.dragStartTime || !this.miniTimeline) return;

            const currentTime = this.getMiniTimeFromX(event.clientX).toDate();
            const earliest = this.dragStartTime < currentTime ? this.dragStartTime : currentTime;
            const latest = this.dragStartTime > currentTime ? this.dragStartTime : currentTime;

            this.miniTimeline.setCustomTime(earliest, 'selectStartTime');
            this.miniTimeline.setCustomTime(latest, 'selectEndTime');
            this.setMiniShades(earliest, latest);

            const spanMs = latest.getTime() - earliest.getTime();
            if (spanMs > 1000 * 60 * 60) {
                this.mainTimeline?.setWindow(earliest, latest, { animation: false });
            }
        });

        const finishMiniInteraction = (event: PointerEvent) => {
            try {
                this.miniTimelineContainer.releasePointerCapture(event.pointerId);
            } catch {}

            if (this.activeMiniDragBar) {
                this.activeMiniDragBar = null;
                this.adjustTimeline(false);
                this.checkItemWidths();
                return;
            }

            if (!this.isDrawingMiniTimeline) return;
            this.isDrawingMiniTimeline = false;

            if (!this.dragStartTime || !this.miniTimeline) return;

            const currentTime = this.getMiniTimeFromX(event.clientX).toDate();
            let earliest = this.dragStartTime < currentTime ? this.dragStartTime : currentTime;
            let latest = this.dragStartTime > currentTime ? this.dragStartTime : currentTime;

            // If user clicked or dragged a tiny sliver (< 2 hours), set a default span centered at clickedTime
            if (latest.getTime() - earliest.getTime() < 1000 * 60 * 60 * 2) {
                if (this.lastDataSpanMs && this.lastDataSpanMs <= 1000 * 60 * 60 * 24) {
                    const clickSpanMs = Math.min(this.lastDataSpanMs, 1000 * 60 * 60 * 2);
                    const half = clickSpanMs / 2;
                    earliest = new Date(this.dragStartTime.getTime() - half);
                    latest = new Date(this.dragStartTime.getTime() + half);
                } else {
                    earliest = moment(this.dragStartTime).subtract(3, 'days').toDate();
                    latest = moment(this.dragStartTime).add(4, 'days').toDate();
                }
            }

            this.miniTimeline.setCustomTime(earliest, 'selectStartTime');
            this.miniTimeline.setCustomTime(latest, 'selectEndTime');
            this.setMiniShades(earliest, latest);
            this.mainTimeline?.setWindow(earliest, latest, { animation: false });
            this.checkItemWidths();
            this.dragStartTime = null;
        };

        this.miniTimelineContainer.addEventListener("pointerup", finishMiniInteraction);
        this.miniTimelineContainer.addEventListener("pointercancel", finishMiniInteraction);

        const onMainPointerDown = (e: MouseEvent | PointerEvent) => {
            this.mainTimelinePointerDownPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            this.isMainTimelineDraggingGesture = false;
        };
        this.mainTimelineContainer.addEventListener('pointerdown', onMainPointerDown, true);
        this.mainTimelineContainer.addEventListener('mousedown', onMainPointerDown, true);

        const checkButtonsOnMainEnter = (e: MouseEvent | PointerEvent) => {
            const isDown = (e.buttons > 0) || ((e as any).which > 0);
            if (!isDown) {
                if (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null) {
                    this.finishMainDrag(e);
                }
            }
        };
        this.mainTimelineContainer.addEventListener('pointerenter', checkButtonsOnMainEnter, true);
        this.mainTimelineContainer.addEventListener('mouseenter', checkButtonsOnMainEnter, true);

        // Unified Click Listener on Main Timeline Container
        this.mainTimelineContainer.addEventListener('click', (event: MouseEvent) => {
            if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;

            // If the user was dragging/panning the main timeline (horizontally or vertically), abort click handling to preserve selection!
            if (this.isMainTimelineDraggingGesture) {
                this.isMainTimelineDraggingGesture = false;
                this.mainTimelinePointerDownPos = null;
                return;
            }
            this.mainTimelinePointerDownPos = null;

            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Immediately capture vertical scroll position on click before any selection changes or redraws
            const leftEl = this.mainTimelineContainer.querySelector('.vis-panel.vis-left') as HTMLElement | null;
            if (leftEl && leftEl.scrollTop > 0) {
                this.currentMainTimelineScrollTop = leftEl.scrollTop;
            } else if (this.mainTimeline && (this.mainTimeline as any).props && typeof (this.mainTimeline as any).props.scrollTop === 'number' && (this.mainTimeline as any).props.scrollTop < 0) {
                this.currentMainTimelineScrollTop = -(this.mainTimeline as any).props.scrollTop;
            }

            // 1. Group header click in left panel: either clicking the collapse icon or clicking group name text
            const leftPanel = target.closest('.vis-panel.vis-left');
            if (leftPanel) {
                const labelEl = target.closest('.vis-label') as HTMLElement | null;
                if (!labelEl) return;
                const innerEl = target.closest('.vis-inner') as HTMLElement | null;

                let groupId: any = null;
                try {
                    const props = (this.mainTimeline as any)?.getEventProperties ? (this.mainTimeline as any).getEventProperties(event) : null;
                    if (props && props.group != null) {
                        groupId = props.group;
                    }
                } catch {}

                if (groupId == null && (labelEl as any)['vis-group']?.groupId != null) {
                    groupId = (labelEl as any)['vis-group'].groupId;
                }

                if (groupId == null && (this.mainTimeline as any)?.itemSet?.groups) {
                    const tGroups = (this.mainTimeline as any).itemSet.groups;
                    for (const gid of Object.keys(tGroups)) {
                        if (tGroups[gid]?.dom?.label === labelEl || (innerEl && tGroups[gid]?.dom?.inner === innerEl)) {
                            groupId = gid;
                            break;
                        }
                    }
                }

                if (groupId == null) {
                    const labelText = innerEl?.textContent?.trim() || labelEl.textContent?.trim() || '';
                    if (labelText && this.groups) {
                        const foundGroup = this.groups.get(labelText);
                        if (foundGroup) {
                            groupId = foundGroup.id;
                        } else {
                            const allGroups = this.groups.get();
                            const match = allGroups.find((g: any) => g.content === labelText || g.id === labelText);
                            if (match) groupId = match.id;
                        }
                    }
                }

                if (groupId != null) {
                    const isNestingGroup = labelEl.classList.contains('vis-nesting-group') || ((this.groups?.get(groupId) as any)?.nestedGroups?.length > 0);
                    const rect = labelEl.getBoundingClientRect();
                    const isClickOnIcon = isNestingGroup && (!innerEl || (event.clientX - rect.left <= 28));

                    if (isClickOnIcon) {
                        event.stopPropagation();
                        event.preventDefault();
                        this.toggleGroupCollapse(groupId, labelEl);
                        return;
                    }

                    if (innerEl) {
                        this.handleGroupHeaderClick(groupId, event.shiftKey);
                    }
                }
                return;
            }

            // 2. Timeline Center Panel: markers & background
            const centerPanel = target.closest('.vis-panel.vis-center');
            if (!centerPanel) return;

            let matchedItems = this.getItemsUnderPointer(event.clientX, event.clientY);
            if (matchedItems.length === 0) {
                const directItem = this.getItemFromElement(target);
                if (directItem) {
                    matchedItems = [directItem];
                }
            }
            const isMulti = !!(event.ctrlKey || event.metaKey || event.shiftKey);

            if (matchedItems.length === 0) {
                // Clicked on empty row or canvas background -> clear selection
                this.clearSelection();
                return;
            }

            // Clicked on marker(s) under pointer
            const matchedIds = matchedItems.map(it => it.id);

            if (!isMulti) {
                const isAlreadySelected = 
                    this.currentSelectedItemIds.size === matchedIds.length &&
                    matchedIds.every(id => this.currentSelectedItemIds.has(id));

                if (isAlreadySelected) {
                    this.clearSelection();
                    return;
                }

                // Select all matched markers
                this.currentSelectedItemIds.clear();
                this.currentSelectedKeys.clear();
                matchedIds.forEach(id => this.currentSelectedItemIds.add(id));

                const selectionIds: ISelectionId[] = [];
                matchedItems.forEach(it => {
                    if (it.selectionId) {
                        selectionIds.push(it.selectionId);
                        const key = this.getSelectionKey(it.selectionId);
                        if (key) this.currentSelectedKeys.add(key);
                    }
                });

                this.executeSelection(selectionIds, false);
            } else {
                // Multi-select with Ctrl/Shift
                const allSelected = matchedIds.every(id => this.currentSelectedItemIds.has(id));
                const selectionIdsToToggle: ISelectionId[] = [];

                matchedItems.forEach(it => {
                    if (allSelected) {
                        this.currentSelectedItemIds.delete(it.id);
                        if (it.selectionId) {
                            const key = typeof it.selectionId.getKey === 'function' ? it.selectionId.getKey() : null;
                            if (key) this.currentSelectedKeys.delete(key);
                        }
                    } else {
                        this.currentSelectedItemIds.add(it.id);
                        if (it.selectionId) {
                            const key = typeof it.selectionId.getKey === 'function' ? it.selectionId.getKey() : null;
                            if (key) {
                                this.currentSelectedKeys.add(key);
                            } else {
                                try { this.currentSelectedKeys.add(JSON.stringify(it.selectionId)); } catch {}
                            }
                        }
                    }
                    if (it.selectionId) {
                        selectionIdsToToggle.push(it.selectionId);
                    }
                });

                const newSelectionIds: ISelectionId[] = [];
                this.items.forEach((it: any) => {
                    if (this.currentSelectedItemIds.has(it.id) && it.selectionId) {
                        newSelectionIds.push(it.selectionId);
                    }
                });
                this.currentSelectedIds = newSelectionIds;
                this.applySelectionStyles(this.currentSelectedIds);

                if (this.isCrossFilterEnabled() && this.selectionManager && selectionIdsToToggle.length > 0) {
                    this.selectionManager.select(selectionIdsToToggle, true).then((ids: ISelectionId[]) => {
                        if (Array.isArray(ids) && ids.length > 0) {
                            this.currentSelectedIds = ids;
                            this.currentSelectedKeys.clear();
                            ids.forEach((id: any) => {
                                if (id && typeof id.getKey === 'function') {
                                    this.currentSelectedKeys.add(id.getKey());
                                } else if (id) {
                                    try { this.currentSelectedKeys.add(JSON.stringify(id)); } catch {}
                                }
                            });
                        }
                        this.applySelectionStyles(this.currentSelectedIds);
                    }).catch(() => {
                        this.applySelectionStyles(this.currentSelectedIds);
                    });
                }
            }
        });

        // Tooltip listeners: identify when more than one marker is underneath the pointer
        this.mainTimeline.on('itemover', (properties: any) => {
            if (!properties || !properties.event) return;
            this.tooltipManager.showTooltipForPointer(properties.event.clientX, properties.event.clientY, this.formattingSettings, this.lastUpdateOptions, properties.item);
        });

        this.mainTimelineContainer.addEventListener('mousemove', (event: MouseEvent) => {
            const isDown = (event.buttons > 0) || ((event as any).which > 0);
            if (isDown) {
                this.tooltipManager.hideTooltip(true);
            }
            if (!isDown && (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null)) {
                this.finishMainDrag(event);
            }
            if (this.isDrawingMiniTimeline || this.activeMiniDragBar || isDown) return;
            const centerPanel = (event.target as HTMLElement | null)?.closest('.vis-panel.vis-center');
            if (!centerPanel) {
                this.tooltipManager.hideTooltip();
                return;
            }

            const itemsUnder = this.getItemsUnderPointer(event.clientX, event.clientY);
            if (itemsUnder.length > 0) {
                this.tooltipManager.showTooltipForPointer(event.clientX, event.clientY, this.formattingSettings, this.lastUpdateOptions);
            } else {
                this.tooltipManager.hideTooltip();
            }
        });

        this.mainTimeline.on('itemout', (properties: any) => {
            const clientX = properties?.event?.clientX;
            const clientY = properties?.event?.clientY;
            if (clientX != null && clientY != null) {
                const itemsUnder = this.getItemsUnderPointer(clientX, clientY);
                if (itemsUnder.length > 0) {
                    this.tooltipManager.showTooltipForPointer(clientX, clientY, this.formattingSettings, this.lastUpdateOptions);
                    return;
                }
            }
            this.tooltipManager.hideTooltip(true);
        });

        this.mainTimelineContainer.addEventListener('mouseleave', (event: MouseEvent) => {
            const isDown = (event.buttons > 0) || ((event as any).which > 0);
            if (!isDown && (this.isMainTimelineDragging() || this.mainTimelinePointerDownPos !== null)) {
                this.finishMainDrag(event);
            }
            this.tooltipManager.hideTooltip(true);
        });

        this.mainTimelineContainer.addEventListener('wheel', (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                this.tooltipManager.hideTooltip(true);

                let deltaY = event.deltaY;
                if (event.deltaMode === 1) { // LINE
                    deltaY *= 40;
                } else if (event.deltaMode === 2) { // PAGE
                    deltaY *= 400;
                }

                const mt: any = this.mainTimeline;
                if (mt) {
                    if (typeof mt._setScrollTop === 'function' && mt.props) {
                        const current = typeof mt.props.scrollTop === 'number' ? mt.props.scrollTop : 0;
                        const adjusted = current - deltaY;
                        mt._setScrollTop(adjusted);
                        if (typeof mt._redraw === 'function') {
                            mt._redraw();
                        } else if (typeof mt.redraw === 'function') {
                            mt.redraw();
                        }
                    }

                    const leftEl = this.mainTimelineContainer.querySelector('.vis-panel.vis-left') as HTMLElement | null;
                    if (leftEl) {
                        leftEl.scrollTop += deltaY;
                        this.currentMainTimelineScrollTop = leftEl.scrollTop;
                    }
                }
            } else {
                this.tooltipManager.hideTooltip(true);
            }
        }, { capture: true, passive: false });

        this.mainTimeline.on('rangechange', (e: any) => {
            this.tooltipManager.hideTooltip(true);
            this.isMainTimelineDraggingGesture = true;
            try {
                if (this.selectState === 'none' && this.miniTimeline) {
                    this.miniTimeline.setCustomTime(e.start, 'selectStartTime');
                    this.miniTimeline.setCustomTime(e.end, 'selectEndTime');
                    this.setMiniShades(e.start, e.end);
                }
                this.checkItemWidths();
            } catch (err) {
                console.warn("rangechange error:", err);
            }
        });

        this.mainTimeline.on('rangechanged', () => {
            this.isMainTimelineDraggingGesture = true;
            try {
                this.checkItemWidths();
            } catch (err) {
                console.warn("rangechanged error:", err);
            }
        });

        // Auto-adjust layout on resize with debounce
        if (typeof ResizeObserver !== 'undefined' && this.target) {
            try {
                let resizeTimer: any = null;
                const ro = new ResizeObserver(() => {
                    if (resizeTimer) clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => {
                        this.mainTimeline?.redraw();
                        this.updateMiniTimelineLayout();
                        this.checkItemWidths();
                    }, 50);
                });
                ro.observe(this.target);
            } catch (e) {
                // Ignore ResizeObserver errors
            }
        }
    }

    private showLoading(): void {
        this.statusOverlayManager.showLoading();
    }

    private hideLoading(): void {
        this.statusOverlayManager.hideLoading();
    }

    private showStatus(title: string, message: string, details?: string): void {
        this.statusOverlayManager.showStatus(title, message, details);
    }

    private hideStatus(): void {
        this.statusOverlayManager.hideStatus(() => this.renderDetailsPanel());
    }

    private updateMiniTimelineLayout(): void {
        this.miniTimelineManager.updateMiniTimelineLayout(this.mainTimelineContainer);
    }

    private updateMiniTimelineTimeAxis(width?: number): void {
        this.miniTimelineManager.updateMiniTimelineTimeAxis(width);
    }

    private getMiniXFromTime(time: Date): number | null {
        return this.miniTimelineManager.getMiniXFromTime(time);
    }

    private getNearMiniDragBar(clientX: number): 'selectStartTime' | 'selectEndTime' | null {
        return this.miniTimelineManager.getNearMiniDragBar(clientX);
    }

    private getMiniTimeFromX(clientX: number): Moment {
        return this.miniTimelineManager.getMiniTimeFromX(clientX);
    }

    private setMiniShades(time1: Date, time2: Date): void {
        this.miniTimelineManager.setMiniShades(time1, time2);
    }

    private adjustTimeline(skipMainTimeline = false) {
        if (!this.miniTimeline || !this.mainTimeline) return;
        try {
            const startTime = this.miniTimeline.getCustomTime('selectStartTime');
            const endTime = this.miniTimeline.getCustomTime('selectEndTime');
            if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return;

            const earliest = (startTime < endTime ? startTime : endTime);
            const latest = (startTime > endTime ? startTime : endTime);

            if (!skipMainTimeline && earliest.getTime() !== latest.getTime()) {
                this.mainTimeline.setWindow(earliest, latest, { animation: false });
            }
            this.setMiniShades(earliest, latest);
        } catch (e) {
            console.warn("adjustTimeline error:", e);
        }
    }

    private getItemFromElement(el: Element | null): any | null {
        if (!el || !this.items) return null;
        let itemObj: any = null;
        try {
            if ((this.mainTimeline as any)?.itemSet?.itemFromElement) {
                itemObj = (this.mainTimeline as any).itemSet.itemFromElement(el);
            }
        } catch {}

        if (!itemObj) {
            let cur: any = el;
            while (cur && cur !== this.mainTimelineContainer && cur !== document.body) {
                if (cur['vis-item']) {
                    itemObj = cur['vis-item'];
                    break;
                }
                cur = cur.parentElement;
            }
        }

        if (itemObj) {
            const id = itemObj.id != null ? itemObj.id : (itemObj.data && itemObj.data.id != null ? itemObj.data.id : null);
            if (id != null) {
                if (typeof id === 'string' && (id.startsWith('future') || id.startsWith('limit'))) {
                    return null;
                }
                const dataItem = this.items.get(id) as any;
                if (dataItem && dataItem.type !== 'background') {
                    return dataItem;
                }
            }
        }
        return null;
    }

    private getItemsUnderPointer(clientX: number, clientY: number): any[] {
        if (!this.items || !this.mainTimelineContainer) return [];

        const seenIds = new Set<any>();
        const initialResult: any[] = [];
        const itemDomMap = new Map<any, HTMLElement>();

        const elements = typeof document.elementsFromPoint === 'function'
            ? document.elementsFromPoint(clientX, clientY)
            : [];

        for (const el of elements) {
            const item = this.getItemFromElement(el);
            if (item && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                initialResult.push(item);
                const visItemEl = (el.closest('.vis-item') as HTMLElement) || (el as HTMLElement);
                itemDomMap.set(item.id, visItemEl);
            }
        }

        if (initialResult.length === 0) return [];

        // Scope to group of topmost element under pointer (ensures row alignment)
        const primaryGroup = String(initialResult[0].group);
        let groupItems = initialResult.filter(it => String(it.group) === primaryGroup);

        const isPointItem = (it: any) => it.type === 'point' || it.isPoint === true;

        // For any point markers under pointer, also include any co-located point markers
        // in the same group that share the same start time (in case only the top DOM element was returned)
        const pointItems = groupItems.filter(isPointItem);
        if (pointItems.length > 0) {
            pointItems.forEach((pt: any) => {
                const ptStart = pt.start ? new Date(pt.start).getTime() : null;
                if (ptStart != null) {
                    this.items.forEach((item: any) => {
                        if (item.type === 'background' || seenIds.has(item.id)) return;
                        if (String(item.group) !== primaryGroup) return;
                        if (isPointItem(item)) {
                            const itStart = item.start ? new Date(item.start).getTime() : null;
                            if (itStart != null && itStart === ptStart) {
                                seenIds.add(item.id);
                                groupItems.push(item);
                            }
                        }
                    });
                }
            });
        }

        // Handle adjacent (abutting) range markers that do not overlap in time
        // but share a boundary edge (e.g. Marker A ends when Marker B starts).
        // If two range markers have timeOverlap <= 1000, they are consecutive, not concurrent.
        // On that boundary seam, discard the one whose center is further from clientX.
        const rangeItems = groupItems.filter(it => !isPointItem(it));
        if (rangeItems.length > 1) {
            const toDiscard = new Set<any>();

            for (let i = 0; i < rangeItems.length; i++) {
                for (let j = i + 1; j < rangeItems.length; j++) {
                    const itemA = rangeItems[i];
                    const itemB = rangeItems[j];

                    const aStart = itemA.start ? new Date(itemA.start).getTime() : 0;
                    const aEnd = itemA.end ? new Date(itemA.end).getTime() : aStart;
                    const bStart = itemB.start ? new Date(itemB.start).getTime() : 0;
                    const bEnd = itemB.end ? new Date(itemB.end).getTime() : bStart;

                    const timeOverlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);

                    if (timeOverlap <= 1000) {
                        let elA = itemDomMap.get(itemA.id);
                        if (!elA && (this.mainTimeline as any)?.itemSet?.items?.[itemA.id]?.dom?.box) {
                            elA = (this.mainTimeline as any).itemSet.items[itemA.id].dom.box;
                        }
                        let elB = itemDomMap.get(itemB.id);
                        if (!elB && (this.mainTimeline as any)?.itemSet?.items?.[itemB.id]?.dom?.box) {
                            elB = (this.mainTimeline as any).itemSet.items[itemB.id].dom.box;
                        }

                        if (elA && elB && typeof elA.getBoundingClientRect === 'function' && typeof elB.getBoundingClientRect === 'function') {
                            const rectA = elA.getBoundingClientRect();
                            const rectB = elB.getBoundingClientRect();
                            const centerA = (rectA.left + rectA.right) / 2;
                            const centerB = (rectB.left + rectB.right) / 2;
                            if (Math.abs(clientX - centerA) < Math.abs(clientX - centerB)) {
                                toDiscard.add(itemB.id);
                            } else {
                                toDiscard.add(itemA.id);
                            }
                        }
                    }
                }
            }

            if (toDiscard.size > 0) {
                groupItems = groupItems.filter(it => !toDiscard.has(it.id));
            }
        }

        return groupItems;
    }

    private isMainTimelineDragging(): boolean {
        if (!this.mainTimeline) return false;
        try {
            const mt: any = this.mainTimeline;
            return !!(mt.range?.props?.touch?.dragging || mt.itemSet?.touchParams?.itemIsDragging);
        } catch {
            return false;
        }
    }

    private resetAllTimelineHammers() {
        if (!this.mainTimeline) return;
        try {
            const mt: any = this.mainTimeline;
            const hammers = [
                mt.hammer,
                mt.itemSet?.hammer,
                mt.itemSet?.groupHammer,
                mt.hammerDragCenter,
                mt.itemSet?.hammerDragCenter
            ];
            for (const h of hammers) {
                if (!h) continue;
                try {
                    if (typeof h.stop === 'function') {
                        h.stop(true);
                    }
                    if (h.session) {
                        h.session.stopped = 2; // FORCED_STOP
                        h.session.curRecognizer = null;
                        if (Array.isArray(h.session.pointerEvents)) {
                            h.session.pointerEvents.length = 0;
                        }
                    }
                    if (h.input && Array.isArray(h.input.store)) {
                        h.input.store.length = 0;
                    }
                    if (Array.isArray(h.recognizers)) {
                        for (const r of h.recognizers) {
                            if (r && typeof r.reset === 'function') {
                                r.reset();
                            }
                            if (r) {
                                r.state = 8; // STATE_FAILED
                            }
                        }
                    }
                } catch {}
            }
        } catch {}
    }

    private finishMainDrag(event?: any) {
        if (!this.mainTimeline) return;
        try {
            const mt: any = this.mainTimeline;
            const range = mt.range;
            const itemSet = mt.itemSet;

            if (range?.props?.touch) {
                range.props.touch.dragging = false;
                range.props.touch.allowDragging = false;
                setTimeout(() => {
                    if (range?.props?.touch) {
                        range.props.touch.allowDragging = true;
                    }
                }, 50);
            }
            if (typeof range?._onDragEnd === 'function') {
                try { range._onDragEnd(event || {}); } catch {}
            }
            if (itemSet?.touchParams) {
                itemSet.touchParams.itemIsDragging = false;
            }
            if (typeof itemSet?._onDragEnd === 'function') {
                try { itemSet._onDragEnd(event || {}); } catch {}
            }
            if (typeof mt._onDragEnd === 'function') {
                try { mt._onDragEnd(event || {}); } catch {}
            }
            if (mt.body?.emitter) {
                try { mt.body.emitter.emit("panend", event || {}); } catch {}
            }
            if (mt.body?.dom?.root) {
                mt.body.dom.root.style.cursor = "auto";
            }

            this.resetAllTimelineHammers();

            this.mainTimelinePointerDownPos = null;

            this.checkItemWidths();
            this.adjustTimeline(false);
        } catch (e) {
            console.warn("finishMainDrag error:", e);
        }
    }

    private showEntireTimeline() {
        if (!this.mainTimeline || !this.items || this.items.length === 0) return;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        this.items.forEach((item: any) => {
            if (item.type === 'background') return;
            const start = item.start ? new Date(item.start) : null;
            const end = item.end ? new Date(item.end) : start;
            if (start && !isNaN(start.getTime())) {
                if (!minDate || start < minDate) minDate = start;
                if (!maxDate || (end && end > maxDate)) maxDate = end;
            }
        });

        if (minDate && maxDate) {
            const spanMs = Math.max(0, maxDate.getTime() - minDate.getTime());
            this.lastDataSpanMs = spanMs;
            const paddingMs = Math.max(spanMs * 0.05, 1000 * 60 * 60 * 1);
            const winStart = new Date(minDate.getTime() - paddingMs);
            const winEnd = new Date(maxDate.getTime() + paddingMs);

            if (spanMs <= 1000 * 60 * 60 * 24) {
                this.mainTimeline.setOptions({ zoomMin: 1000 * 60 * 60 * 1 });
            }

            this.mainTimeline.setWindow(winStart, winEnd, { animation: false });

            if (this.miniTimeline) {
                try {
                    this.miniTimeline.setCustomTime(winStart, 'selectStartTime');
                    this.miniTimeline.setCustomTime(winEnd, 'selectEndTime');
                    this.setMiniShades(winStart, winEnd);
                } catch {}
            }
            try {
                const scrollPanels = this.mainTimelineContainer.querySelectorAll('.vis-panel');
                scrollPanels.forEach((p: any) => { p.scrollTop = 0; });
                const center = this.mainTimelineContainer ? this.mainTimelineContainer.querySelector('.vis-panel.vis-center .vis-content') as HTMLElement | null : null;
                if (center) {
                    center.style.transform = 'translateY(0px)';
                }
                if (this.mainTimeline && (this.mainTimeline as any).props) {
                    (this.mainTimeline as any).props.scrollTop = 0;
                }
                if (this.mainTimeline && typeof (this.mainTimeline as any)._setScrollTop === 'function') {
                    (this.mainTimeline as any)._setScrollTop(0);
                }
                this.currentMainTimelineScrollTop = 0;
            } catch {}
            this.mainTimeline.redraw();
            this.checkItemWidths();
        } else {
            try {
                this.mainTimeline.fit();
            } catch {}
        }
    }

    private getLocalizedString(key: string, fallback: string): string {
        if (this.localizationManager && typeof this.localizationManager.getDisplayName === "function") {
            try {
                const val = this.localizationManager.getDisplayName(key);
                if (val) return val;
            } catch {}
        }
        return fallback;
    }

    private getHighContrastSettings(): { isHighContrast: boolean; foreground?: string; background?: string; foregroundSelected?: string; hyperlink?: string } {
        const isHighContrast = !!(this.colorPalette && (this.colorPalette as any).isHighContrast);
        if (isHighContrast) {
            return {
                isHighContrast: true,
                foreground: (this.colorPalette as any)?.foreground?.value,
                background: (this.colorPalette as any)?.background?.value,
                foregroundSelected: (this.colorPalette as any)?.foregroundSelected?.value,
                hyperlink: (this.colorPalette as any)?.hyperlink?.value
            };
        }
        return { isHighContrast: false };
    }


    private getMarkerElementsByItemId(itemId: any): HTMLElement[] {
        if (!this.mainTimelineContainer) return [];
        const elements: HTMLElement[] = [];

        try {
            const itemObj = (this.mainTimeline as any)?.itemSet?.items?.[itemId] ||
                            (this.mainTimeline as any)?.itemSet?.items?.[String(itemId)];
            if (itemObj && itemObj.dom) {
                const el = itemObj.dom.point || itemObj.dom.box || (itemObj.dom.nodeType === 1 ? itemObj.dom : null);
                if (el && el.isConnected) {
                    elements.push(el as HTMLElement);
                }
            }
        } catch {}

        if (elements.length === 0) {
            const allVisItems = this.mainTimelineContainer.querySelectorAll('.vis-item');
            for (let i = 0; i < allVisItems.length; i++) {
                const candidate = allVisItems[i] as any;
                if (candidate && candidate['vis-item']) {
                    const cId = candidate['vis-item'].id != null ? candidate['vis-item'].id : candidate['vis-item'].data?.id;
                    if (cId === itemId || String(cId) === String(itemId)) {
                        elements.push(candidate as HTMLElement);
                    }
                }
            }
        }

        return elements;
    }

    private setMarkerHoverGlow(itemId: any, enable: boolean) {
        if (!enable) {
            if (this.currentHoveredMarkerId === itemId || itemId == null) {
                this.clearAllMarkerHoverGlow();
            }
            return;
        }

        if (this.currentHoveredMarkerId != null && this.currentHoveredMarkerId !== itemId) {
            this.clearAllMarkerHoverGlow();
        }

        this.currentHoveredMarkerId = itemId;
        const els = this.getMarkerElementsByItemId(itemId);
        els.forEach(el => {
            el.classList.add('details-hover-glow');

        });

        if (this.miniTimelineContainer) {
            try {
                const miniItemObj = (this.miniTimeline as any)?.itemSet?.items?.[itemId] ||
                                    (this.miniTimeline as any)?.itemSet?.items?.[String(itemId)];
                if (miniItemObj && miniItemObj.dom) {
                    const miniEl = miniItemObj.dom.point || miniItemObj.dom.box || (miniItemObj.dom.nodeType === 1 ? miniItemObj.dom : null);
                    if (miniEl && miniEl.isConnected) {
                        miniEl.classList.add('details-hover-glow');
                        const miniDot = miniEl.querySelector('.vis-dot') as HTMLElement | null;
                        if (miniDot) {
                            miniDot.classList.add('details-hover-glow');
                            miniDot.style.setProperty('transform', 'rotate(45deg) scale(1.4)', 'important');
                            miniDot.style.setProperty('box-shadow', '0 0 0 2.5px #ffffff, 0 0 0 5.5px #f59e0b, 0 0 18px 6px rgba(245, 158, 11, 0.85)', 'important');
                            miniDot.style.setProperty('z-index', '9999', 'important');
                        }
                    }
                }
            } catch {}
        }
    }

    private clearAllMarkerHoverGlow() {
        this.currentHoveredMarkerId = null;
        if (this.mainTimelineContainer) {
            const glowingDots = this.mainTimelineContainer.querySelectorAll('.vis-dot.details-hover-glow');
            glowingDots.forEach(dot => {
                const htmlDot = dot as HTMLElement;
                htmlDot.style.removeProperty('transform');
                htmlDot.style.removeProperty('box-shadow');
                htmlDot.style.removeProperty('z-index');
                htmlDot.classList.remove('details-hover-glow');
            });
            const glowing = this.mainTimelineContainer.querySelectorAll('.details-hover-glow');
            glowing.forEach(el => el.classList.remove('details-hover-glow'));
        }
        if (this.miniTimelineContainer) {
            const glowingMiniDots = this.miniTimelineContainer.querySelectorAll('.vis-dot.details-hover-glow');
            glowingMiniDots.forEach(dot => {
                const htmlDot = dot as HTMLElement;
                htmlDot.style.removeProperty('transform');
                htmlDot.style.removeProperty('box-shadow');
                htmlDot.style.removeProperty('z-index');
                htmlDot.classList.remove('details-hover-glow');
            });
            const glowingMini = this.miniTimelineContainer.querySelectorAll('.details-hover-glow');
            glowingMini.forEach(el => el.classList.remove('details-hover-glow'));
        }
    }


    private isCrossFilterEnabled(): boolean {
        return (this.formattingSettings as any)?.miscellaneousCard?.crossFilter?.value
            ?? (this.formattingSettings as any)?.markersCard?.crossFilter?.value
            ?? (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.miscellaneous?.crossFilter
            ?? (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.markers?.crossFilter
            ?? false;
    }

    private getSelectionKey(selectionId: any): string | null {
        if (!selectionId) return null;
        if (typeof selectionId.getKey === 'function') {
            return selectionId.getKey();
        }
        try {
            return JSON.stringify(selectionId);
        } catch {
            return null;
        }
    }

    private isItemMatchingSelection(item: any, selectedIds: any[] = this.currentSelectedIds): boolean {
        if (!item || item.type === 'background') return false;
        if (this.currentSelectedItemIds.has(item.id)) return true;

        if (item.selectionId) {
            const selKey = this.getSelectionKey(item.selectionId);
            if (selKey && this.currentSelectedKeys.has(selKey)) return true;

            if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                return selectedIds.some((sel: any) => {
                    if (!sel) return false;
                    if (typeof sel.equals === 'function' && sel.equals(item.selectionId)) return true;
                    if (typeof sel.includes === 'function' && sel.includes(item.selectionId)) return true;
                    if (selKey && typeof sel.getKey === 'function' && sel.getKey() === selKey) return true;
                    try {
                        return JSON.stringify(sel) === JSON.stringify(item.selectionId);
                    } catch {
                        return false;
                    }
                });
            }
        }
        return false;
    }


    private clearDomSelectionClasses(): void {
        if (!this.mainTimelineContainer) return;
        const elSelected = this.mainTimelineContainer.querySelectorAll(
            '.cross-highlight-selected, .vis-selected, .selected-primary, .selected-dashed'
        );
        elSelected.forEach(el => {
            el.classList.remove('cross-highlight-selected', 'vis-selected', 'selected-primary', 'selected-dashed');
        });
        const elDimmed = this.mainTimelineContainer.querySelectorAll('.cross-highlight-dimmed');
        elDimmed.forEach(el => el.classList.remove('cross-highlight-dimmed'));
    }

    private clearSelection(triggerCrossFilter: boolean = true): void {
        this.currentSelectedItemIds.clear();
        this.currentSelectedKeys.clear();
        this.currentSelectedIds = [];
        this.updateGroupLabelSelectionStyles(null);

        if (triggerCrossFilter && this.isCrossFilterEnabled() && this.selectionManager) {
            this.selectionManager.clear().then(() => {
                this.applySelectionStyles([]);
            }).catch(() => {
                this.applySelectionStyles([]);
            });
        } else {
            this.applySelectionStyles([]);
        }
    }

    private executeSelection(selectionIds: ISelectionId[], isMultiSelect: boolean = false): void {
        this.currentSelectedIds = selectionIds;
        this.applySelectionStyles(this.currentSelectedIds);

        if (this.isCrossFilterEnabled() && this.selectionManager && selectionIds.length > 0) {
            this.selectionManager.select(selectionIds, isMultiSelect).then((resIds: ISelectionId[]) => {
                if (Array.isArray(resIds) && resIds.length > 0) {
                    this.currentSelectedIds = resIds;
                    this.currentSelectedKeys.clear();
                    resIds.forEach((id: any) => {
                        const key = this.getSelectionKey(id);
                        if (key) this.currentSelectedKeys.add(key);
                    });
                }
                this.applySelectionStyles(this.currentSelectedIds);
            }).catch(() => {
                this.applySelectionStyles(this.currentSelectedIds);
            });
        }
    }

    private computeItemStyleAndClass(
        item: any,
        isSelected: boolean,
        hasSelection: boolean,
        isMultiSelect: boolean,
        mostRecentSelectedId: any,
        isPointOverride?: boolean
    ): { className: string; style: string } {
        return computeItemStyleAndClass(
            item,
            isSelected,
            hasSelection,
            isMultiSelect,
            mostRecentSelectedId,
            this.searchMatchedItemIds,
            isPointOverride,
            this.colorPalette
        );
    }


    private getGlobalFontSettings(): { fontFamily: string; baseFontSize: number } {
        const generalCard = (this.formattingSettings as any)?.generalCard;
        const generalObjects = (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.general;
        const fontFamily = generalCard?.fontFamily?.value
            ?? generalObjects?.fontFamily
            ?? "Segoe UI, sans-serif";
        const rawBaseSize = generalCard?.fontSize?.value
            ?? generalObjects?.fontSize;
        const baseFontSize = (rawBaseSize && Number(rawBaseSize) > 0) ? Number(rawBaseSize) : 11;
        return {
            fontFamily: String(fontFamily || "Segoe UI, sans-serif"),
            baseFontSize: Math.max(6, Math.min(40, baseFontSize))
        };
    }

    private getFontSettings(cardName: string, objectName: string, fontProp: string = 'font'): { fontFamily: string; fontSize: number } {
        const { fontFamily, baseFontSize } = this.getGlobalFontSettings();
        let offset: number = 0;
        if (cardName === 'timelineCard' || objectName === 'timeline') {
            offset = FONT_SIZE_OFFSETS.xAxis;
        } else if (cardName === 'groupOrderCard' || objectName === 'groupOrderCard') {
            offset = FONT_SIZE_OFFSETS.groupHeader;
        } else if (cardName === 'miniTimelineCard' || objectName === 'miniTimeline') {
            offset = FONT_SIZE_OFFSETS.miniTimeline;
        } else if (cardName === 'topBarCard' || objectName === 'topBar') {
            offset = FONT_SIZE_OFFSETS.topBar;
        } else if (fontProp === 'headerFont' || objectName === 'detailsPanelHeader') {
            offset = FONT_SIZE_OFFSETS.detailsHeader;
        } else if (cardName === 'detailsPanelCard' || objectName === 'detailsPanel') {
            offset = FONT_SIZE_OFFSETS.detailsBody;
        } else if (cardName === 'tooltipsCard' || objectName === 'tooltips') {
            offset = FONT_SIZE_OFFSETS.tooltip;
        }
        const fontSize = Math.max(6, baseFontSize + offset);
        return { fontFamily, fontSize };
    }

    private applySelectionStyles(selectedIds: any[]) {
        if (!this.items) return;
        try {
            const hasSelection = (Array.isArray(selectedIds) && selectedIds.length > 0) 
                || this.currentSelectedKeys.size > 0 
                || this.currentSelectedItemIds.size > 0;
            const updates: any[] = [];
            const miniUpdates: any[] = [];
            const selectedItemIds: any[] = [];
            const selectedGroups = new Set<string>();

            const selectedItems: any[] = [];
            if (hasSelection) {
                this.items.forEach((item: any) => {
                    if (this.isItemMatchingSelection(item, selectedIds)) {
                        selectedItems.push(item);
                    }
                });
            }

            const mostRecentSelectedId = findMostRecentItemId(selectedItems);
            const isMultiSelect = selectedItems.length > 1;

            this.items.forEach((item: any) => {
                if (item.type === 'background') return;

                const isSelected = selectedItems.some(it => it.id === item.id);
                const baseColor = item.color || '#3677a8';
                const { className, style } = this.computeItemStyleAndClass(
                    item,
                    isSelected,
                    hasSelection,
                    isMultiSelect,
                    mostRecentSelectedId
                );

                if (hasSelection) {
                    if (isSelected) {
                        selectedItemIds.push(item.id);
                        selectedGroups.add(String(item.group));
                        miniUpdates.push({ id: item.id, group: `${baseColor}_highlighted` });
                    } else {
                        miniUpdates.push({ id: item.id, group: `${baseColor}_dimmed` });
                    }
                } else {
                    miniUpdates.push({ id: item.id, group: baseColor });
                }

                updates.push({
                    id: item.id,
                    className: className,
                    style: style,
                    isSelected: isSelected
                });
            });

            if (updates.length > 0) {
                this.isInternalDataUpdate = true;
                this.items.update(updates);
                this.isInternalDataUpdate = false;
            }

            if (miniUpdates.length > 0 && this.miniItems) {
                this.miniItems.update(miniUpdates);
            }

            if (this.mainTimeline) {
                try {
                    (this.mainTimeline as any).setSelection(selectedItemIds, { focus: false, animation: false });
                } catch {}
            }

            if (!hasSelection) {
                this.clearDomSelectionClasses();
            }

            if (this.mainTimelineContainer) {
                if (this.searchMatchedItemIds.size === 0) {
                    const elSearch = this.mainTimelineContainer.querySelectorAll('.search-matched');
                    elSearch.forEach(el => el.classList.remove('search-matched'));
                } else {
                    const allVisItems = this.mainTimelineContainer.querySelectorAll('.vis-item');
                    allVisItems.forEach((el: Element) => {
                        const item = this.getItemFromElement(el);
                        if (item && item.id != null) {
                            if (this.searchMatchedItemIds.has(item.id)) {
                                el.classList.add('search-matched');
                            } else {
                                el.classList.remove('search-matched');
                            }
                        }
                    });
                }
            }

            // Check if all selected items belong to one specific group and the whole group is selected
            if (hasSelection) {
                const selectedParentGroups = new Set<string>();
                this.items.get(selectedItemIds).forEach((it: any) => {
                    if (it.parentGroup) selectedParentGroups.add(it.parentGroup);
                    else if (it.group) selectedParentGroups.add(String(it.group));
                });

                if (selectedGroups.size === 1) {
                    const singleGroup = Array.from(selectedGroups)[0];
                    const totalInGroup = this.items.get({ filter: (it: any) => it.type !== 'background' && String(it.group) === singleGroup }).length;
                    this.updateGroupLabelSelectionStyles(totalInGroup > 0 && totalInGroup === selectedItemIds.length ? singleGroup : null);
                } else if (selectedParentGroups.size === 1) {
                    const parentG = Array.from(selectedParentGroups)[0];
                    const totalInParent = this.items.get({ filter: (it: any) => it.type !== 'background' && (it.parentGroup === parentG || String(it.group) === parentG) }).length;
                    this.updateGroupLabelSelectionStyles(totalInParent > 0 && totalInParent === selectedItemIds.length ? parentG : null);
                } else {
                    this.updateGroupLabelSelectionStyles(null);
                }
            } else {
                this.updateGroupLabelSelectionStyles(null);
            }

            this.mostRecentSelectedId = mostRecentSelectedId;
            const displayedIds = new Set([...selectedItemIds, ...Array.from(this.searchMatchedItemIds)]);
            for (const expId of this.expandedItemIds) {
                if (!displayedIds.has(expId)) {
                    this.expandedItemIds.delete(expId);
                }
            }
            const currentSig = `${Array.from(this.currentSelectedItemIds).sort().join(',')}|${Array.from(this.searchMatchedItemIds).sort().join(',')}`;
            const selectionChanged = currentSig !== this.lastSelectedMarkerSignature;
            this.lastSelectedMarkerSignature = currentSig;
            this.renderDetailsPanel(selectionChanged);
        } catch (e) {
            console.warn("applySelectionStyles error:", e);
        }
    }


    private getShowFieldNames(): boolean {
        if (this.formattingSettings && (this.formattingSettings as any).detailsPanelCard) {
            const val = (this.formattingSettings as any).detailsPanelCard.showFieldNames?.value;
            if (typeof val === 'boolean') {
                return val;
            }
        }
        if (this.formattingSettings && (this.formattingSettings as any).contentCard) {
            const val = (this.formattingSettings as any).contentCard.showFieldNames?.value;
            if (typeof val === 'boolean') {
                return val;
            }
        }
        const dv = this.lastUpdateOptions?.dataViews?.[0];
        if (dv?.metadata?.objects) {
            const detailsObj = dv.metadata.objects.detailsPanel as any;
            if (detailsObj && typeof detailsObj.showFieldNames === 'boolean') {
                return detailsObj.showFieldNames;
            }
            const contentObj = dv.metadata.objects.content as any;
            if (contentObj && typeof contentObj.showFieldNames === 'boolean') {
                return contentObj.showFieldNames;
            }
        }
        return false;
    }


    private renderDetailsPanel(resetScroll: boolean = false): void {
        this.detailsPanelManager.renderDetailsPanel({
            items: this.items ? this.items.get() : [],
            isItemMatchingSelection: (it) => this.isItemMatchingSelection(it),
            searchMatchedItemIds: this.searchMatchedItemIds,
            searchTerm: this.searchTerm,
            mostRecentSelectedId: this.mostRecentSelectedId,
            expandedItemIds: this.expandedItemIds,
            formattingSettings: this.formattingSettings,
            getHighContrastSettings: () => this.getHighContrastSettings(),
            getLocalizedString: (k, fb) => this.getLocalizedString(k, fb),
            getShowFieldNames: () => this.getShowFieldNames(),
            setMarkerHoverGlow: (id, enable) => this.setMarkerHoverGlow(id, enable),
            clearAllMarkerHoverGlow: () => this.clearAllMarkerHoverGlow(),
            openExternalUrl: (url) => openExternalUrl(url, this.host),
            allowInteractions: this.allowInteractions !== false && !(this.host && (this.host as any).allowInteractions === false)
        }, resetScroll);
    }

    private handleGroupHeaderClick(groupId: any, shift: boolean = false) {
        const now = Date.now();
        if (now - this.lastGroupHeaderClickTime < 250 && this.lastGroupHeaderClickedId === groupId) {
            return;
        }
        this.lastGroupHeaderClickTime = now;
        this.lastGroupHeaderClickedId = groupId;

        if (!this.items) return;

        // Find all non-background items in this group and any nested subgroups
        const targetGroupIds = new Set<string>();
        targetGroupIds.add(String(groupId));
        if (this.groups) {
            const grp = this.groups.get(groupId) as any;
            if (grp && Array.isArray(grp.nestedGroups)) {
                grp.nestedGroups.forEach((nid: any) => targetGroupIds.add(String(nid)));
            }
        }

        const groupItems: any[] = [];
        this.items.forEach((item: any) => {
            if (item.type !== 'background' && targetGroupIds.has(String(item.group))) {
                groupItems.push(item);
            }
        });

        if (groupItems.length === 0) return;

        const groupItemIds = groupItems.map(item => item.id);

        // Check if this group is already fully selected
        const isAlreadyFullySelected = 
            this.currentSelectedItemIds.size === groupItemIds.length &&
            groupItemIds.every(id => this.currentSelectedItemIds.has(id));

        if (isAlreadyFullySelected) {
            this.clearSelection();
        } else {
            if (!shift) {
                this.currentSelectedItemIds.clear();
                this.currentSelectedKeys.clear();
            }
            groupItemIds.forEach(id => this.currentSelectedItemIds.add(id));

            const selectionIds: ISelectionId[] = [];
            groupItems.forEach(item => {
                if (item.selectionId) {
                    selectionIds.push(item.selectionId);
                    const key = this.getSelectionKey(item.selectionId);
                    if (key) this.currentSelectedKeys.add(key);
                }
            });

            this.updateGroupLabelSelectionStyles(groupId);
            this.executeSelection(selectionIds, false);
        }
    }

    private updateGroupLabelSelectionStyles(selectedGroupId: any) {
        if (!this.mainTimelineContainer) return;
        try {
            const targetGroupIds = new Set<string>();
            if (selectedGroupId != null) {
                targetGroupIds.add(String(selectedGroupId));
                if (this.groups) {
                    const grp = this.groups.get(selectedGroupId) as any;
                    if (grp && Array.isArray(grp.nestedGroups)) {
                        grp.nestedGroups.forEach((nid: any) => targetGroupIds.add(String(nid)));
                    }
                }
            }

            if (this.mainTimeline && (this.mainTimeline as any).itemSet?.groups) {
                const timelineGroups = (this.mainTimeline as any).itemSet.groups;
                Object.keys(timelineGroups).forEach(gid => {
                    const grpObj = timelineGroups[gid];
                    if (grpObj && grpObj.dom && grpObj.dom.label) {
                        if (selectedGroupId != null && targetGroupIds.has(String(gid))) {
                            grpObj.dom.label.classList.add('group-header-selected');
                        } else {
                            grpObj.dom.label.classList.remove('group-header-selected');
                        }
                    }
                });
            }

            const labels = this.mainTimelineContainer.querySelectorAll('.vis-panel.vis-left .vis-label');
            labels.forEach(el => {
                const gId = (el as any)['vis-group']?.groupId;
                const inner = el.querySelector('.vis-inner') || el;
                const text = inner.textContent?.trim() || '';
                if (selectedGroupId != null && (targetGroupIds.has(String(gId)) || (gId == null && targetGroupIds.has(text)))) {
                    el.classList.add('group-header-selected');
                } else {
                    el.classList.remove('group-header-selected');
                }
            });
        } catch (e) {
            console.warn("updateGroupLabelSelectionStyles error:", e);
        }
    }

    private showLandingPage(distinctGroups: string[], fieldName: string = "Top Level Group"): void {
        this.landingPageManager.showLandingPage({
            distinctGroups,
            fieldName,
            visualInstanceId: this.visualInstanceId,
            allowInteractions: this.allowInteractions !== false && !(this.host && (this.host as any).allowInteractions === false),
            onSelectGroup: (val: string) => {
                this.selectedTopLevelGroup = val;
                this.clearSelection(true);
                if (this.lastUpdateOptions) {
                    this.update(this.lastUpdateOptions);
                }
            },
            hideStatus: () => this.hideStatus(),
            hideLoading: () => this.hideLoading()
        });
    }

    private hideLandingPage(): void {
        this.landingPageManager.hideLandingPage(() => this.renderDetailsPanel());
    }


    private toggleGroupCollapse(groupId: any, labelEl?: HTMLElement | null): void {
        if (!this.groups || !this.items) return;
        const group = this.groups.get(groupId) as any;
        if (!group || !Array.isArray(group.nestedGroups) || group.nestedGroups.length === 0) return;

        const newShowNested = group.showNested === false ? true : false;
        group.showNested = newShowNested;

        const childIdSet = new Set(group.nestedGroups.map((id: any) => String(id)));
        const childrenToUpdate: any[] = [];
        childIdSet.forEach((childId) => {
            const child = this.groups.get(childId) as any;
            if (child) {
                child.visible = newShowNested;
                childrenToUpdate.push(child);
            }
        });

        this.groups.update([group, ...childrenToUpdate]);

        // When group is collapsed (newShowNested === false), all markers from subgroups show in group row (item.group = groupId).
        // When group is expanded (newShowNested === true), markers restore to their subgroup row (item.group = item.originalGroup).
        const itemUpdates: any[] = [];
        this.items.forEach((item: any) => {
            if (item.type === 'background') return;
            const itemParent = String(item.parentGroup || '');
            const itemOrigGroup = String(item.originalGroup || item.group || '');
            if (itemParent === String(groupId) || childIdSet.has(itemOrigGroup)) {
                const targetGroup = newShowNested ? (item.originalGroup || itemOrigGroup) : groupId;
                if (item.group !== targetGroup) {
                    const visItem = (this.mainTimeline as any)?.itemSet?.items?.[item.id];
                    if (visItem && typeof visItem.hide === 'function') {
                        try {
                            visItem.hide();
                        } catch {}
                    }
                    itemUpdates.push({
                        id: item.id,
                        group: targetGroup,
                        subgroup: undefined
                    });
                }
            }
        });

        if (itemUpdates.length > 0) {
            this.isInternalDataUpdate = true;
            this.items.update(itemUpdates);
            this.isInternalDataUpdate = false;
        }

        if (labelEl) {
            if (newShowNested) {
                labelEl.classList.remove('collapsed');
                labelEl.classList.add('expanded');
            } else {
                labelEl.classList.remove('expanded');
                labelEl.classList.add('collapsed');
            }
        }

        const itemSetGroup = (this.mainTimeline as any)?.itemSet?.groups?.[groupId];
        if (itemSetGroup) {
            itemSetGroup.showNested = newShowNested;
            if (itemSetGroup.dom?.label) {
                if (newShowNested) {
                    itemSetGroup.dom.label.classList.remove('collapsed');
                    itemSetGroup.dom.label.classList.add('expanded');
                } else {
                    itemSetGroup.dom.label.classList.remove('expanded');
                    itemSetGroup.dom.label.classList.add('collapsed');
                }
            }
        }

        try {
            (this.mainTimeline as any)?.redraw();
            this.checkItemWidths();
        } catch {}
    }

    public setAllGroupsCollapseState(expand: boolean): void {
        if (!this.groups || !this.items) return;
        const allGroups = this.groups.get() as any[];
        const parentGroups = allGroups.filter((g: any) => Array.isArray(g.nestedGroups) && g.nestedGroups.length > 0);
        if (parentGroups.length === 0) return;

        const groupsToUpdate: any[] = [];
        const childIdSet = new Set<string>();

        parentGroups.forEach((parent: any) => {
            parent.showNested = expand;
            groupsToUpdate.push(parent);
            parent.nestedGroups.forEach((cid: any) => {
                const childIdStr = String(cid);
                childIdSet.add(childIdStr);
                const child = this.groups.get(cid) as any;
                if (child) {
                    child.visible = expand;
                    groupsToUpdate.push(child);
                }
            });
        });

        this.groups.update(groupsToUpdate);

        const itemUpdates: any[] = [];
        this.items.forEach((item: any) => {
            if (item.type === 'background') return;
            const itemParent = String(item.parentGroup || '');
            const itemOrigGroup = String(item.originalGroup || item.group || '');

            if (childIdSet.has(itemOrigGroup) || (itemParent && itemParent !== itemOrigGroup)) {
                const targetGroup = expand ? (item.originalGroup || itemOrigGroup) : (item.parentGroup || itemParent);
                if (item.group !== targetGroup) {
                    const visItem = (this.mainTimeline as any)?.itemSet?.items?.[item.id];
                    if (visItem && typeof visItem.hide === 'function') {
                        try {
                            visItem.hide();
                        } catch {}
                    }
                    itemUpdates.push({
                        id: item.id,
                        group: targetGroup,
                        subgroup: undefined
                    });
                }
            }
        });

        if (itemUpdates.length > 0) {
            this.isInternalDataUpdate = true;
            this.items.update(itemUpdates);
            this.isInternalDataUpdate = false;
        }

        parentGroups.forEach((parent: any) => {
            const groupId = parent.id;
            const itemSetGroup = (this.mainTimeline as any)?.itemSet?.groups?.[groupId];
            if (itemSetGroup) {
                itemSetGroup.showNested = expand;
                if (itemSetGroup.dom?.label) {
                    if (expand) {
                        itemSetGroup.dom.label.classList.remove('collapsed');
                        itemSetGroup.dom.label.classList.add('expanded');
                    } else {
                        itemSetGroup.dom.label.classList.remove('expanded');
                        itemSetGroup.dom.label.classList.add('collapsed');
                    }
                }
            }
        });

        const nestingLabels = this.mainTimelineContainer?.querySelectorAll('.vis-nesting-group, .vis-label.vis-nesting-group');
        if (nestingLabels) {
            nestingLabels.forEach((el) => {
                if (expand) {
                    el.classList.remove('collapsed');
                    el.classList.add('expanded');
                } else {
                    el.classList.remove('expanded');
                    el.classList.add('collapsed');
                }
            });
        }

        try {
            (this.mainTimeline as any)?.redraw();
            this.checkItemWidths();
        } catch {}

        try {
            parentGroups.forEach((parent: any) => {
                const itemSetGroup = (this.mainTimeline as any)?.itemSet?.groups?.[parent.id];
                const label = itemSetGroup?.dom?.label;
                if (label) {
                    if (expand) {
                        label.classList.remove('collapsed');
                        label.classList.add('expanded');
                    } else {
                        label.classList.remove('expanded');
                        label.classList.add('collapsed');
                    }
                }
            });
        } catch {}
    }

    public collapseAllSubgroups(): void {
        if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
        this.setAllGroupsCollapseState(false);
    }

    public expandAllSubgroups(): void {
        if (this.allowInteractions === false || (this.host && (this.host as any).allowInteractions === false)) return;
        this.setAllGroupsCollapseState(true);
    }


    private updateTopBar(
        currentGroup: string,
        distinctGroups: string[],
        fieldName: string = "Top Level Group",
        hasGroupOrderField: boolean = false,
        isDateField: boolean = false,
        hasSubgroups: boolean = false
    ): void {
        this.hasSubgroups = hasSubgroups;
        const showSearch = (this.formattingSettings as any)?.elementsCard?.showSearch?.value
            ?? (this.formattingSettings as any)?.topBarCard?.showSearch?.value
            ?? (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.elements?.showSearch
            ?? (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.topBar?.showSearch
            ?? true;

        const collapseTitle = this.getLocalizedString("subgroups_collapseAll", "Collapse All");
        const expandTitle = this.getLocalizedString("subgroups_expandAll", "Expand All");

        this.topBarManager.updateTopBar({
            currentGroup,
            distinctGroups,
            fieldName,
            isDateField,
            visualInstanceId: this.visualInstanceId,
            allowInteractions: this.allowInteractions !== false && !(this.host && (this.host as any).allowInteractions === false),
            host: this.host,
            showSearch: showSearch,
            searchTerm: this.searchTerm,
            hasSubgroups: hasSubgroups,
            collapseTitle: collapseTitle,
            expandTitle: expandTitle,
            onCollapseAll: () => this.collapseAllSubgroups(),
            onExpandAll: () => this.expandAllSubgroups(),
            getFontSettings: (c, o) => this.getFontSettings(c, o),
            onGroupChange: (newGroup) => {
                this.clearSelection(true);
                this.selectedTopLevelGroup = newGroup;
                if (this.lastUpdateOptions) {
                    this.update(this.lastUpdateOptions);
                }
            },
            onSearchInput: (term) => {
                this.searchTerm = term;
                this.performTextSearch(term);
            },
            onSearchSubmit: (term) => {
                this.performTextSearch(term);
            },
            onSearchClear: () => {
                this.clearTextSearch();
            }
        });
        this.searchInputEl = this.topBarManager.searchInputEl;
        this.searchClearBtn = this.topBarManager.searchClearBtn;
    }

    private clearTextSearch(): void {
        this.searchTerm = '';
        this.topBarManager.clearTextSearch();
        this.performTextSearch('');
    }

    private performTextSearch(term: string) {
        if (!this.items) return;

        const normalizedTerm = (term || '').trim().toLowerCase();

        this.searchMatchedItemIds.clear();

        if (normalizedTerm.length === 0) {
            this.applySelectionStyles(this.currentSelectedIds);
            return;
        }

        this.items.forEach((item: any) => {
            if (item.type === 'background') return;

            let matches = false;

            if (Array.isArray(item.contentValues)) {
                matches = item.contentValues.some((v: any) => {
                    if (v == null) return false;
                    const str = String(v).toLowerCase();
                    if (str.includes(normalizedTerm)) return true;
                    const plain = sanitizeHtmlToText(str).toLowerCase();
                    return plain.includes(normalizedTerm);
                });
            }

            if (!matches) {
                const fieldsToCheck = [
                    item.contentWithoutNames,
                    item.contentWithNames,
                    item.contentValue,
                    item.content,
                    item.description,
                    item.originalContent,
                    item.eventType,
                    item.group,
                    item.parentGroup,
                    item.subgroupName || item.subgroup
                ];
                for (const field of fieldsToCheck) {
                    if (field == null) continue;
                    const str = String(field).toLowerCase();
                    if (str.includes(normalizedTerm)) {
                        matches = true;
                        break;
                    }
                    const plain = sanitizeHtmlToText(str).toLowerCase();
                    if (plain.includes(normalizedTerm)) {
                        matches = true;
                        break;
                    }
                }
            }

            if (matches) {
                this.searchMatchedItemIds.add(item.id);
            }
        });

        this.applySelectionStyles(this.currentSelectedIds);
    }

    private checkItemWidthsTimer: any = null;

    private checkItemWidths() {
        if (!this.mainTimeline || !this.mainTimelineContainer || !this.items) return;
        if (this.checkItemWidthsTimer) {
            clearTimeout(this.checkItemWidthsTimer);
        }
        this.checkItemWidthsTimer = setTimeout(() => {
            this.doCheckItemWidths();
        }, 50);
    }

    private doCheckItemWidths() {
        if (!this.mainTimeline || !this.mainTimelineContainer || !this.items) return;

        try {
            const windowRange = this.mainTimeline.getWindow();
            if (!windowRange || !windowRange.start || !windowRange.end) return;

            const winStart = windowRange.start.valueOf();
            const winEnd = windowRange.end.valueOf();
            const totalDuration = winEnd - winStart;
            if (totalDuration <= 0) return;

            // Visible timeline center panel width in pixels
            const centerPanel = this.mainTimelineContainer.querySelector('.vis-panel.vis-center') as HTMLElement | null;
            const containerWidth = (centerPanel && centerPanel.clientWidth > 0)
                ? centerPanel.clientWidth
                : (this.mainTimelineContainer.clientWidth || 800);
            if (containerWidth <= 0) return;

            const hasSelection = this.currentSelectedItemIds.size > 0 || (Array.isArray(this.currentSelectedIds) && this.currentSelectedIds.length > 0);
            const updates: any[] = [];

            const selectedCount = this.currentSelectedItemIds.size || (Array.isArray(this.currentSelectedIds) ? this.currentSelectedIds.length : 0);
            const isMultiSelect = selectedCount > 1;
            const mostRecentSelectedId = hasSelection
                ? (this.mostRecentSelectedId ?? findMostRecentItemId(this.items.get({ filter: (it: any) => it.type !== 'background' && this.isItemMatchingSelection(it) })))
                : null;

            const keepRangeMarkers = (this.formattingSettings as any)?.generalCard?.keepRangeMarkers?.value === true
                || (this.formattingSettings as any)?.markersCard?.keepRangeMarkers?.value === true
                || (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.general?.keepRangeMarkers === true
                || (this.lastUpdateOptions?.dataViews?.[0]?.metadata?.objects as any)?.markers?.keepRangeMarkers === true;

            this.items.forEach((item: any) => {
                if (item.type === 'background') return;
                // Only evaluate date range items (items with different start and end dates)
                if (item.originalType !== 'range') return;
                if (!item.start || !item.end) return;

                const itemStart = new Date(item.start).getTime();
                const itemEnd = new Date(item.end).getTime();
                const duration = Math.abs(itemEnd - itemStart);
                if (duration <= 0) return;

                // Screen pixel width for this range duration on current zoom level
                const widthPx = (duration / totalDuration) * containerWidth;

                // Threshold with hysteresis:
                // Range markers should show as dot markers when the timescale is zoomed out far enough
                // for the range to be too small to make a range more than 5px wide (widthPx <= 5).
                // When zoomed in enough to exceed 5px (with small hysteresis > 5.5px to prevent flickering),
                // revert to range marker.
                // If keepRangeMarkers is enabled, always keep as range marker.
                const currentType = item.type;
                let targetType = currentType;

                if (keepRangeMarkers) {
                    targetType = 'range';
                } else {
                    if (currentType === 'range' && widthPx <= 5) {
                        targetType = 'point';
                    } else if (currentType === 'point' && widthPx > 5.5) {
                        targetType = 'range';
                    }
                }

                if (targetType !== currentType) {
                    const isPoint = targetType === 'point';
                    const isSelected = hasSelection && this.isItemMatchingSelection(item);
                    const isMultiSelect = selectedCount > 1;
                    const { className: newClass, style: newStyle } = this.computeItemStyleAndClass(
                        item,
                        isSelected,
                        hasSelection,
                        isMultiSelect,
                        mostRecentSelectedId,
                        isPoint
                    );

                    updates.push({
                        id: item.id,
                        type: targetType,
                        isPoint: isPoint,
                        end: item.end,
                        content: '',
                        className: newClass,
                        style: newStyle
                    });
                }
            });

            if (updates.length > 0) {
                this.isInternalDataUpdate = true;
                this.items.update(updates);
                this.isInternalDataUpdate = false;

                if (hasSelection && (this.mainTimeline as any)?.setSelection) {
                    try {
                        const selectedIds = Array.from(this.currentSelectedItemIds);
                        (this.mainTimeline as any).setSelection(selectedIds, { focus: false, animation: false });
                    } catch {}
                }
            }
        } catch (e) {
            console.warn("doCheckItemWidths error:", e);
        }
    }


    public update(options: VisualUpdateOptions) {
        if (this.events) {
            this.events.renderingStarted(options);
        }
        try {
            this.lastUpdateOptions = options;
            this.allowInteractions = this.host && typeof (this.host as any).allowInteractions === 'boolean'
                ? (this.host as any).allowInteractions
                : true;

            const hc = this.getHighContrastSettings();
            if (hc.isHighContrast) {
                this.target.classList.add("high-contrast");
                if (hc.background) {
                    this.target.style.backgroundColor = hc.background;
                    if (this.timelineArea) this.timelineArea.style.backgroundColor = hc.background;
                    if (this.detailsPanel) this.detailsPanel.style.backgroundColor = hc.background;
                    if (this.statusOverlay) this.statusOverlay.style.backgroundColor = hc.background;
                }
                if (hc.foreground) {
                    this.target.style.color = hc.foreground;
                    if (this.detailsPanel) this.detailsPanel.style.color = hc.foreground;
                    if (this.statusTitle) this.statusTitle.style.color = hc.foreground;
                    if (this.statusMessage) this.statusMessage.style.color = hc.foreground;
                }
            } else {
                this.target.classList.remove("high-contrast");
                this.target.style.backgroundColor = "";
                this.target.style.color = "";
                if (this.timelineArea) this.timelineArea.style.backgroundColor = "";
                if (this.detailsPanel) {
                    this.detailsPanel.style.backgroundColor = "";
                    this.detailsPanel.style.color = "";
                }
                if (this.statusOverlay) this.statusOverlay.style.backgroundColor = "";
                if (this.statusTitle) this.statusTitle.style.color = "";
                if (this.statusMessage) this.statusMessage.style.color = "";
            }

            const viewportWidth = (options.viewport && options.viewport.width > 0) ? options.viewport.width : (this.target.clientWidth || 800);
            const viewportHeight = (options.viewport && options.viewport.height > 0) ? options.viewport.height : (this.target.clientHeight || 600);
            this.target.style.width = viewportWidth + "px";
            this.target.style.height = viewportHeight + "px";

            if (!options.dataViews || !options.dataViews[0]) {
                this.showStatus(
                    "No Data Available",
                    this.getLocalizedString("status_noData", "Please assign fields to the timeline visual from the Visualizations pane.")
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            try {
                this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);
            } catch (e) {
                console.warn("Failed to populate formatting settings:", e);
            }

            const configuredInitialWidth = Number((this.formattingSettings as any)?.detailsPanelCard?.initialWidth?.value) || 240;
            if (this.lastConfiguredInitialWidth !== configuredInitialWidth) {
                this.lastConfiguredInitialWidth = configuredInitialWidth;
                this.detailsPanelWidth = configuredInitialWidth;
            } else if (this.detailsPanelWidth == null) {
                this.detailsPanelWidth = configuredInitialWidth;
            }
            if (this.detailsPanel && this.detailsPanelWidth != null) {
                this.detailsPanel.style.width = `${this.detailsPanelWidth}px`;
            }

            // Future Events setting
            const showFutureEvents = (this.formattingSettings as any)?.elementsCard?.showFutureEvents?.value
                ?? (this.formattingSettings as any)?.timelineCard?.showFutureEvents?.value
                ?? (options.dataViews[0]?.metadata?.objects as any)?.elements?.showFutureEvents
                ?? (options.dataViews[0]?.metadata?.objects as any)?.timeline?.showFutureEvents
                !== false;
            if (this.mainTimelineContainer) {
                this.mainTimelineContainer.classList.toggle('hide-future-events', !showFutureEvents);
            }

            // Minimum zoom level limit
            const minZoomSetting = (this.formattingSettings as any)?.generalCard?.minZoom?.value?.value
                ?? (this.formattingSettings as any)?.generalCard?.minZoom?.value
                ?? (this.formattingSettings as any)?.timelineCard?.minZoom?.value?.value
                ?? (this.formattingSettings as any)?.timelineCard?.minZoom?.value
                ?? (options.dataViews[0]?.metadata?.objects as any)?.general?.minZoom
                ?? (options.dataViews[0]?.metadata?.objects as any)?.timeline?.minZoom
                ?? 'day';

            let zoomMinMs = 1000 * 60 * 60 * 24; // default 1 day
            switch (String(minZoomSetting).toLowerCase()) {
                case '1hour':
                case '1h':
                case 'hour':
                    zoomMinMs = 1000 * 60 * 60 * 1;
                    break;
                case '6hours':
                case '6hour':
                case '6h':
                    zoomMinMs = 1000 * 60 * 60 * 6;
                    break;
                case '12hours':
                case '12hour':
                case '12h':
                    zoomMinMs = 1000 * 60 * 60 * 12;
                    break;
                case 'day':
                case '1day':
                case 'daily':
                    zoomMinMs = 1000 * 60 * 60 * 24;
                    break;
                case 'week':
                case '1week':
                case 'weekly':
                    zoomMinMs = 1000 * 60 * 60 * 24 * 7;
                    break;
                case 'month':
                case '1month':
                case 'monthly':
                    zoomMinMs = 1000 * 60 * 60 * 24 * 30;
                    break;
            }
            this.currentZoomMinMs = zoomMinMs;
            const effectiveZoomMinMs = (this.lastDataSpanMs && this.lastDataSpanMs <= 1000 * 60 * 60 * 24)
                ? Math.min(zoomMinMs, 1000 * 60 * 60 * 1)
                : zoomMinMs;
            if (this.mainTimeline) {
                this.mainTimeline.setOptions({ zoomMin: effectiveZoomMinMs });
            }

            // Global Font Settings
            const { fontFamily: globalFontFamily, baseFontSize } = this.getGlobalFontSettings();
            setElementCssVar(this.target as HTMLElement, '--globalFontFamily', globalFontFamily);
            setElementCssVar(this.target as HTMLElement, '--globalBaseFontSize', `${baseFontSize}pt`);

            // X-Axis Font
            const { fontFamily: xAxisFontFamily, fontSize: xAxisFontSize } = this.getFontSettings('timelineCard', 'timeline');
            setElementCssVar(this.mainTimelineContainer, '--globalFontFamily', globalFontFamily);
            setElementCssVar(this.mainTimelineContainer, '--xAxisFontFamily', xAxisFontFamily);
            setElementCssVar(this.mainTimelineContainer, '--xAxisFontSize', xAxisFontSize > 0 ? `${xAxisFontSize}pt` : null);
            setElementCssVar(this.mainTimelineContainer, '--itemFontSize', xAxisFontSize > 0 ? `${xAxisFontSize}pt` : null);
            this.mainTimelineContainer?.style.removeProperty('--xAxisFontColor');

            // Marker Height & Swimlane Height (dictated by padding offset from base font size)
            const markerHeightVal = Number(
                (this.formattingSettings as any)?.generalCard?.markerHeight?.value
                ?? (options.dataViews[0]?.metadata?.objects as any)?.markers?.markerHeight
            ) || 20;
            const clampedMarkerHeight = Math.max(10, Math.min(80, markerHeightVal));

            const clampedPadding = Math.max(0, Math.min(50, PADDING_VALUES.marker));
            const rowHeightVal = Math.max(clampedMarkerHeight + (clampedPadding * 2), 16);

            if (this.mainTimelineContainer) {
                this.mainTimelineContainer.style.setProperty('--markerHeight', `${clampedMarkerHeight}px`);
                this.mainTimelineContainer.style.setProperty('--rowHeight', `${rowHeightVal}px`);
                this.mainTimelineContainer.style.setProperty('--markerPadding', `${clampedPadding}px`);
            }

            // Group Header Font
            const { fontFamily: groupFontFamily, fontSize: groupFontSize } = this.getFontSettings('groupOrderCard', 'groupOrderCard');
            setElementCssVar(this.mainTimelineContainer, '--groupHeaderFontFamily', groupFontFamily);
            setElementCssVar(this.mainTimelineContainer, '--groupHeaderFontSize', groupFontSize > 0 ? `${groupFontSize}pt` : null);
            this.mainTimelineContainer?.style.removeProperty('--groupHeaderFontColor');

            // Mini Timeline Font
            const { fontFamily: miniFontFamily, fontSize: miniFontSize } = this.getFontSettings('miniTimelineCard', 'miniTimeline');
            setElementCssVar(this.miniTimelineContainer, '--globalFontFamily', globalFontFamily);
            setElementCssVar(this.miniTimelineContainer, '--miniFontFamily', miniFontFamily);
            setElementCssVar(this.miniTimelineContainer, '--miniFontSize', miniFontSize > 0 ? `${miniFontSize}pt` : null);
            this.miniTimelineContainer?.style.removeProperty('--miniFontColor');

            // Top Bar / Toolbar Font & Padding (offset from base font size)
            const { fontFamily: topBarFontFamily, fontSize: topBarFontSize } = this.getFontSettings('topBarCard', 'topBar');
            setElementCssVar(this.topBar, '--globalFontFamily', globalFontFamily);
            setElementCssVar(this.topBar, '--topBarFontFamily', topBarFontFamily);
            setElementCssVar(this.topBar, '--topBarFontSize', topBarFontSize > 0 ? `${topBarFontSize}pt` : null);
            this.topBar?.style.removeProperty('--topBarFontColor');

            const topBarPad = Math.max(0, Math.min(50, baseFontSize + PADDING_OFFSETS.topBar));

            if (this.topBar) {
                this.topBar.style.setProperty('--topBarPadding', `${topBarPad}px`);
                this.topBar.style.padding = `${topBarPad}px`;
            }

            // Event Details Header Font
            const { fontFamily: detailsHeaderFontFamily, fontSize: detailsHeaderFontSize } = this.getFontSettings('detailsPanelCard', 'detailsPanel', 'headerFont');
            setElementCssVar(this.detailsPanel, '--globalFontFamily', globalFontFamily);
            setElementCssVar(this.detailsPanel, '--detailsHeaderFontFamily', detailsHeaderFontFamily);
            setElementCssVar(this.detailsPanel, '--detailsHeaderFontSize', detailsHeaderFontSize > 0 ? `${detailsHeaderFontSize}pt` : null);
            this.detailsPanel?.style.removeProperty('--detailsHeaderFontColor');

            if (this.detailsPanelHeader) {
                this.detailsPanelHeader.style.fontFamily = detailsHeaderFontFamily || '';
                this.detailsPanelHeader.style.fontSize = detailsHeaderFontSize > 0 ? `${detailsHeaderFontSize}pt` : '';
                this.detailsPanelHeader.style.color = '';
            }

            // Event Details Font & Padding (offset from base font size)
            const { fontFamily: detailsFontFamily, fontSize: detailsFontSize } = this.getFontSettings('detailsPanelCard', 'detailsPanel');
            setElementCssVar(this.detailsPanel, '--detailsFontFamily', detailsFontFamily);
            setElementCssVar(this.detailsPanel, '--detailsFontSize', detailsFontSize > 0 ? `${detailsFontSize}pt` : null);
            this.detailsPanel?.style.removeProperty('--detailsFontColor');

            const detailsPad = Math.max(0, Math.min(50, baseFontSize + PADDING_OFFSETS.details));

            if (this.detailsPanelBody) {
                this.detailsPanelBody.style.setProperty('--detailsPadding', `${detailsPad}px`);
                this.detailsPanelBody.style.padding = `${detailsPad}px`;
            }

            // Tooltip Font Settings
            const { fontFamily: tooltipFontFamily, fontSize: tooltipFontSize } = this.getFontSettings('tooltipsCard', 'tooltips');
            this.currentTooltipFontFamily = tooltipFontFamily;
            this.currentTooltipFontSize = tooltipFontSize;

            setElementCssVar(this.target as HTMLElement, '--tooltipFontFamily', tooltipFontFamily);
            setElementCssVar(this.target as HTMLElement, '--tooltipFontSize', tooltipFontSize > 0 ? `${tooltipFontSize}pt` : null);

            if (this.enhancedTooltipElement) {
                setElementCssVar(this.enhancedTooltipElement, '--globalFontFamily', globalFontFamily);
                setElementCssVar(this.enhancedTooltipElement, '--tooltipFontFamily', tooltipFontFamily);
                this.enhancedTooltipElement.style.fontFamily = tooltipFontFamily || '';
                setElementCssVar(this.enhancedTooltipElement, '--tooltipFontSize', tooltipFontSize > 0 ? `${tooltipFontSize}pt` : null);
            }

            if (!options.dataViews[0].table) {
                this.showStatus(
                    "No Table Data Mapping",
                    this.getLocalizedString("status_noTable", "The visual expects table data. Please ensure fields are mapped to the visual's data roles."),
                    `DataView keys present: ${Object.keys(options.dataViews[0]).join(", ")}`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            const table = options.dataViews[0].table;
            const rows = table.rows || [];
            const columns = table.columns || [];

            if (rows.length === 0) {
                this.hideLoading();
                this.showStatus(
                    "No Rows Returned",
                    "The current query returned 0 rows. Check your report filters or slicers.",
                    `Columns: ${columns.map((c: any) => c.displayName || c.queryName).join(", ")}`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            const isResizeOnly = !!(options.type && (
                options.type === powerbi.VisualUpdateType.Resize ||
                options.type === powerbi.VisualUpdateType.ResizeEnd
            ));
            const isStyleOnly = !!(options.type && (
                options.type === powerbi.VisualUpdateType.Style
            ));
            const isViewModeOnly = !!(options.type && (
                options.type === powerbi.VisualUpdateType.ViewMode
            ));
            const isExplicitReload = !!(options.type && (
                (options.type & powerbi.VisualUpdateType.All) === powerbi.VisualUpdateType.All
            ));

            const metaCols = options.dataViews?.[0]?.metadata?.columns || [];
            const currentDataSignature = computeDataSignature(rows, columns, this.selectedTopLevelGroup, metaCols);
            const dataChanged = this.lastDataSignature !== '' && this.lastDataSignature !== currentDataSignature;
            const isInitialLoad = !this.hasLoadedOnce;

            const isFilterChangeOrReload = !isResizeOnly && !isStyleOnly && !isViewModeOnly && (
                isInitialLoad ||
                isExplicitReload ||
                dataChanged
            );

            if (isFilterChangeOrReload) {
                this.showLoading();
                const updateId = ++this.currentUpdateId;
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (updateId !== this.currentUpdateId) return;
                        try {
                            this.renderTimelineData(options, rows, columns, viewportHeight, true);
                            this.lastDataSignature = currentDataSignature;
                            this.hasLoadedOnce = true;
                        } catch (err: any) {
                            console.error("Timeline visual update error:", err);
                            if (this.events) {
                                this.events.renderingFailed(options, err ? (err.message || String(err)) : "Rendering failed");
                            }
                            this.hideLoading();
                            this.showStatus(
                                "Visual Error",
                                "An error occurred while updating the timeline visual.",
                                err?.stack || err?.message || String(err)
                            );
                            return;
                        }

                        setTimeout(() => {
                            if (updateId === this.currentUpdateId) {
                                if (this.statusOverlay && this.statusOverlay.style.display !== "none") {
                                    this.hideLoading();
                                    return;
                                }
                                this.showEntireTimeline();
                                this.hideLoading();
                                if (this.events) {
                                    this.events.renderingFinished(options);
                                }
                            }
                        }, 120);
                    }, 25);
                });
            } else {
                this.renderTimelineData(options, rows, columns, viewportHeight, false);
                this.lastDataSignature = currentDataSignature;
                this.hasLoadedOnce = true;
                if (this.events && (!this.statusOverlay || this.statusOverlay.style.display === "none")) {
                    this.events.renderingFinished(options);
                }
            }
        } catch (err: any) {
            console.error("Timeline visual update error:", err);
            if (this.events) {
                this.events.renderingFailed(options, err ? (err.message || String(err)) : "Rendering failed");
            }
            this.hideLoading();
            this.showStatus(
                "Visual Error",
                "An error occurred while updating the timeline visual.",
                err?.stack || err?.message || String(err)
            );
        }
    }


    private currentTimeTrackingTimer: any = null;

    private startTimeTracking(): void {
        this.stopTimeTracking();
        this.currentTimeTrackingTimer = setInterval(() => {
            this.updateCurrentTimeTracking();
        }, 5000);
    }

    private stopTimeTracking(): void {
        if (this.currentTimeTrackingTimer) {
            clearInterval(this.currentTimeTrackingTimer);
            this.currentTimeTrackingTimer = null;
        }
    }

    private updateCurrentTimeTracking(): void {
        if (!this.items || !this.mainTimeline) return;
        const now = (this.mainTimeline as any)?.currentTime?.getCurrentTime?.() || new Date();
        const updates: any[] = [];
        this.items.forEach((item: any) => {
            if (item.isOngoing) {
                updates.push({
                    id: item.id,
                    end: now
                });
            }
        });
        const futureItem = this.items.get('future-bg');
        if (futureItem) {
            updates.push({
                id: 'future-bg',
                start: now
            });
        }
        if (updates.length > 0) {
            this.isInternalDataUpdate = true;
            this.items.update(updates);
            this.isInternalDataUpdate = false;
        }
    }

    private updateDataSetCollections(newGroups: any[], newItems: any[], newMiniGroups: any[], miniitems: any[], hasGroupOrderField?: boolean): void {
        this.isInternalDataUpdate = true;
        this.groups.clear();
        this.groups.add(newGroups);

        this.items.clear();
        this.items.add(newItems);

        const hasOngoingItems = newItems.some((it: any) => it.isOngoing);
        const hasFutureBg = newItems.some((it: any) => it.id === 'future-bg');
        if (hasOngoingItems || hasFutureBg) {
            this.startTimeTracking();
        } else {
            this.stopTimeTracking();
        }

        const existingMiniGroupIds = this.miniGroups ? this.miniGroups.getIds() : [];
        const newMiniGroupIds = newMiniGroups.map(g => g.id);
        const miniGroupsMatch = existingMiniGroupIds.length === newMiniGroupIds.length && existingMiniGroupIds.every((id, i) => String(id) === String(newMiniGroupIds[i]));
        if (!miniGroupsMatch) {
            this.miniGroups.clear();
            this.miniGroups.add(newMiniGroups);
        } else {
            this.miniGroups.update(newMiniGroups);
        }

        this.miniItems.clear();
        this.miniItems.add(miniitems);
    }

    private renderTimelineData(
        options: VisualUpdateOptions,
        rows: powerbi.DataViewTableRow[],
        columns: powerbi.DataViewMetadataColumn[],
        viewportHeight: number,
        isFilterChangeOrReload: boolean
    ): void {
        try {
            const table = options.dataViews[0].table;
            // Map column roles to indices
            const { colMap, contentIndices } = resolveColumnRoles(columns, options);

            // Top Level Group handling
            const topLevelCard = (this.formattingSettings as any)?.topLevelGroupCard;
            const showTopLevelGroup = topLevelCard?.show?.value ?? true;
            const maxDistinctTopLevelItems = Number(topLevelCard?.maxDistinctItems?.value) || 100;
            const topLevelOverflowMessage = topLevelCard?.overflowMessage?.value
                || "Too many results have been returned and you should select a filter value to continue.";

            const topLevelCol = colMap['topLevelGroup'] !== undefined ? columns[colMap['topLevelGroup']] : null;
            const topLevelFieldName = topLevelCol ? (topLevelCol.displayName || topLevelCol.queryName || 'Top Level Group') : 'Top Level Group';

            const isTopLevelDate = topLevelCol !== null && (
                isDateColumn(topLevelCol) ||
                rows.some((row: any) => {
                    const val = row[colMap['topLevelGroup']];
                    return val instanceof Date || (typeof val === 'string' && val.trim().length > 0 && (
                        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val.trim()) ||
                        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(val.trim())
                    ) && !isNaN(parseDate(val)?.getTime() ?? NaN));
                })
            );

            const formatTopLevelGroupValue = (val: any): string => {
                if (val === null || val === undefined || String(val).trim().length === 0) {
                    return '(Blank)';
                }
                if (isTopLevelDate) {
                    return formatDateAsDDMMMYYYY(val);
                }
                return String(val).trim();
            };

            const groupCol = colMap['group'] !== undefined ? columns[colMap['group']] : null;
            const isGroupDate = groupCol !== null && (
                isDateColumn(groupCol) ||
                rows.some((row: any) => {
                    const val = row[colMap['group']];
                    return val instanceof Date || (typeof val === 'string' && val.trim().length > 0 && (
                        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val.trim()) ||
                        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(val.trim())
                    ) && !isNaN(parseDate(val)?.getTime() ?? NaN));
                })
            );

            const subgroupCol = colMap['subgroup'] !== undefined ? columns[colMap['subgroup']] : null;
            const isSubgroupDate = subgroupCol !== null && (
                isDateColumn(subgroupCol) ||
                rows.some((row: any) => {
                    const val = row[colMap['subgroup']];
                    return val instanceof Date || (typeof val === 'string' && val.trim().length > 0 && (
                        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val.trim()) ||
                        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(val.trim())
                    ) && !isNaN(parseDate(val)?.getTime() ?? NaN));
                })
            );

            const formatGroupVal = (val: any): string => {
                if (val === null || val === undefined || String(val).trim().length === 0) return 'General';
                if (isGroupDate || val instanceof Date) {
                    return formatDateAsDDMMMYYYY(val);
                }
                return String(val).trim();
            };

            const formatSubgroupVal = (val: any): string => {
                if (val === null || val === undefined || String(val).trim().length === 0) return '';
                if (isSubgroupDate || val instanceof Date) {
                    return formatDateAsDDMMMYYYY(val);
                }
                return String(val).trim();
            };

            let distinctTopLevelGroups: string[] = [];
            if (colMap['topLevelGroup'] !== undefined) {
                const topLevelSet = new Set<string>();
                rows.forEach((row: any) => {
                    const val = row[colMap['topLevelGroup']];
                    const str = formatTopLevelGroupValue(val);
                    topLevelSet.add(str);
                });
                if (isTopLevelDate) {
                    distinctTopLevelGroups = Array.from(topLevelSet).sort((a, b) => {
                        if (a === '(Blank)') return 1;
                        if (b === '(Blank)') return -1;
                        const timeA = parseDate(a)?.getTime() ?? moment(a, 'DD MMM YYYY HH:mm').valueOf();
                        const timeB = parseDate(b)?.getTime() ?? moment(b, 'DD MMM YYYY HH:mm').valueOf();
                        if (!isNaN(timeA) && !isNaN(timeB)) {
                            return timeA - timeB;
                        }
                        return a.localeCompare(b);
                    });
                } else {
                    distinctTopLevelGroups = Array.from(topLevelSet).sort((a, b) => a.localeCompare(b));
                }
            }

            // Check if top level group returns more distinct values than allowed
            if (showTopLevelGroup && colMap['topLevelGroup'] !== undefined && distinctTopLevelGroups.length > maxDistinctTopLevelItems) {
                if (this.topBar) this.topBar.style.display = "none";
                this.selectedTopLevelGroup = null;
                this.currentSelectedItemIds.clear();
                this.currentSelectedKeys.clear();
                this.currentSelectedIds = [];
                this.hideLandingPage();
                this.hideLoading();
                this.showStatus(
                    "Too Many Results",
                    topLevelOverflowMessage,
                    `The "${topLevelFieldName}" field returned ${distinctTopLevelGroups.length} distinct values (limit is ${maxDistinctTopLevelItems}). Please select a filter value to continue.`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            } else if ((!showTopLevelGroup || colMap['topLevelGroup'] === undefined) && colMap['group'] !== undefined) {
                const groupSet = new Set<string>();
                rows.forEach((row: any) => {
                    const val = row[colMap['group']];
                    const str = formatGroupVal(val);
                    groupSet.add(str);
                });
                if (groupSet.size > 100) {
                    if (this.topBar) this.topBar.style.display = "none";
                    this.selectedTopLevelGroup = null;
                    this.currentSelectedItemIds.clear();
                    this.currentSelectedKeys.clear();
                    this.currentSelectedIds = [];
                    const groupCol = columns[colMap['group']];
                    const groupFieldName = groupCol ? (groupCol.displayName || groupCol.queryName || 'Group') : 'Group';
                    this.hideLandingPage();
                    this.hideLoading();
                    this.showStatus(
                        "Too Many Results",
                        this.getLocalizedString(
                            "status_tooManyResults",
                            "Too many results have been returned and you should select a filter value to continue."
                        ),
                        `The "${groupFieldName}" field returned ${groupSet.size} distinct values (limit is 100). Please select a filter value to continue.`
                    );
                    if (this.events) { this.events.renderingFinished(options); }
                    return;
                }
            }

            let indexedRows = rows.map((row: any, i: number) => ({ row, originalIndex: i }));

            const hasGroupOrderField = colMap['groupOrder'] !== undefined;

            let hasSubgroups = false;

            if (showTopLevelGroup && colMap['topLevelGroup'] !== undefined && distinctTopLevelGroups.length > 0) {
                if (!this.selectedTopLevelGroup || !distinctTopLevelGroups.includes(this.selectedTopLevelGroup)) {
                    this.selectedTopLevelGroup = distinctTopLevelGroups[0];
                }
                indexedRows = indexedRows.filter((item: any) => {
                    const val = item.row[colMap['topLevelGroup']];
                    const str = formatTopLevelGroupValue(val);
                    return str === this.selectedTopLevelGroup;
                });
                hasSubgroups = colMap['subgroup'] !== undefined && indexedRows.some((item: any) => item.row[colMap['subgroup']] != null && String(item.row[colMap['subgroup']]).trim().length > 0);
                this.hideLandingPage();
                this.updateTopBar(this.selectedTopLevelGroup, distinctTopLevelGroups, topLevelFieldName, hasGroupOrderField, isTopLevelDate, hasSubgroups);
            } else {
                this.selectedTopLevelGroup = null;
                this.hideLandingPage();
                hasSubgroups = colMap['subgroup'] !== undefined && indexedRows.some((item: any) => item.row[colMap['subgroup']] != null && String(item.row[colMap['subgroup']]).trim().length > 0);
                this.updateTopBar('', [], '', hasGroupOrderField, false, hasSubgroups);
            }

            if (this.lastRenderedTopLevelGroup !== this.selectedTopLevelGroup) {
                this.lastRenderedTopLevelGroup = this.selectedTopLevelGroup;
                this.currentSelectedItemIds.clear();
                this.currentSelectedKeys.clear();
                this.currentSelectedIds = [];
                this.updateGroupLabelSelectionStyles(null);
            }

            // Handle Top Bar and Mini Timeline container heights
            const showTopBar = this.topBar && this.topBar.style.display !== "none";
            const topBarFontSizeNum = this.getFontSettings('topBarCard', 'topBar').fontSize || 11;
            const { baseFontSize } = this.getGlobalFontSettings();
            const topBarPad = Math.max(0, Math.min(50, baseFontSize + PADDING_OFFSETS.topBar));
            const topBarDynamicHeight = topBarFontSizeNum > 11 ? Math.max(28, Math.round(topBarFontSizeNum * 2.3)) : 28;
            const topBarTotalHeight = topBarDynamicHeight + (topBarPad * 2);
            const topBarHeight = showTopBar ? topBarTotalHeight : 0;
            if (this.topBar) {
                this.topBar.style.setProperty('--topBarHeight', `${topBarTotalHeight}px`);
                this.topBar.style.height = `${topBarTotalHeight}px`;
            }
            const showMiniTimeline = (this.formattingSettings as any)?.miniTimelineCard?.show?.value ?? true;
            const configuredMiniHeight = Number((this.formattingSettings as any)?.miniTimelineCard?.height?.value);
            const validMiniHeight = (!isNaN(configuredMiniHeight) && configuredMiniHeight >= 50) ? configuredMiniHeight : 90;
            const miniHeight = showMiniTimeline ? validMiniHeight : 0;
            const mainHeight = Math.max(80, viewportHeight - miniHeight - topBarHeight);

            if (this.contentContainer) {
                this.contentContainer.style.display = "flex";
                this.contentContainer.style.height = (viewportHeight - topBarHeight) + "px";
            }

            this.mainTimelineContainer.style.display = "block";
            this.mainTimelineContainer.style.width = "100%";
            this.mainTimelineContainer.style.height = mainHeight + "px";

            if (showMiniTimeline) {
                this.miniTimelineContainer.style.display = "block";
                this.miniTimelineContainer.style.height = miniHeight + "px";
                this.miniTimelineContainer.style.minHeight = miniHeight + "px";
                this.miniTimelineContainer.style.maxHeight = miniHeight + "px";
                this.miniTimelineContainer.style.flex = `0 0 ${miniHeight}px`;
                if (this.miniTimeline) {
                    this.miniTimeline.setOptions({ height: miniHeight });
                }
            } else {
                this.miniTimelineContainer.style.display = "none";
            }

            if (indexedRows.length === 0) {
                this.showStatus(
                    `No Rows for Selected ${topLevelFieldName}`,
                    `The selected ${topLevelFieldName} has no matching events.`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            if (colMap['startDate'] === undefined) {
                const activeRoles = Object.keys(colMap).join(", ") || "none";
                const colNames = columns.map((c: any) => c.displayName || c.queryName).join(", ");
                this.showStatus(
                    "Start Date Field Required",
                    "Please assign a Date or DateTime field to the 'Start Date' bucket in the Visualizations pane.",
                    `Active roles: [${activeRoles}]\nColumns in table: [${colNames}]`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            // Cross-highlighting IDs and external highlights
            let selectedIds: any[] = [];
            let hasSelectionFromManager = false;
            try {
                if (this.isCrossFilterEnabled() && this.selectionManager && typeof this.selectionManager.getSelectionIds === 'function') {
                    const smIds = this.selectionManager.getSelectionIds();
                    if (Array.isArray(smIds) && smIds.length > 0) {
                        selectedIds = smIds;
                        hasSelectionFromManager = true;
                        this.currentSelectedIds = smIds;
                        this.currentSelectedKeys.clear();
                        smIds.forEach((id: any) => {
                            if (id && typeof id.getKey === 'function') {
                                this.currentSelectedKeys.add(id.getKey());
                            } else if (id) {
                                try { this.currentSelectedKeys.add(JSON.stringify(id)); } catch {}
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn("Could not retrieve selection IDs:", e);
            }

            if (!hasSelectionFromManager && this.currentSelectedIds && this.currentSelectedIds.length > 0) {
                selectedIds = this.currentSelectedIds;
            }

            const tableHighlights = (table as any).highlights;
            const categoricalValues = options.dataViews?.[0]?.categorical?.values;
            const hasExtHighlights = hasExternalHighlights(table, columns, categoricalValues);

            if (isFilterChangeOrReload) {
                if (!hasExtHighlights && !hasSelectionFromManager) {
                    this.clearSelection();
                    selectedIds = [];
                }
            } else if (!hasExtHighlights && selectedIds.length === 0 && this.currentSelectedItemIds.size === 0) {
                this.clearSelection();
            }

            const hasCrossHighlight = selectedIds.length > 0 || this.currentSelectedKeys.size > 0 || this.currentSelectedItemIds.size > 0 || hasExtHighlights;

            const rawTheme = (this.formattingSettings as any)?.markersCard?.colorTheme?.value;
            const activeTheme = getColorTheme(rawTheme);
            const themePalette = activeTheme.palette;
            const themeDefaultColor = activeTheme.defaultColor;

            const rawColorThemeVal = typeof rawTheme === 'object' && rawTheme !== null ? rawTheme.value : rawTheme;
            const isEventColorTheme = String(rawColorThemeVal || '').toLowerCase().replace(/[\s-_]/g, '') === 'eventcolor';

            const rawColorLevel = (this.formattingSettings as any)?.markersCard?.colorLevel?.value;
            const rawColorLevelVal = typeof rawColorLevel === 'object' && rawColorLevel !== null ? rawColorLevel.value : rawColorLevel;
            const isGroupAndEventType = String(rawColorLevelVal || '').toLowerCase().replace(/[\s-_]/g, '') === 'groupandeventtype';

            const newItems: any[] = [];
            const newGroups: any[] = [];
            const groupMap = new Map<string, any>();
            const eventTypeColorMap = new Map<string, string>();
            const uniqueColors = new Set<string>();
            const groupMostRecentPastDate = new Map<string, number>();
            const groupDateStatsMap = new Map<string, GroupDateStats>();

            // Add Future Background
            const showFutureEvents = (this.formattingSettings as any)?.elementsCard?.showFutureEvents?.value
                ?? (this.formattingSettings as any)?.timelineCard?.showFutureEvents?.value
                ?? (options.dataViews[0]?.metadata?.objects as any)?.elements?.showFutureEvents
                ?? (options.dataViews[0]?.metadata?.objects as any)?.timeline?.showFutureEvents
                !== false;
            const now = new Date();
            if (showFutureEvents) {
                newItems.push({
                    id: 'future-bg',
                    content: '',
                    start: now,
                    end: moment(now).add(100, 'years').toDate(),
                    type: 'background',
                    className: 'vis-future'
                });
            }

            let dateParseErrors = 0;
            let sampleRawDate: any = undefined;

            indexedRows.forEach((itemObj: any) => {
                const row = itemObj.row;
                const originalIndex = itemObj.originalIndex;

                const groupName = (colMap['group'] !== undefined && row[colMap['group']] != null ? formatGroupVal(row[colMap['group']]) : 'General') || 'General';
                const rawSubgroup = colMap['subgroup'] !== undefined && row[colMap['subgroup']] != null ? formatSubgroupVal(row[colMap['subgroup']]) : '';
                const subgroupName = rawSubgroup.length > 0 ? rawSubgroup : '';
                const eventType = (colMap['eventType'] !== undefined && row[colMap['eventType']] != null ? String(row[colMap['eventType']]) : '') || '';

                const rawStartDate = colMap['startDate'] !== undefined ? row[colMap['startDate']] : undefined;
                const rawStartTime = colMap['startTime'] !== undefined ? row[colMap['startTime']] : undefined;
                const rawEndDate = colMap['endDate'] !== undefined ? row[colMap['endDate']] : undefined;
                const rawEndTime = colMap['endTime'] !== undefined ? row[colMap['endTime']] : undefined;

                const startDate = combineDateAndTime(rawStartDate, rawStartTime);

                const hasEndDate = rawEndDate !== undefined && rawEndDate !== null && rawEndDate !== '';
                const hasEndTime = rawEndTime !== undefined && rawEndTime !== null && rawEndTime !== '';

                const effectiveEndDate = hasEndDate ? rawEndDate : (hasEndTime ? rawStartDate : undefined);
                let endDate = combineDateAndTime(effectiveEndDate, rawEndTime);

                if (!startDate) {
                    dateParseErrors++;
                    if (sampleRawDate === undefined) sampleRawDate = rawStartDate;
                    return;
                }

                const isOngoing = (rawEndDate != null && String(rawEndDate).trim().startsWith('9999-01-01'))
                    || (effectiveEndDate != null && String(effectiveEndDate).trim().startsWith('9999-01-01'))
                    || (endDate != null && !isNaN(endDate.getTime()) && endDate.getFullYear() >= 9999);

                if (isOngoing) {
                    endDate = new Date(Math.max(now.getTime(), startDate.getTime()));
                } else {
                    // If end time is provided without an explicit end date, and ends before start time, treat as overnight event
                    if (endDate && endDate < startDate && !hasEndDate && hasEndTime) {
                        endDate = new Date(endDate.getTime() + 86400000);
                    }

                    if (endDate && endDate < startDate) {
                        endDate = undefined;
                    }
                }

                const startMs = startDate.getTime();
                const endMs = (endDate && !isNaN(endDate.getTime())) ? endDate.getTime() : startMs;

                const updateGroupStats = (groupId: string, sMs: number, eMs: number, rIdx: number) => {
                    let stats = groupDateStatsMap.get(groupId);
                    if (!stats) {
                        stats = {
                            minStartDate: sMs,
                            maxStartDate: sMs,
                            minEndDate: eMs,
                            maxEndDate: eMs,
                            firstRowIndex: rIdx
                        };
                        groupDateStatsMap.set(groupId, stats);
                    } else {
                        if (sMs < stats.minStartDate!) stats.minStartDate = sMs;
                        if (sMs > stats.maxStartDate!) stats.maxStartDate = sMs;
                        if (eMs < stats.minEndDate!) stats.minEndDate = eMs;
                        if (eMs > stats.maxEndDate!) stats.maxEndDate = eMs;
                    }
                };

                updateGroupStats(groupName, startMs, endMs, originalIndex);
                if (subgroupName) {
                    updateGroupStats(`${groupName}___${subgroupName}`, startMs, endMs, originalIndex);
                }

                // Track most recent event date in the past (excluding future events where startDate > now)
                if (startDate.getTime() <= now.getTime()) {
                    const eventTime = (endDate && endDate.getTime() <= now.getTime())
                        ? endDate.getTime()
                        : startDate.getTime();
                    const prevMax = groupMostRecentPastDate.get(groupName);
                    if (prevMax === undefined || eventTime > prevMax) {
                        groupMostRecentPastDate.set(groupName, eventTime);
                    }
                    if (subgroupName) {
                        const subgroupId = `${groupName}___${subgroupName}`;
                        const prevSubMax = groupMostRecentPastDate.get(subgroupId);
                        if (prevSubMax === undefined || eventTime > prevSubMax) {
                            groupMostRecentPastDate.set(subgroupId, eventTime);
                        }
                    }
                }

                const showFieldNames = this.getShowFieldNames();
                let content = '';
                const contentValues: string[] = [];
                const contentWithNamesList: string[] = [];
                const contentWithoutNamesList: string[] = [];

                if (contentIndices.length > 0) {
                    contentIndices.forEach((cIdx: number) => {
                        const val = row[cIdx];
                        if (val !== null && val !== undefined) {
                            const col = columns[cIdx];
                            const strVal = formatContentFieldValue(val, col);
                            if (strVal.length > 0) {
                                const fieldName = (col ? (col.displayName || col.queryName || '') : '').trim();

                                contentValues.push(strVal);
                                contentWithoutNamesList.push(strVal);

                                let formattedWithName = strVal;
                                if (fieldName) {
                                    if (!strVal.toLowerCase().startsWith(fieldName.toLowerCase() + ':')) {
                                        formattedWithName = `<b>${fieldName}:</b> ${strVal}`;
                                    }
                                }
                                contentWithNamesList.push(formattedWithName);
                            }
                        }
                    });
                } else if (colMap['content'] !== undefined && row[colMap['content']] != null) {
                    const col = columns[colMap['content']];
                    const val = row[colMap['content']];
                    const strVal = formatContentFieldValue(val, col);
                    if (strVal.length > 0) {
                        const fieldName = (col ? (col.displayName || col.queryName || '') : '').trim();

                        contentValues.push(strVal);
                        contentWithoutNamesList.push(strVal);

                        let formattedWithName = strVal;
                        if (fieldName) {
                            if (!strVal.toLowerCase().startsWith(fieldName.toLowerCase() + ':')) {
                                formattedWithName = `<b>${fieldName}:</b> ${strVal}`;
                            }
                        }
                        contentWithNamesList.push(formattedWithName);
                    }
                }

                const contentWithoutNames = contentWithoutNamesList.join('\n');
                const contentWithNames = contentWithNamesList.join('\n');
                content = showFieldNames ? contentWithNames : contentWithoutNames;
                const rawColor = (colMap['color'] !== undefined && row[colMap['color']] != null ? String(row[colMap['color']]).trim() : '') || '';
                const rawGroupColor = (colMap['groupColor'] !== undefined && row[colMap['groupColor']] != null ? String(row[colMap['groupColor']]).trim() : '') || '';
                const eventClassColIdx = colMap['eventClass'] !== undefined ? colMap['eventClass'] : colMap['additionalClass'];
                // Parse Decoration Classes
                const rawEventClass = eventClassColIdx !== undefined && row[eventClassColIdx] != null
                    ? String(row[eventClassColIdx])
                    : '';
                const sanitizedEventClass = rawEventClass
                    .replace(/[<>"'&]/g, '')
                    .split(/\s+/)
                    .filter(Boolean)
                    .join(' ');
                const additionalClass = sanitizedEventClass;

                // Add Parent Group if new
                if (!groupMap.has(groupName)) {
                    const rawGroupOrder = colMap['groupOrder'] !== undefined ? row[colMap['groupOrder']] : undefined;
                    const parsedOrder = rawGroupOrder !== undefined ? Number(rawGroupOrder) : NaN;
                    const groupOrder = !isNaN(parsedOrder) ? parsedOrder : groupMap.size;

                    let groupColor = rawGroupColor ? normalizeColor(rawGroupColor, '', this.colorPalette) : '';
                    if (!groupColor || groupColor === '#ccc') {
                        groupColor = themePalette[groupMap.size % themePalette.length];
                    }

                    const groupObj: any = {
                        id: groupName,
                        content: groupName,
                        order: groupOrder,
                        style: `border-left: 4px solid ${groupColor};`,
                        className: 'timeline-user-group',
                        color: groupColor,
                        nestedGroups: []
                    };
                    groupMap.set(groupName, groupObj);
                    newGroups.push(groupObj);
                }

                const parentGroupObj = groupMap.get(groupName);
                let targetGroupId = groupName;

                if (subgroupName) {
                    const subgroupId = `${groupName}___${subgroupName}`;
                    targetGroupId = subgroupId;
                    if (!groupMap.has(subgroupId)) {
                        const rawGroupOrder = colMap['groupOrder'] !== undefined ? row[colMap['groupOrder']] : undefined;
                        const parsedOrder = rawGroupOrder !== undefined ? Number(rawGroupOrder) : NaN;
                        const subOrder = !isNaN(parsedOrder) ? parsedOrder : groupMap.size;

                        let subGroupColor = rawGroupColor ? normalizeColor(rawGroupColor, '', this.colorPalette) : '';
                        if (!subGroupColor) {
                            subGroupColor = parentGroupObj.color;
                        }

                        const subgroupObj: any = {
                            id: subgroupId,
                            content: subgroupName,
                            order: subOrder,
                            nestedInGroup: groupName,
                            treeLevel: 1,
                            style: `border-left: 4px solid ${subGroupColor};`,
                            className: 'timeline-user-group timeline-user-subgroup',
                            color: subGroupColor
                        };
                        groupMap.set(subgroupId, subgroupObj);
                        newGroups.push(subgroupObj);

                        if (!parentGroupObj.nestedGroups) {
                            parentGroupObj.nestedGroups = [];
                        }
                        if (!parentGroupObj.nestedGroups.includes(subgroupId)) {
                            parentGroupObj.nestedGroups.push(subgroupId);
                        }
                    }
                }

                // Resolve item marker color:
                // 1. If color theme is Event Color and rawColor is provided, use rawColor
                // 2. Otherwise map according to colorLevel (eventType or groupAndEventType) using theme palette
                // 3. Group's assigned color fallback
                // 4. Formatting settings fill or defaultColor fallback
                // 5. Theme defaultColor fallback
                let color = '';
                if (isEventColorTheme && rawColor) {
                    color = normalizeColor(rawColor, '', this.colorPalette);
                }
                if (!color) {
                    const colorKey = isGroupAndEventType
                        ? ((groupName || '') + '___' + (eventType || ''))
                        : (eventType || groupName || '');

                    if (colorKey) {
                        let etColor = eventTypeColorMap.get(colorKey);
                        if (!etColor) {
                            etColor = themePalette[eventTypeColorMap.size % themePalette.length];
                            eventTypeColorMap.set(colorKey, etColor);
                        }
                        color = etColor;
                    }
                }
                if (!color) {
                    const existingGroup = groupMap.get(targetGroupId) || groupMap.get(groupName);
                    if (existingGroup && existingGroup.color) {
                        color = existingGroup.color;
                    }
                }
                if (!color) {
                    const formatColor = (this.formattingSettings as any)?.dataPointCard?.fill?.value?.value
                        || (this.formattingSettings as any)?.dataPointCard?.defaultColor?.value?.value;
                    if (formatColor) {
                        color = normalizeColor(formatColor, '', this.colorPalette);
                    }
                }
                if (!color) {
                    color = themeDefaultColor;
                }

                uniqueColors.add(color);

                const isPoint = !isOngoing && (!endDate || (endDate.getTime() === startDate.getTime()));

                // SelectionId
                let selectionId: ISelectionId | undefined;
                try {
                    selectionId = this.host.createSelectionIdBuilder()
                        .withTable(table, originalIndex)
                        .createSelectionId();
                } catch (e) {
                    // Ignore selectionId errors
                }

                const dateString = formatEventDate(startDate, isPoint ? undefined : endDate, isOngoing);

                const eventLabel = eventType || (content ? content.split('\n')[0] : '') || groupName || "Event";
                const eventHeader = eventType || eventLabel;

                const tooltipInfo: VisualTooltipDataItem[] = [
                    {
                        header: sanitizeHtmlToText(eventHeader),
                        displayName: '',
                        value: dateString,
                        color: color,
                        opacity: '0.88'
                    }
                ];

                const sanitizedTooltipContent = formatContentForTooltip(content);
                if (sanitizedTooltipContent) {
                    tooltipInfo.push({
                        displayName: '',
                        value: sanitizedTooltipContent,
                        color: color,
                        opacity: '0.88'
                    });
                }

                const flagInfo = extractFlagClass(additionalClass, this.colorPalette);
                const sashInfo = extractSashClass(additionalClass, this.colorPalette);
                const sashFlagVars = getItemSashFlagVars(additionalClass, this.colorPalette);
                const extraClasses = [
                    flagInfo ? `has-flag ${flagInfo.className}` : '',
                    sashInfo ? `has-sash ${sashInfo.className}` : ''
                ].filter(Boolean).join(' ');

                const combinedClasses = [additionalClass, extraClasses].filter(Boolean).join(' ').trim();
                const baseClass = isPoint ? combinedClasses : `timeline-bar ${combinedClasses}`.trim();
                let itemStyle = isPoint
                    ? `${sashFlagVars}--item-color: ${color}; --item-border-color: #555555; background: transparent; border: none; box-shadow: none; opacity: 1.0;`
                    : `${sashFlagVars}--item-color: ${color}; --item-border-color: #555555; color: #ffffff; background-color: ${color}; border: 1px solid #555555; border-color: #555555; opacity: 1.0;`;
                let itemClassName = isOngoing ? `${baseClass} is-ongoing`.trim() : baseClass;
                let isItemSelected = false;

                if (hasCrossHighlight) {
                    let isSelected = false;
                    if (this.currentSelectedItemIds.has(originalIndex)) {
                        isSelected = true;
                    }
                    if (!isSelected && hasExtHighlights) {
                        isSelected = isRowExternallyHighlighted(originalIndex, tableHighlights, columns, categoricalValues);
                    }

                    if (!isSelected && selectionId) {
                        const selKey = typeof (selectionId as any).getKey === 'function' ? (selectionId as any).getKey() : null;
                        if (selKey && this.currentSelectedKeys.has(selKey)) {
                            isSelected = true;
                        } else if (selectedIds.length > 0) {
                            isSelected = selectedIds.some((selectedId: any) => {
                                if (!selectedId) return false;
                                if (typeof selectedId.equals === 'function' && selectedId.equals(selectionId)) {
                                    return true;
                                }
                                if (typeof selectedId.includes === 'function' && selectedId.includes(selectionId)) {
                                    return true;
                                }
                                if (selKey && typeof selectedId.getKey === 'function' && selectedId.getKey() === selKey) {
                                    return true;
                                }
                                try {
                                    return JSON.stringify(selectedId) === JSON.stringify(selectionId);
                                } catch {
                                    return false;
                                }
                            });
                        }
                    }

                    isItemSelected = isSelected;
                }

                const itemLabel = eventType || (content ? content.split('\n')[0] : '') || ' ';
                const item: any = {
                    id: originalIndex,
                    group: targetGroupId,
                    originalGroup: targetGroupId,
                    parentGroup: groupName,
                    subgroupName: subgroupName || undefined,
                    content: '',
                    originalContent: content || eventType || itemLabel,
                    contentValue: content,
                    contentValues: contentValues,
                    contentWithNames: contentWithNames,
                    contentWithoutNames: contentWithoutNames,
                    dateString: dateString,
                    eventType: eventType,
                    description: content,
                    start: startDate,
                    end: isPoint ? undefined : endDate,
                    type: isPoint ? 'point' : 'range',
                    originalType: isPoint ? 'point' : 'range',
                    style: itemStyle,
                    isPoint: isPoint,
                    isOngoing: isOngoing,
                    isSelected: isItemSelected,
                    title: '',
                    className: itemClassName,
                    originalClass: isOngoing ? `${combinedClasses} is-ongoing`.trim() : (combinedClasses || ''),
                    eventClass: sanitizedEventClass || null,
                    selectionId: selectionId,
                    tooltipInfo: tooltipInfo,
                    color: color
                };

                newItems.push(item);
            });

            // If cross-highlighting or selection is active, determine the most recent selected item
            const highlightedItems = hasCrossHighlight
                ? newItems.filter((it: any) => it.type !== 'background' && it.isSelected)
                : [];
            const mostRecentSelectedId = hasCrossHighlight ? findMostRecentItemId(highlightedItems) : null;
            const isMultiSelect = highlightedItems.length > 1;
            if (hasCrossHighlight) {
                this.mostRecentSelectedId = mostRecentSelectedId;
            }

            if (hasCrossHighlight) {
                newItems.forEach((item: any) => {
                    if (item.type === 'background') return;
                    const { className, style } = this.computeItemStyleAndClass(
                        item,
                        item.isSelected,
                        hasCrossHighlight,
                        isMultiSelect,
                        mostRecentSelectedId
                    );
                    item.className = className;
                    item.style = style;
                });
            }

            // If no valid data items were parsed
            const dataItemCount = newItems.filter((it: any) => it.type !== 'background').length;
            if (dataItemCount === 0) {
                this.showStatus(
                    "No Valid Timeline Dates",
                    "Received data rows, but could not parse valid dates from the 'Start Date' field. If using Power BI Date Hierarchy, please right-click the field in the visual well and select the raw column name instead.",
                    `Total rows: ${rows.length}\nDate parse failures: ${dateParseErrors}\nSample Start Date value: ${JSON.stringify(sampleRawDate)} (${typeof sampleRawDate})`
                );
                if (this.events) { this.events.renderingFinished(options); }
                return;
            }

            // Hide status when data is valid
            this.hideStatus();

            // Determine active Power BI sort
            const metaCols = options.dataViews?.[0]?.metadata?.columns || [];
            const activeSort = getActiveSortInfo(columns, colMap) || getActiveSortInfo(metaCols, colMap);

            // Sort groups
            sortGroups(newGroups, hasGroupOrderField, activeSort, groupDateStatsMap);

            const collapseSubgroupsOnLoad = (this.formattingSettings as any)?.miscellaneousCard?.collapseSubgroupsOnLoad?.value
                ?? (this.formattingSettings as any)?.groupOrderCard?.collapseSubgroupsOnLoad?.value
                ?? (options.dataViews[0]?.metadata?.objects as any)?.miscellaneous?.collapseSubgroupsOnLoad
                ?? (options.dataViews[0]?.metadata?.objects as any)?.groupOrderCard?.collapseSubgroupsOnLoad
                ?? true;
            const collapseSettingChanged = this.previousCollapseSubgroupsOnLoad !== undefined && this.previousCollapseSubgroupsOnLoad !== collapseSubgroupsOnLoad;
            this.previousCollapseSubgroupsOnLoad = collapseSubgroupsOnLoad;

            // Preserve showNested state and set visibility of child groups
            newGroups.forEach((group: any) => {
                if (group.nestedGroups && group.nestedGroups.length > 0) {
                    if (collapseSettingChanged) {
                        group.showNested = !collapseSubgroupsOnLoad;
                    } else if (this.groups) {
                        const existing = this.groups.get(group.id) as any;
                        if (existing && existing.showNested !== undefined) {
                            group.showNested = existing.showNested;
                        } else {
                            group.showNested = !collapseSubgroupsOnLoad;
                        }
                    } else {
                        group.showNested = !collapseSubgroupsOnLoad;
                    }

                    const isCollapsed = group.showNested === false;
                    const childSet = new Set(group.nestedGroups.map((id: any) => String(id)));
                    newGroups.forEach((g: any) => {
                        if (childSet.has(String(g.id))) {
                            g.visible = !isCollapsed;
                        }
                    });
                } else {
                    delete group.nestedGroups;
                    delete group.showNested;
                }
            });

            // When a group is collapsed, all of the markers from its subgroups should show in the group row
            const collapsedParentIds = new Set<string>();
            newGroups.forEach((g: any) => {
                if (g.showNested === false) {
                    collapsedParentIds.add(String(g.id));
                }
            });

            newItems.forEach((item: any) => {
                if (item.parentGroup && collapsedParentIds.has(String(item.parentGroup))) {
                    item.group = item.parentGroup;
                }
                delete item.subgroup;
            });

            // Mini groups: normal, highlighted, and dimmed variants for each unique color
            const newMiniGroups: any[] = [];
            uniqueColors.forEach(c => {
                const dimmedColors = getDeselectedMarkerColors(c, this.colorPalette);
                newMiniGroups.push({
                    id: c,
                    style: `stroke: ${c}; fill: ${c}; stroke-width: 1px; fill-opacity: 0.8;`
                });
                newMiniGroups.push({
                    id: `${c}_highlighted`,
                    style: `stroke: #0078d4; fill: ${c}; stroke-width: 2.5px; fill-opacity: 1.0;`
                });
                newMiniGroups.push({
                    id: `${c}_dimmed`,
                    style: `stroke: ${dimmedColors.border}; fill: ${dimmedColors.fill}; stroke-width: 0.75px; opacity: 0.55; fill-opacity: 0.55; stroke-opacity: 0.6;`
                });
            });

            const miniitems: any[] = [];
            newItems.forEach((itemData: any) => {
                if (itemData.type !== "background") {
                    const baseColor = itemData.color || '#3677a8';
                    const miniGroup = hasCrossHighlight
                        ? (itemData.isSelected ? `${baseColor}_highlighted` : `${baseColor}_dimmed`)
                        : baseColor;
                    miniitems.push({
                        id: itemData.id,
                        x: new Date(itemData.start),
                        y: 1,
                        group: miniGroup
                    });
                }
            });

            // Calculate Date Ranges
            let minDate: Date | null = null;
            let maxDate: Date | null = null;

            newItems.forEach((item: any) => {
                if (item.type === 'background') return;
                const start = item.start as Date;
                const end = (item.end as Date) || start;

                if (!minDate || start < minDate) minDate = start;
                if (!maxDate || end > maxDate) maxDate = end;
            });

            if (minDate && maxDate) {
                const spanMs = Math.max(0, maxDate.getTime() - minDate.getTime());
                this.lastDataSpanMs = spanMs;
                // Margin of at least 1 hour (or 5% of dataset span) so boundary markers aren't clipped
                const paddingMs = Math.max(spanMs * 0.05, 1000 * 60 * 60 * 1);
                const bufferMs = Math.max(spanMs * 0.05, 1000 * 60 * 60 * 1);

                const minBuffer = new Date(minDate.getTime() - bufferMs);
                const maxBuffer = new Date(maxDate.getTime() + bufferMs);

                newItems.push({ id: 'limitMin', start: minBuffer, end: minDate, type: 'background', title: 'No more data!', className: 'limiter showMore', content: '' });
                newItems.push({ id: 'limitMax', start: maxDate, end: maxBuffer, type: 'background', title: 'No more data!', className: 'limiter', content: '' });

                // Preserve vertical scroll position and view window before groups/items are cleared
                let preservedScrollTop: number = isFilterChangeOrReload ? 0 : this.currentMainTimelineScrollTop;
                if (!isFilterChangeOrReload) {
                    const leftPanelBefore = this.mainTimelineContainer ? this.mainTimelineContainer.querySelector('.vis-panel.vis-left') as HTMLElement | null : null;
                    if (leftPanelBefore && leftPanelBefore.scrollTop > 0) {
                        preservedScrollTop = Math.max(preservedScrollTop, leftPanelBefore.scrollTop);
                        this.currentMainTimelineScrollTop = preservedScrollTop;
                    }
                    if (this.mainTimeline && (this.mainTimeline as any).props && typeof (this.mainTimeline as any).props.scrollTop === 'number' && (this.mainTimeline as any).props.scrollTop < 0) {
                        const st = -(this.mainTimeline as any).props.scrollTop;
                        if (st > 0) {
                            preservedScrollTop = Math.max(preservedScrollTop, st);
                            this.currentMainTimelineScrollTop = preservedScrollTop;
                        }
                    }
                } else {
                    this.currentMainTimelineScrollTop = 0;
                }

                let preservedWindow: { start: Date; end: Date } | null = null;
                if (this.mainTimeline && !isFilterChangeOrReload) {
                    try {
                        const currWin = this.mainTimeline.getWindow();
                        if (currWin && currWin.start && currWin.end) {
                            const ws = new Date(currWin.start).getTime();
                            const we = new Date(currWin.end).getTime();
                            if (!isNaN(ws) && !isNaN(we) && we > ws) {
                                preservedWindow = { start: new Date(ws), end: new Date(we) };
                            }
                        }
                    } catch {}
                }

                this.updateDataSetCollections(newGroups, newItems, newMiniGroups, miniitems, hasGroupOrderField);

                // Initial view window: full data range with margins, or preserved window if already viewing
                const winStart = new Date(minDate.getTime() - paddingMs);
                const winEnd = new Date(maxDate.getTime() + paddingMs);
                const activeWinStart = preservedWindow ? preservedWindow.start : winStart;
                const activeWinEnd = preservedWindow ? preservedWindow.end : winEnd;

                const effectiveZoomMin = (spanMs <= 1000 * 60 * 60 * 24)
                    ? Math.min(this.currentZoomMinMs, 1000 * 60 * 60 * 1)
                    : this.currentZoomMinMs;

                if (!this.mainTimeline) {
                    this.ensureTimelinesInitialized(winStart, winEnd, minBuffer, maxBuffer);
                } else {
                    // Set options first so setWindow is not clamped by old window limits
                    this.mainTimeline.setData({ groups: this.groups, items: this.items });
                    this.mainTimeline.setOptions({ min: minBuffer, max: maxBuffer, zoomMin: effectiveZoomMin });
                    this.miniTimeline?.setOptions({ min: minBuffer, max: maxBuffer });
                    this.mainTimeline.setWindow(activeWinStart, activeWinEnd, { animation: false });
                }

                if (this.miniTimeline) {
                    this.miniTimeline.setWindow(minBuffer, maxBuffer, { animation: false });
                    try {
                        this.miniTimeline.setCustomTime(activeWinStart, 'selectStartTime');
                    } catch {
                        try { this.miniTimeline.addCustomTime(activeWinStart, 'selectStartTime'); } catch {}
                    }
                    try {
                        this.miniTimeline.setCustomTime(activeWinEnd, 'selectEndTime');
                    } catch {
                        try { this.miniTimeline.addCustomTime(activeWinEnd, 'selectEndTime'); } catch {}
                    }
                    this.setMiniShades(activeWinStart, activeWinEnd);
                }

                if (this.mainTimeline) {
                    this.mainTimeline.setWindow(activeWinStart, activeWinEnd, { animation: false });
                    this.mainTimeline.redraw();
                    this.doCheckItemWidths();

                    // Restore vertical scroll position
                    if (preservedScrollTop > 0) {
                        const restoreScroll = () => {
                            try {
                                if (this.mainTimeline) {
                                    const left = this.mainTimelineContainer ? this.mainTimelineContainer.querySelector('.vis-panel.vis-left') as HTMLElement | null : null;
                                    if (left) {
                                        left.scrollTop = preservedScrollTop;
                                    }
                                    const center = this.mainTimelineContainer ? this.mainTimelineContainer.querySelector('.vis-panel.vis-center .vis-content') as HTMLElement | null : null;
                                    if (center) {
                                        center.style.transform = `translateY(${-preservedScrollTop}px)`;
                                    }
                                    if ((this.mainTimeline as any).props) {
                                        (this.mainTimeline as any).props.scrollTop = -preservedScrollTop;
                                    }
                                    if (typeof (this.mainTimeline as any)._setScrollTop === 'function') {
                                        (this.mainTimeline as any)._setScrollTop(-preservedScrollTop);
                                    }
                                    (this.mainTimeline as any)._redraw();
                                }
                            } catch {}
                        };
                        restoreScroll();
                        requestAnimationFrame(restoreScroll);
                        setTimeout(restoreScroll, 20);
                        setTimeout(restoreScroll, 60);
                        setTimeout(restoreScroll, 120);
                        setTimeout(() => {
                            restoreScroll();
                            this.isInternalDataUpdate = false;
                        }, 200);
                    } else {
                        this.isInternalDataUpdate = false;
                    }

                    // Restore visual selection in vis-timeline if there are cross-highlighted items, or clear selection
                    const selectedItemIds = hasCrossHighlight
                        ? newItems.filter(it => it.isSelected || (it.className && it.className.includes('cross-highlight-selected'))).map(it => it.id)
                        : [];
                    try {
                        (this.mainTimeline as any).setSelection(selectedItemIds, { focus: false, animation: false });
                    } catch {}

                    if (!hasCrossHighlight && this.mainTimelineContainer) {
                        const elSelected = this.mainTimelineContainer.querySelectorAll('.cross-highlight-selected, .vis-selected');
                        elSelected.forEach(el => {
                            el.classList.remove('cross-highlight-selected');
                            el.classList.remove('vis-selected');
                        });
                        const elDimmed = this.mainTimelineContainer.querySelectorAll('.cross-highlight-dimmed');
                        elDimmed.forEach(el => el.classList.remove('cross-highlight-dimmed'));
                    }

                    try {
                        newGroups.forEach((g: any) => {
                            if (g.nestedGroups && g.nestedGroups.length > 0) {
                                const itemSetGroup = (this.mainTimeline as any)?.itemSet?.groups?.[g.id];
                                const label = itemSetGroup?.dom?.label;
                                if (label) {
                                    if (g.showNested !== false) {
                                        label.classList.remove('collapsed');
                                        label.classList.add('expanded');
                                    } else {
                                        label.classList.remove('expanded');
                                        label.classList.add('collapsed');
                                    }
                                }
                            }
                        });
                    } catch {}
                }
            } else {
                this.updateDataSetCollections(newGroups, newItems, newMiniGroups, miniitems, hasGroupOrderField);
                this.isInternalDataUpdate = false;
            }

            if (showMiniTimeline) {
                this.updateMiniTimelineTimeAxis();
                this.updateMiniTimelineLayout();
                setTimeout(() => this.updateMiniTimelineLayout(), 60);
            }
            if (this.searchTerm) {
                this.performTextSearch(this.searchTerm);
            } else {
                this.renderDetailsPanel();
            }
            if (isFilterChangeOrReload) {
                this.showEntireTimeline();
            }
        } catch (err: any) {
            console.error("renderTimelineData error:", err);
            throw err;
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        if (!this.formattingSettings) {
            this.formattingSettings = new VisualFormattingSettingsModel();
        }
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        this.currentUpdateId++;
        this.stopTimeTracking();
        if (this.globalListeners) {
            window.removeEventListener('pointerup', this.globalListeners.handleGlobalUp, true);
            window.removeEventListener('mouseup', this.globalListeners.handleGlobalUp, true);
            document.removeEventListener('pointerup', this.globalListeners.handleGlobalUp, true);
            document.removeEventListener('mouseup', this.globalListeners.handleGlobalUp, true);
            window.removeEventListener('pointermove', this.globalListeners.handleCheckButtons, true);
            window.removeEventListener('mousemove', this.globalListeners.handleCheckButtons, true);
            window.removeEventListener('blur', this.globalListeners.handleBlur, false);
            this.globalListeners = null;
        }
        if (this.mainTimeline) {
            try { (this.mainTimeline as any).destroy(); } catch {}
            this.mainTimeline = null;
        }
        if (this.miniTimeline) {
            try { (this.miniTimeline as any).destroy(); } catch {}
            this.miniTimeline = null;
            if (this.miniTimelineManager) {
                this.miniTimelineManager.miniTimeline = null;
            }
        }
    }
}
