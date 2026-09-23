/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import { HighContrastSettings } from "../types";

export class StatusOverlayManager {
    public statusOverlay: HTMLElement;
    public statusTitle: HTMLElement;
    public statusMessage: HTMLElement;
    public statusDetails: HTMLElement;
    public loadingOverlay: HTMLElement;

    private container: HTMLElement;
    private fitTimelineButtonGetter: () => HTMLElement | null;
    private contentContainerGetter: () => HTMLElement | null;

    constructor(
        container: HTMLElement,
        fitTimelineButtonGetter: () => HTMLElement | null,
        contentContainerGetter: () => HTMLElement | null,
        getLocalizedString: (key: string, fallback: string) => string
    ) {
        this.container = container;
        this.fitTimelineButtonGetter = fitTimelineButtonGetter;
        this.contentContainerGetter = contentContainerGetter;

        // Status / empty / error overlay
        this.statusOverlay = document.createElement("div");
        this.statusOverlay.className = "visual-status-overlay";
        this.statusOverlay.style.display = "none";

        this.statusTitle = document.createElement("div");
        this.statusTitle.className = "status-title";
        this.statusOverlay.appendChild(this.statusTitle);

        this.statusMessage = document.createElement("div");
        this.statusMessage.className = "status-message";
        this.statusOverlay.appendChild(this.statusMessage);

        this.statusDetails = document.createElement("div");
        this.statusDetails.className = "status-details";
        this.statusDetails.style.display = "none";
        this.statusOverlay.appendChild(this.statusDetails);

        this.container.appendChild(this.statusOverlay);

        // Loading Overlay for refresh / filter change / reload
        this.loadingOverlay = document.createElement("div");
        this.loadingOverlay.className = "visual-loading-overlay";
        this.loadingOverlay.style.display = "none";

        const loadingBox = document.createElement("div");
        loadingBox.className = "visual-loading-box";

        const loadingSpinner = document.createElement("div");
        loadingSpinner.className = "visual-loading-spinner";
        loadingBox.appendChild(loadingSpinner);

        const loadingText = document.createElement("div");
        loadingText.className = "visual-loading-text";
        loadingText.textContent = getLocalizedString("status_loading", "Loading, please wait...");
        loadingBox.appendChild(loadingText);

        this.loadingOverlay.appendChild(loadingBox);
        this.container.appendChild(this.loadingOverlay);
    }

    public showLoading(): void {
        if (this.container) {
            this.container.classList.add("visual-is-loading");
        }
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = "flex";
        }
    }

    public hideLoading(): void {
        if (this.container) {
            this.container.classList.remove("visual-is-loading");
        }
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = "none";
        }
    }

    public showStatus(title: string, message: string, details?: string): void {
        this.hideLoading();
        if (!this.statusOverlay) return;
        this.statusTitle.textContent = title;
        this.statusMessage.textContent = message;
        if (details) {
            this.statusDetails.textContent = details;
            this.statusDetails.style.display = "block";
        } else {
            this.statusDetails.style.display = "none";
        }
        this.statusOverlay.style.display = "flex";

        const fitBtn = this.fitTimelineButtonGetter();
        if (fitBtn) fitBtn.style.display = "none";
        const contentCont = this.contentContainerGetter();
        if (contentCont) contentCont.style.display = "none";
    }

    public hideStatus(onAfterHide?: () => void): void {
        if (!this.statusOverlay) return;
        this.statusOverlay.style.display = "none";

        const fitBtn = this.fitTimelineButtonGetter();
        if (fitBtn) fitBtn.style.display = "flex";
        const contentCont = this.contentContainerGetter();
        if (contentCont) contentCont.style.display = "flex";

        if (onAfterHide) {
            onAfterHide();
        }
    }

    public isStatusVisible(): boolean {
        return !!this.statusOverlay && this.statusOverlay.style.display !== "none";
    }

    public applyHighContrast(hc: HighContrastSettings): void {
        if (!this.statusOverlay) return;
        if (hc.isHighContrast) {
            if (hc.background) {
                this.statusOverlay.style.backgroundColor = hc.background;
            }
            if (hc.foreground) {
                if (this.statusTitle) this.statusTitle.style.color = hc.foreground;
                if (this.statusMessage) this.statusMessage.style.color = hc.foreground;
            }
        } else {
            this.statusOverlay.style.backgroundColor = "";
            if (this.statusTitle) this.statusTitle.style.color = "";
            if (this.statusMessage) this.statusMessage.style.color = "";
        }
    }
}

