/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import { HighContrastSettings } from "../types";
import { measureMaxTextWidth } from "../utils/domUtils";

export class LandingPageManager {
    public landingPageOverlay: HTMLElement;

    private container: HTMLElement;
    private fitTimelineButtonGetter: () => HTMLElement | null;
    private contentContainerGetter: () => HTMLElement | null;
    private topBarGetter: () => HTMLElement | null;
    private mainTimelineContainerGetter: () => HTMLElement | null;
    private miniTimelineContainerGetter: () => HTMLElement | null;

    constructor(
        container: HTMLElement,
        fitTimelineButtonGetter: () => HTMLElement | null,
        contentContainerGetter: () => HTMLElement | null,
        topBarGetter: () => HTMLElement | null,
        mainTimelineContainerGetter: () => HTMLElement | null,
        miniTimelineContainerGetter: () => HTMLElement | null
    ) {
        this.container = container;
        this.fitTimelineButtonGetter = fitTimelineButtonGetter;
        this.contentContainerGetter = contentContainerGetter;
        this.topBarGetter = topBarGetter;
        this.mainTimelineContainerGetter = mainTimelineContainerGetter;
        this.miniTimelineContainerGetter = miniTimelineContainerGetter;

        this.landingPageOverlay = document.createElement("div");
        this.landingPageOverlay.className = "visual-landing-page";
        this.landingPageOverlay.style.display = "none";
        this.container.appendChild(this.landingPageOverlay);
    }

    public showLandingPage(options: {
        distinctGroups: string[];
        fieldName?: string;
        visualInstanceId: string;
        allowInteractions: boolean;
        onSelectGroup: (val: string) => void;
        hideStatus: () => void;
        hideLoading: () => void;
    }): void {
        options.hideLoading();
        if (!this.landingPageOverlay) return;
        options.hideStatus();

        const mainCont = this.mainTimelineContainerGetter();
        if (mainCont) mainCont.style.display = "none";
        const miniCont = this.miniTimelineContainerGetter();
        if (miniCont) miniCont.style.display = "none";
        const contentCont = this.contentContainerGetter();
        if (contentCont) contentCont.style.display = "none";
        const topBar = this.topBarGetter();
        if (topBar) topBar.style.display = "none";

        while (this.landingPageOverlay.firstChild) {
            this.landingPageOverlay.removeChild(this.landingPageOverlay.firstChild);
        }

        const fieldName = options.fieldName || "Top Level Group";
        const distinctGroups = options.distinctGroups || [];

        const card = document.createElement("div");
        card.className = "landing-card";

        const iconDiv = document.createElement("div");
        iconDiv.className = "landing-icon";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "32");
        svg.setAttribute("height", "32");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "#0078d4");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3");
        svg.appendChild(poly);
        iconDiv.appendChild(svg);
        card.appendChild(iconDiv);

        const title = document.createElement("div");
        title.className = "landing-title";
        title.textContent = `Select ${fieldName}`;
        card.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "landing-subtitle";
        subtitle.textContent = `The dataset contains multiple values for ${fieldName} (${distinctGroups.length} values found). Please select a distinct value to display its timeline:`;
        card.appendChild(subtitle);

        const controls = document.createElement("div");
        controls.className = "landing-controls";

        const selectEl = document.createElement("select");
        selectEl.className = "landing-select";
        selectEl.id = "landing-group-select-" + options.visualInstanceId;

        // Measure widest value so landing dropdown is wide enough to see the full text
        const maxLandingTextWidth = measureMaxTextWidth(distinctGroups, "13px 'Segoe UI', sans-serif", 8.5);

        const neededLandingSelectWidth = Math.ceil(maxLandingTextWidth + 64);
        // Landing card has 36px left and 36px right padding (72px total)
        const neededCardWidth = Math.max(480, Math.min(850, neededLandingSelectWidth + 90));
        card.style.maxWidth = `${neededCardWidth}px`;

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = `-- Select a ${fieldName} --`;
        selectEl.appendChild(defaultOpt);

        distinctGroups.forEach(g => {
            const opt = document.createElement("option");
            opt.value = g;
            opt.textContent = g;
            opt.title = g;
            selectEl.appendChild(opt);
        });
        controls.appendChild(selectEl);

        const btnEl = document.createElement("button");
        btnEl.className = "landing-btn";
        btnEl.id = "landing-submit-btn-" + options.visualInstanceId;
        btnEl.disabled = true;
        btnEl.textContent = "View Timeline";
        controls.appendChild(btnEl);

        card.appendChild(controls);
        this.landingPageOverlay.appendChild(card);
        this.landingPageOverlay.style.display = "flex";

        const fitBtn = this.fitTimelineButtonGetter();
        if (fitBtn) fitBtn.style.display = "none";

        const handleSelect = (val: string) => {
            if (!val) return;
            this.hideLandingPage();
            options.onSelectGroup(val);
        };

        selectEl.addEventListener("change", () => {
            if (options.allowInteractions === false) return;
            if (selectEl.value) {
                btnEl.disabled = false;
                handleSelect(selectEl.value);
            } else {
                btnEl.disabled = true;
            }
        });

        btnEl.addEventListener("click", () => {
            if (options.allowInteractions === false) return;
            if (selectEl.value) {
                handleSelect(selectEl.value);
            }
        });
    }

    public hideLandingPage(onAfterHide?: () => void): void {
        if (!this.landingPageOverlay) return;
        this.landingPageOverlay.style.display = "none";

        const fitBtn = this.fitTimelineButtonGetter();
        if (fitBtn) fitBtn.style.display = "flex";
        const contentCont = this.contentContainerGetter();
        if (contentCont) contentCont.style.display = "flex";

        if (onAfterHide) {
            onAfterHide();
        }
    }

    public isVisible(): boolean {
        return !!this.landingPageOverlay && this.landingPageOverlay.style.display !== "none";
    }
}

