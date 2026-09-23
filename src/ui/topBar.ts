/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { FontSettings, OrderByOption, OrderDirectionOption } from "../types";
import { measureMaxTextWidth } from "../utils/domUtils";
import { formatDateAsDDMMMYYYY } from "../utils/dateUtils";

export interface TopBarUpdateOptions {
    currentGroup: string;
    distinctGroups: string[];
    fieldName?: string;
    isDateField?: boolean;
    visualInstanceId: string;
    allowInteractions: boolean;
    host: IVisualHost;
    currentOrderBy?: OrderByOption;
    currentOrderDirection?: OrderDirectionOption;
    showGroupOrder?: boolean;
    showSearch: boolean;
    searchTerm: string;
    hasSubgroups?: boolean;
    collapseTitle?: string;
    expandTitle?: string;
    getFontSettings: (cardName: string, objectName: string) => FontSettings;
    onGroupChange: (newGroup: string) => void;
    onOrderByChange?: (orderBy: OrderByOption) => void;
    onOrderDirectionChange?: (dir: OrderDirectionOption) => void;
    onSearchInput: (term: string) => void;
    onSearchSubmit: (term: string) => void;
    onSearchClear: () => void;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
}

export class TopBarManager {
    public topBar: HTMLElement;
    public searchInputEl: HTMLInputElement | null = null;
    public searchClearBtn: HTMLButtonElement | null = null;

    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.topBar = document.createElement("div");
        this.topBar.className = "visual-top-bar";
        this.topBar.style.display = "none";
        this.container.appendChild(this.topBar);
    }

    public renderTopBarGroupSelector(
        currentGroup: string,
        distinctGroups: string[],
        fieldName: string,
        visualInstanceId: string,
        allowInteractions: boolean,
        getFontSettings: (cardName: string, objectName: string) => FontSettings,
        onGroupChange: (newGroup: string) => void,
        isDateField: boolean = false
    ): HTMLElement | null {
        if (!distinctGroups || distinctGroups.length === 0) return null;

        const formatVal = (val: string) => (isDateField ? formatDateAsDDMMMYYYY(val) : val);
        const currentGroupDisplay = formatVal(currentGroup);

        const content = document.createElement("div");
        content.className = "top-bar-content";

        if (distinctGroups.length > 1) {
            const label = document.createElement("span");
            label.className = "top-bar-label";

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "12");
            svg.setAttribute("height", "12");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.style.verticalAlign = "-2px";
            svg.style.marginRight = "5px";
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3");
            svg.appendChild(poly);
            label.appendChild(svg);
            label.appendChild(document.createTextNode(`${fieldName}: `));
            content.appendChild(label);

            const selectEl = document.createElement("select");
            selectEl.className = "top-bar-select";
            selectEl.id = "top-bar-group-select-" + visualInstanceId;

            const { fontFamily: topBarFontFamilyRaw, fontSize: topBarFontSizeRaw } = getFontSettings("topBarCard", "topBar");
            const topBarFontFamily = topBarFontFamilyRaw || "Segoe UI, sans-serif";
            const topBarFontSizePt = topBarFontSizeRaw || 11;
            const displayGroups = isDateField ? distinctGroups.map(formatVal) : distinctGroups;
            const maxTopBarTextWidth = measureMaxTextWidth(
                displayGroups,
                `600 ${topBarFontSizePt}pt ${topBarFontFamily}`,
                topBarFontSizePt * 0.75 + 1
            );

            // Room for: text width + left padding (8px) + right padding & native dropdown arrow (26px) + borders (2px) + safety buffer (18px)
            const finalWidth = Math.max(160, Math.ceil(maxTopBarTextWidth + 54));
            selectEl.style.width = `${finalWidth}px`;
            selectEl.style.minWidth = `${finalWidth}px`;
            selectEl.style.maxWidth = "100%";
            selectEl.title = currentGroupDisplay || `${fieldName} selector`;

            distinctGroups.forEach(g => {
                const opt = document.createElement("option");
                const gDisplay = formatVal(g);
                opt.value = g;
                opt.textContent = gDisplay;
                opt.title = gDisplay;
                if (g === currentGroup) {
                    opt.selected = true;
                }
                selectEl.appendChild(opt);
            });

            selectEl.addEventListener("change", () => {
                if (allowInteractions === false) return;
                selectEl.title = selectEl.value;
                onGroupChange(selectEl.value);
            });

            content.appendChild(selectEl);
        } else {
            const label = document.createElement("span");
            label.className = "top-bar-label";
            label.textContent = `${fieldName}: `;
            content.appendChild(label);

            const val = document.createElement("span");
            val.className = "top-bar-value";
            val.textContent = currentGroupDisplay;
            content.appendChild(val);
        }

        return content;
    }

    public renderTopBarGroupOrderSection(
        currentOrderBy: OrderByOption,
        currentOrderDirection: OrderDirectionOption,
        allowInteractions: boolean,
        host: IVisualHost,
        onOrderByChange: (orderBy: OrderByOption) => void,
        onOrderDirectionChange: (dir: OrderDirectionOption) => void
    ): HTMLElement {
        const sortSection = document.createElement("div");
        sortSection.className = "top-bar-content top-bar-sort-section";

        const sortLabel = document.createElement("span");
        sortLabel.className = "top-bar-label";

        const sortSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        sortSvg.setAttribute("width", "12");
        sortSvg.setAttribute("height", "12");
        sortSvg.setAttribute("viewBox", "0 0 24 24");
        sortSvg.setAttribute("fill", "none");
        sortSvg.setAttribute("stroke", "currentColor");
        sortSvg.setAttribute("stroke-width", "2");
        sortSvg.setAttribute("stroke-linecap", "round");
        sortSvg.setAttribute("stroke-linejoin", "round");
        sortSvg.style.verticalAlign = "-2px";
        sortSvg.style.marginRight = "5px";

        const p1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        p1.setAttribute("x1", "4"); p1.setAttribute("y1", "6"); p1.setAttribute("x2", "20"); p1.setAttribute("y2", "6");
        sortSvg.appendChild(p1);

        const p2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        p2.setAttribute("x1", "4"); p2.setAttribute("y1", "12"); p2.setAttribute("x2", "14"); p2.setAttribute("y2", "12");
        sortSvg.appendChild(p2);

        const p3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        p3.setAttribute("x1", "4"); p3.setAttribute("y1", "18"); p3.setAttribute("x2", "8"); p3.setAttribute("y2", "18");
        sortSvg.appendChild(p3);

        sortLabel.appendChild(sortSvg);
        sortLabel.appendChild(document.createTextNode("Group Order: "));
        sortSection.appendChild(sortLabel);

        const sortSelect = document.createElement("select");
        sortSelect.className = "top-bar-select top-bar-sort-select";
        sortSelect.title = "Order groups by";

        const optGroupOrder = document.createElement("option");
        optGroupOrder.value = "groupOrder";
        optGroupOrder.textContent = "Group Order";
        optGroupOrder.selected = currentOrderBy === "groupOrder";
        sortSelect.appendChild(optGroupOrder);

        const optAlpha = document.createElement("option");
        optAlpha.value = "alphabetical";
        optAlpha.textContent = "Alphabetical";
        optAlpha.selected = currentOrderBy === "alphabetical";
        sortSelect.appendChild(optAlpha);

        const optRecent = document.createElement("option");
        optRecent.value = "mostRecentEvent";
        optRecent.textContent = "Most Recent Event";
        optRecent.selected = currentOrderBy === "mostRecentEvent";
        sortSelect.appendChild(optRecent);

        sortSection.appendChild(sortSelect);

        const dirBtn = document.createElement("button");
        dirBtn.type = "button";
        dirBtn.className = "top-bar-sort-dir-btn";
        const isAsc = currentOrderDirection === "asc";
        const isGroupOrd = currentOrderBy === "groupOrder";
        dirBtn.textContent = isAsc ? "▲ Asc" : "▼ Desc";
        dirBtn.disabled = isGroupOrd;
        dirBtn.style.opacity = isGroupOrd ? "0.5" : "1";
        dirBtn.style.cursor = isGroupOrd ? "not-allowed" : "pointer";
        dirBtn.title = isGroupOrd
            ? "Direction is disabled when ordering by Group Order"
            : (isAsc ? "Ascending (Click for Descending)" : "Descending (Click for Ascending)");
        sortSection.appendChild(dirBtn);

        sortSelect.addEventListener("change", () => {
            if (allowInteractions === false) return;
            const newOrderBy = sortSelect.value as OrderByOption;
            const newIsGroupOrd = newOrderBy === "groupOrder";
            dirBtn.disabled = newIsGroupOrd;
            dirBtn.style.opacity = newIsGroupOrd ? "0.5" : "1";
            dirBtn.style.cursor = newIsGroupOrd ? "not-allowed" : "pointer";
            dirBtn.title = newIsGroupOrd
                ? "Direction is disabled when ordering by Group Order"
                : (currentOrderDirection === "asc" ? "Ascending (Click for Descending)" : "Descending (Click for Ascending)");
            try {
                host.persistProperties({
                    merge: [{ objectName: "groupOrderCard", properties: { orderBy: newOrderBy }, selector: null }]
                });
            } catch {}
            onOrderByChange(newOrderBy);
        });

        dirBtn.addEventListener("click", () => {
            if (allowInteractions === false) return;
            if (currentOrderBy === "groupOrder") return;
            const newDir: OrderDirectionOption = currentOrderDirection === "asc" ? "desc" : "asc";
            const newIsAsc = newDir === "asc";
            dirBtn.textContent = newIsAsc ? "▲ Asc" : "▼ Desc";
            dirBtn.title = newIsAsc ? "Ascending (Click for Descending)" : "Descending (Click for Ascending)";
            try {
                host.persistProperties({
                    merge: [{ objectName: "groupOrderCard", properties: { orderDirection: newDir }, selector: null }]
                });
            } catch {}
            onOrderDirectionChange(newDir);
        });

        return sortSection;
    }

    public renderTopBarSearchSection(
        searchTerm: string,
        onSearchInput: (term: string) => void,
        onSearchSubmit: (term: string) => void,
        onSearchClear: () => void
    ): HTMLElement {
        const searchSection = document.createElement("div");
        searchSection.className = "top-bar-content top-bar-search-section";

        const searchLabel = document.createElement("span");
        searchLabel.className = "top-bar-label";

        const searchSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        searchSvg.setAttribute("width", "12");
        searchSvg.setAttribute("height", "12");
        searchSvg.setAttribute("viewBox", "0 0 24 24");
        searchSvg.setAttribute("fill", "none");
        searchSvg.setAttribute("stroke", "currentColor");
        searchSvg.setAttribute("stroke-width", "2");
        searchSvg.setAttribute("stroke-linecap", "round");
        searchSvg.setAttribute("stroke-linejoin", "round");
        searchSvg.style.verticalAlign = "-2px";
        searchSvg.style.marginRight = "5px";

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "11");
        circle.setAttribute("cy", "11");
        circle.setAttribute("r", "8");
        searchSvg.appendChild(circle);

        const sLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        sLine.setAttribute("x1", "21");
        sLine.setAttribute("y1", "21");
        sLine.setAttribute("x2", "16.65");
        sLine.setAttribute("y2", "16.65");
        searchSvg.appendChild(sLine);

        searchLabel.appendChild(searchSvg);
        searchLabel.appendChild(document.createTextNode("Text Search: "));
        searchSection.appendChild(searchLabel);

        const searchWrapper = document.createElement("div");
        searchWrapper.className = "top-bar-search-wrapper";

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "top-bar-search-input";
        searchInput.placeholder = "Search...";
        searchInput.setAttribute("aria-label", "Text Search");
        searchInput.value = searchTerm;
        this.searchInputEl = searchInput;

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = `top-bar-search-clear${searchTerm.length > 0 ? "" : " empty"}`;
        clearBtn.title = "Reset search";
        clearBtn.setAttribute("aria-label", "Reset search");
        clearBtn.tabIndex = 0;
        clearBtn.textContent = "✕";
        this.searchClearBtn = clearBtn;

        searchWrapper.appendChild(searchInput);
        searchWrapper.appendChild(clearBtn);
        searchSection.appendChild(searchWrapper);

        searchInput.addEventListener("input", () => {
            if (searchInput.value.length > 0) {
                clearBtn.classList.remove("empty");
            } else {
                clearBtn.classList.add("empty");
            }
            onSearchInput(searchInput.value);
        });

        searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                onSearchSubmit(searchInput.value);
            } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                this.clearTextSearch(onSearchClear);
            }
        });

        clearBtn.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            this.clearTextSearch(onSearchClear);
        });

        clearBtn.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                this.clearTextSearch(onSearchClear);
            }
        });

        return searchSection;
    }

    public clearTextSearch(onClear?: () => void): void {
        if (this.searchInputEl) {
            this.searchInputEl.value = '';
            this.searchInputEl.focus();
        }
        if (this.searchClearBtn) {
            this.searchClearBtn.classList.add("empty");
        }
        if (onClear) {
            onClear();
        }
    }

    public renderTopBarSubgroupControls(
        onCollapseAll?: () => void,
        onExpandAll?: () => void,
        allowInteractions: boolean = true,
        collapseTitle: string = "Collapse All",
        expandTitle: string = "Expand All"
    ): HTMLElement {
        const container = document.createElement("div");
        container.className = "top-bar-subgroup-controls";

        const collapseBtn = document.createElement("button");
        collapseBtn.className = "top-bar-subgroup-btn top-bar-collapse-all-btn";
        collapseBtn.type = "button";
        collapseBtn.title = collapseTitle;
        collapseBtn.setAttribute("aria-label", collapseTitle);
        collapseBtn.setAttribute("role", "button");
        collapseBtn.tabIndex = 0;
        if (!allowInteractions) {
            collapseBtn.disabled = true;
        }

        const expandBtn = document.createElement("button");
        expandBtn.className = "top-bar-subgroup-btn top-bar-expand-all-btn";
        expandBtn.type = "button";
        expandBtn.title = expandTitle;
        expandBtn.setAttribute("aria-label", expandTitle);
        expandBtn.setAttribute("role", "button");
        expandBtn.tabIndex = 0;
        if (!allowInteractions) {
            expandBtn.disabled = true;
        }

        const svgNS = "http://www.w3.org/2000/svg";

        // Double chevron up for Collapse All
        const collapseSvg = document.createElementNS(svgNS, "svg");
        collapseSvg.setAttribute("width", "12");
        collapseSvg.setAttribute("height", "12");
        collapseSvg.setAttribute("viewBox", "0 0 24 24");
        collapseSvg.setAttribute("fill", "none");
        collapseSvg.setAttribute("stroke", "currentColor");
        collapseSvg.setAttribute("stroke-width", "2");
        collapseSvg.setAttribute("stroke-linecap", "round");
        collapseSvg.setAttribute("stroke-linejoin", "round");

        const polyCollapse1 = document.createElementNS(svgNS, "polyline");
        polyCollapse1.setAttribute("points", "18 13 12 7 6 13");
        const polyCollapse2 = document.createElementNS(svgNS, "polyline");
        polyCollapse2.setAttribute("points", "18 19 12 13 6 19");
        collapseSvg.appendChild(polyCollapse1);
        collapseSvg.appendChild(polyCollapse2);
        collapseBtn.appendChild(collapseSvg);

        // Double chevron down for Expand All
        const expandSvg = document.createElementNS(svgNS, "svg");
        expandSvg.setAttribute("width", "12");
        expandSvg.setAttribute("height", "12");
        expandSvg.setAttribute("viewBox", "0 0 24 24");
        expandSvg.setAttribute("fill", "none");
        expandSvg.setAttribute("stroke", "currentColor");
        expandSvg.setAttribute("stroke-width", "2");
        expandSvg.setAttribute("stroke-linecap", "round");
        expandSvg.setAttribute("stroke-linejoin", "round");

        const polyExpand1 = document.createElementNS(svgNS, "polyline");
        polyExpand1.setAttribute("points", "6 5 12 11 18 5");
        const polyExpand2 = document.createElementNS(svgNS, "polyline");
        polyExpand2.setAttribute("points", "6 11 12 17 18 11");
        expandSvg.appendChild(polyExpand1);
        expandSvg.appendChild(polyExpand2);
        expandBtn.appendChild(expandSvg);

        const triggerCollapse = () => {
            if (allowInteractions === false) return;
            if (onCollapseAll) onCollapseAll();
        };

        const triggerExpand = () => {
            if (allowInteractions === false) return;
            if (onExpandAll) onExpandAll();
        };

        collapseBtn.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            triggerCollapse();
        });

        collapseBtn.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                triggerCollapse();
            }
        });

        expandBtn.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            triggerExpand();
        });

        expandBtn.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                triggerExpand();
            }
        });

        container.appendChild(collapseBtn);
        container.appendChild(expandBtn);
        return container;
    }

    public updateTopBar(opts: TopBarUpdateOptions): void {
        if (!this.topBar) return;

        while (this.topBar.firstChild) {
            this.topBar.removeChild(this.topBar.firstChild);
        }

        const groupSelectorEl = this.renderTopBarGroupSelector(
            opts.currentGroup,
            opts.distinctGroups,
            opts.fieldName || "Top Level Group",
            opts.visualInstanceId,
            opts.allowInteractions,
            opts.getFontSettings,
            opts.onGroupChange,
            opts.isDateField
        );
        if (groupSelectorEl) {
            this.topBar.appendChild(groupSelectorEl);
        }

        if (opts.hasSubgroups && opts.onCollapseAll && opts.onExpandAll) {
            const subgroupControls = this.renderTopBarSubgroupControls(
                opts.onCollapseAll,
                opts.onExpandAll,
                opts.allowInteractions,
                opts.collapseTitle,
                opts.expandTitle
            );
            this.topBar.appendChild(subgroupControls);
        }

        if (opts.showSearch) {
            this.topBar.appendChild(
                this.renderTopBarSearchSection(
                    opts.searchTerm,
                    opts.onSearchInput,
                    opts.onSearchSubmit,
                    opts.onSearchClear
                )
            );
        } else {
            this.searchInputEl = null;
            this.searchClearBtn = null;
        }

        if (this.topBar.children.length > 0) {
            this.topBar.style.display = "flex";
        } else {
            this.topBar.style.display = "none";
        }
    }
}

