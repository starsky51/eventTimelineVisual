/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import { HighContrastSettings } from "../types";
import { normalizeColor, extractFlagClass, extractSashClass, getRgbFromColor } from "../utils/colorUtils";
import { formatEventDate } from "../utils/dateUtils";
import { renderHtmlContent, highlightSearchTermInElement } from "../utils/domUtils";
import { getItemContent } from "../styling/markerStyling";

export interface DetailsPanelRenderContext {
    items: any[];
    isItemMatchingSelection: (item: any) => boolean;
    searchMatchedItemIds: Set<any>;
    searchTerm: string;
    mostRecentSelectedId: any;
    expandedItemIds: Set<any>;
    formattingSettings: any;
    getHighContrastSettings: () => HighContrastSettings;
    getLocalizedString: (key: string, fallback: string) => string;
    getShowFieldNames: () => boolean;
    setMarkerHoverGlow: (itemId: any, enable: boolean) => void;
    clearAllMarkerHoverGlow: () => void;
    openExternalUrl: (url: string) => void;
    allowInteractions: boolean;
}

export class DetailsPanelManager {
    public detailsPanel: HTMLElement;
    public detailsPanelResizer: HTMLElement;
    public detailsPanelHeader: HTMLElement;
    public detailsHeaderCount: HTMLElement;
    public detailsPanelBody: HTMLElement;
    public detailsPanelWidth: number | null = null;

    private container: HTMLElement;
    private contentContainer: HTMLElement;

    constructor(
        container: HTMLElement,
        contentContainer: HTMLElement,
        getLocalizedString: (key: string, fallback: string) => string,
        onOpenExternalUrl: (url: string) => void,
        onClearGlow: () => void,
        onResized: () => void,
        allowInteractionsGetter: () => boolean
    ) {
        this.container = container;
        this.contentContainer = contentContainer;

        // Resizer between Timeline Area and Details Panel
        this.detailsPanelResizer = document.createElement("div");
        this.detailsPanelResizer.className = "details-resizer";
        this.detailsPanelResizer.title = "Drag to resize";
        this.contentContainer.appendChild(this.detailsPanelResizer);

        // Details Panel (Right of Timelines)
        this.detailsPanel = document.createElement("div");
        this.detailsPanel.className = "visual-details-panel";

        this.detailsPanelHeader = document.createElement("div");
        this.detailsPanelHeader.className = "details-panel-header";

        const headerTitle = document.createElement("span");
        headerTitle.className = "details-header-title";
        headerTitle.textContent = getLocalizedString("detailsPanel_header", "Event Details");
        this.detailsPanelHeader.appendChild(headerTitle);

        this.detailsHeaderCount = document.createElement("span");
        this.detailsHeaderCount.className = "details-header-count";
        const initialCountTemplate = getLocalizedString("detailsPanel_noEventsSelected",
            getLocalizedString("detailsPanel_eventsSelected", "0 events selected")
        );
        this.detailsHeaderCount.textContent = initialCountTemplate.includes("{0}")
            ? initialCountTemplate.replace("{0}", "0")
            : initialCountTemplate;
        this.detailsPanelHeader.appendChild(this.detailsHeaderCount);

        this.detailsPanel.appendChild(this.detailsPanelHeader);

        this.detailsPanelBody = document.createElement("div");
        this.detailsPanelBody.className = "details-panel-body";
        this.detailsPanel.appendChild(this.detailsPanelBody);

        this.contentContainer.appendChild(this.detailsPanel);

        this.detailsPanel.addEventListener("mousedown", (e) => {
            e.stopPropagation();
        });
        this.detailsPanel.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
        });
        this.detailsPanel.addEventListener("mouseleave", () => {
            onClearGlow();
        });

        const handleDelegatedAnchorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target ? (target.closest('a') as HTMLAnchorElement | null) : null;
            if (anchor && this.detailsPanel.contains(anchor)) {
                e.preventDefault();
                e.stopPropagation();
                const url = anchor.getAttribute('href') || anchor.href;
                if (url) {
                    onOpenExternalUrl(url);
                }
            }
        };
        this.detailsPanel.addEventListener("click", handleDelegatedAnchorClick);
        this.detailsPanel.addEventListener("auxclick", handleDelegatedAnchorClick);

        // Resize handling for Details Panel
        let isResizingDetails = false;
        let startResizeX = 0;
        let startResizeWidth = 0;

        this.detailsPanelResizer.addEventListener("pointerdown", (event: PointerEvent) => {
            if (allowInteractionsGetter() === false) return;
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();

            isResizingDetails = true;
            startResizeX = event.clientX;
            startResizeWidth = this.detailsPanel.getBoundingClientRect().width;
            this.detailsPanelResizer.classList.add("dragging");
            try {
                this.container.style.cursor = "col-resize";
                this.container.style.userSelect = "none";
            } catch {}

            try {
                this.detailsPanelResizer.setPointerCapture(event.pointerId);
            } catch {}
        });

        const onDetailsResizerMove = (event: PointerEvent) => {
            if (!isResizingDetails) return;
            const deltaX = startResizeX - event.clientX;
            const containerRect = this.contentContainer.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const minWidth = 160;
            const maxWidth = Math.max(minWidth, containerWidth - 150);
            const newWidth = Math.min(Math.max(minWidth, Math.round(startResizeWidth + deltaX)), maxWidth);

            this.detailsPanelWidth = newWidth;
            this.detailsPanel.style.width = `${newWidth}px`;

            onResized();
        };

        const onDetailsResizerUp = (event: PointerEvent) => {
            if (!isResizingDetails) return;
            isResizingDetails = false;
            this.detailsPanelResizer.classList.remove("dragging");
            try {
                this.container.style.cursor = "";
                this.container.style.userSelect = "";
            } catch {}

            try {
                this.detailsPanelResizer.releasePointerCapture(event.pointerId);
            } catch {}

            onResized();
        };

        this.detailsPanelResizer.addEventListener("pointermove", onDetailsResizerMove);
        this.detailsPanelResizer.addEventListener("pointerup", onDetailsResizerUp);
        this.detailsPanelResizer.addEventListener("pointercancel", onDetailsResizerUp);
        window.addEventListener("pointerup", (e) => { if (isResizingDetails) onDetailsResizerUp(e); });
        window.addEventListener("pointercancel", (e) => { if (isResizingDetails) onDetailsResizerUp(e); });
    }

    public resetDetailsPanelScroll(): void {
        if (this.detailsPanelBody) {
            this.detailsPanelBody.scrollTop = 0;
        }
        if (this.detailsPanel) {
            this.detailsPanel.scrollTop = 0;
        }
    }

    public renderDetailsEmptyState(emptyMessage: string, searchTerm?: string): HTMLElement {
        const emptyContainer = document.createElement("div");
        emptyContainer.className = "details-empty-state";

        const iconContainer = document.createElement("div");
        iconContainer.className = "details-empty-icon";
        const svgNS = "http://www.w3.org/2000/svg";
        const iconSvg = document.createElementNS(svgNS, "svg");
        iconSvg.setAttribute("width", "36");
        iconSvg.setAttribute("height", "36");
        iconSvg.setAttribute("viewBox", "0 0 24 24");
        iconSvg.setAttribute("fill", "none");
        iconSvg.setAttribute("stroke", "#a19f9d");
        iconSvg.setAttribute("stroke-width", "1.5");
        iconSvg.setAttribute("stroke-linecap", "round");
        iconSvg.setAttribute("stroke-linejoin", "round");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M15 15l6 6m-11-4v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4");
        iconSvg.appendChild(path);
        iconContainer.appendChild(iconSvg);
        emptyContainer.appendChild(iconContainer);

        const msgEl = document.createElement("div");
        msgEl.className = "details-empty-message";
        if (searchTerm && searchTerm.trim().length > 0) {
            msgEl.textContent = `No results found for "${searchTerm.trim()}"`;
        } else {
            msgEl.textContent = emptyMessage;
        }
        emptyContainer.appendChild(msgEl);
        return emptyContainer;
    }

    public renderDetailsItemCard(
        item: any,
        selectedIdSet: Set<any>,
        isMultiSelect: boolean,
        count: number,
        hc: HighContrastSettings,
        ctx: DetailsPanelRenderContext
    ): HTMLElement {
        const card = document.createElement("div");
        card.className = "details-item-card";

        const rawEventClass = (item.eventClass || item.originalClass || '').trim();
        const eventClasses = rawEventClass ? rawEventClass.split(/\s+/).filter(Boolean) : [];
        const flagInfo = extractFlagClass(rawEventClass);
        const sashInfo = extractSashClass(rawEventClass);
        eventClasses.forEach((cls: string) => {
            card.classList.add(cls);
        });
        if (flagInfo) {
            card.style.setProperty('--flag-color', flagInfo.color);
        }
        if (sashInfo) {
            card.style.setProperty('--sash-color', sashInfo.color);
        }

        card.addEventListener("mouseenter", () => {
            ctx.setMarkerHoverGlow(item.id, true);
        });
        card.addEventListener("mouseleave", () => {
            ctx.setMarkerHoverGlow(item.id, false);
        });

        const isItemSearchMatch = ctx.searchMatchedItemIds.has(item.id);
        const isItemSelected = selectedIdSet.has(item.id);
        const isDashed = isMultiSelect && isItemSelected && item.id !== ctx.mostRecentSelectedId;

        if (isItemSearchMatch) {
            card.classList.add("search-matched");
        }
        if (isItemSelected) {
            card.classList.add("is-selected");
        }

        if (hc.isHighContrast) {
            const borderColor = isItemSearchMatch ? (hc.foregroundSelected || "#ffd700") : (hc.foregroundSelected || hc.foreground || "#ffffff");
            card.style.border = (isItemSelected && isDashed) ? `2px dashed ${borderColor}` : `2px solid ${borderColor}`;
            if (hc.background) card.style.backgroundColor = hc.background;
            if (hc.foreground) card.style.color = hc.foreground;
        } else {
            const borderColor = isItemSearchMatch ? "#f59e0b" : (flagInfo ? flagInfo.color : "#0078d4");
            const borderWidth = flagInfo && !isItemSearchMatch ? "2.5px" : "2px";
            const borderStyle = (isItemSelected && isDashed) ? "dashed" : "solid";
            card.style.border = `${borderWidth} ${borderStyle} ${borderColor}`;
            if (isItemSelected) {
                card.style.boxShadow = "0 0 0 2px #0078d4, 0 3px 10px rgba(0, 120, 212, 0.35)";
            } else if (isItemSearchMatch) {
                card.style.boxShadow = "0 2px 8px rgba(245, 158, 11, 0.28)";
            } else {
                card.style.boxShadow = "none";
            }
        }

        // 1. Event Type Header with faded marker background
        const eventTypeEl = document.createElement("div");
        eventTypeEl.className = "details-item-event-type";
        eventClasses.forEach((cls: string) => {
            eventTypeEl.classList.add(cls);
        });
        const eventTypeText = item.eventType || item.group || "Event";

        const titleSpan = document.createElement("span");
        titleSpan.className = "details-item-title-text";
        titleSpan.textContent = eventTypeText;
        if (isItemSearchMatch && ctx.searchTerm && ctx.searchTerm.trim().length > 0) {
            highlightSearchTermInElement(titleSpan, ctx.searchTerm);
        }
        eventTypeEl.appendChild(titleSpan);

        if (isItemSearchMatch || isItemSelected) {
            const badgesContainer = document.createElement("div");
            badgesContainer.className = "details-header-badges";

            if (isItemSearchMatch) {
                const searchBadge = document.createElement("span");
                searchBadge.className = "details-badge-search";
                searchBadge.textContent = "🔍";
                searchBadge.title = "Search Result";
                searchBadge.setAttribute("aria-label", "Search Result");
                badgesContainer.appendChild(searchBadge);
            }

            eventTypeEl.appendChild(badgesContainer);
        }

        const markerColor = normalizeColor(item.color, "#3677a8");
        const rgb = getRgbFromColor(markerColor);

        if (hc.isHighContrast) {
            eventTypeEl.style.backgroundColor = "transparent";
            eventTypeEl.style.borderBottom = `1px solid ${hc.foreground || "#ffffff"}`;
            if (eventClasses.length > 0) {
                eventTypeEl.style.borderLeft = `4px solid ${hc.foreground || "#ffffff"}`;
            }
            if (hc.foreground) eventTypeEl.style.color = hc.foreground;
        } else {
            eventTypeEl.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;
            eventTypeEl.style.borderBottom = `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`;
            eventTypeEl.style.borderLeft = `4px solid ${flagInfo ? flagInfo.color : markerColor}`;
        }

        card.appendChild(eventTypeEl);

        // Add sash overlay if sash class present
        if (sashInfo) {
            const sashOverlay = document.createElement("div");
            sashOverlay.className = "details-sash-overlay";
            sashOverlay.style.setProperty('--sash-color', sashInfo.color);
            card.appendChild(sashOverlay);
        }

        // 2. Date subheader
        const dateStr = formatEventDate(item.start, item.end) || item.dateString || '';
        if (dateStr) {
            const dateEl = document.createElement("div");
            dateEl.className = "details-item-date";
            dateEl.textContent = dateStr;
            if (isItemSearchMatch && ctx.searchTerm && ctx.searchTerm.trim().length > 0) {
                highlightSearchTermInElement(dateEl, ctx.searchTerm);
            }
            card.appendChild(dateEl);
        }

        // 3. Content below date
        const showFieldNames = ctx.getShowFieldNames();
        const contentText = getItemContent(item, showFieldNames);
        if (contentText) {
            const contentContainer = document.createElement("div");
            contentContainer.className = "details-item-content-container";

            const contentEl = document.createElement("div");
            contentEl.className = "details-item-content";
            renderHtmlContent(contentEl, contentText, ctx.openExternalUrl);
            if (isItemSearchMatch && ctx.searchTerm && ctx.searchTerm.trim().length > 0) {
                highlightSearchTermInElement(contentEl, ctx.searchTerm);
            }

            const isExpanded = ctx.expandedItemIds.has(item.id);
            const lines = contentText.split('\n');
            const isLongText = lines.length > 10 || contentText.length > 400;

            if (isLongText && count > 1 && !isExpanded) {
                contentEl.classList.add("content-clamped-10");
                contentContainer.appendChild(contentEl);

                const toggleLink = document.createElement("button");
                toggleLink.type = "button";
                toggleLink.className = "details-see-more-link";
                toggleLink.style.fontFamily = "var(--detailsFontFamily, inherit)";
                toggleLink.style.fontSize = "var(--detailsFontSize, 12pt)";
                toggleLink.textContent = ctx.getLocalizedString("detailsPanel_seeMore", "see more...");
                if (hc.isHighContrast && hc.hyperlink) {
                    toggleLink.style.color = hc.hyperlink;
                }
                toggleLink.addEventListener("click", (e: MouseEvent) => {
                    if (ctx.allowInteractions === false) return;
                    e.preventDefault();
                    e.stopPropagation();
                    ctx.expandedItemIds.add(item.id);
                    contentEl.classList.remove("content-clamped-10");
                    toggleLink.remove();
                });
                contentContainer.appendChild(toggleLink);
            } else {
                contentContainer.appendChild(contentEl);
            }

            card.appendChild(contentContainer);
        }

        return card;
    }

    public renderDetailsPanel(ctx: DetailsPanelRenderContext, resetScroll: boolean = false): void {
        ctx.clearAllMarkerHoverGlow();
        if (!this.detailsPanel || !this.detailsPanelBody) return;

        const showDetailsPanel = ctx.formattingSettings?.detailsPanelCard?.show?.value ?? true;
        const emptyMessage = ctx.formattingSettings?.detailsPanelCard?.emptyMessage?.value
            || ctx.getLocalizedString("detailsPanel_emptyMessage", "Click a marker to view details");

        if (!showDetailsPanel) {
            this.detailsPanel.style.display = "none";
            if (this.detailsPanelResizer) {
                this.detailsPanelResizer.style.display = "none";
            }
            return;
        } else {
            this.detailsPanel.style.display = "flex";
            if (this.detailsPanelResizer) {
                this.detailsPanelResizer.style.display = "block";
            }
        }

        if (this.detailsPanelWidth != null) {
            this.detailsPanel.style.width = `${this.detailsPanelWidth}px`;
        }

        if (resetScroll) {
            this.resetDetailsPanelScroll();
        }

        const itemsToDisplay: any[] = [];
        const selectedIdSet = new Set<any>();

        if (ctx.items) {
            ctx.items.forEach((item: any) => {
                if (item.type === 'background') return;
                const isSelected = ctx.isItemMatchingSelection(item);
                if (isSelected) {
                    selectedIdSet.add(item.id);
                }
                const isSearchMatch = ctx.searchMatchedItemIds.has(item.id);
                if (isSelected || isSearchMatch) {
                    itemsToDisplay.push(item);
                }
            });
        }

        // Sort items: selected items first, then descending date order (latest date first)
        itemsToDisplay.sort((a, b) => {
            const aSelected = selectedIdSet.has(a.id);
            const bSelected = selectedIdSet.has(b.id);
            if (aSelected !== bSelected) {
                return aSelected ? -1 : 1;
            }
            const timeA = a.start ? new Date(a.start).getTime() : 0;
            const timeB = b.start ? new Date(b.start).getTime() : 0;
            if (timeB !== timeA) {
                return timeB - timeA;
            }
            const endA = a.end ? new Date(a.end).getTime() : timeA;
            const endB = b.end ? new Date(b.end).getTime() : timeB;
            if (endB !== endA) {
                return endB - endA;
            }
            return String(b.id).localeCompare(String(a.id));
        });

        const selectedCount = selectedIdSet.size;
        const searchCount = ctx.searchMatchedItemIds.size;
        const count = itemsToDisplay.length;

        if (selectedCount > 0 && searchCount > 0) {
            const selPart = selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;
            const searchPart = searchCount === 1 ? "1 search result" : `${searchCount} search results`;
            this.detailsHeaderCount.textContent = `${selPart} · ${searchPart}`;
        } else if (selectedCount > 0) {
            const template = selectedCount === 1
                ? ctx.getLocalizedString("detailsPanel_eventSelected", "1 event selected")
                : ctx.getLocalizedString("detailsPanel_eventsSelected", `${selectedCount} events selected`);
            this.detailsHeaderCount.textContent = template.includes("{0}") ? template.replace("{0}", String(selectedCount)) : template;
        } else if (searchCount > 0) {
            this.detailsHeaderCount.textContent = searchCount === 1 ? "1 search result" : `${searchCount} search results`;
        } else {
            const zeroCountTemplate = ctx.getLocalizedString("detailsPanel_noEventsSelected",
                ctx.getLocalizedString("detailsPanel_eventsSelected", "0 events selected")
            );
            this.detailsHeaderCount.textContent = zeroCountTemplate.includes("{0}")
                ? zeroCountTemplate.replace("{0}", "0")
                : zeroCountTemplate;
        }

        while (this.detailsPanelBody.firstChild) {
            this.detailsPanelBody.removeChild(this.detailsPanelBody.firstChild);
        }

        if (count === 0) {
            this.detailsPanelBody.appendChild(this.renderDetailsEmptyState(emptyMessage, ctx.searchTerm));
            if (resetScroll) {
                this.resetDetailsPanelScroll();
            }
            return;
        }

        const isMultiSelect = count > 1;
        const hc = ctx.getHighContrastSettings();

        itemsToDisplay.forEach((item: any) => {
            this.detailsPanelBody.appendChild(
                this.renderDetailsItemCard(item, selectedIdSet, isMultiSelect, count, hc, ctx)
            );
        });

        if (resetScroll) {
            this.resetDetailsPanelScroll();
            try {
                requestAnimationFrame(() => this.resetDetailsPanelScroll());
            } catch {}
        }
    }
}
