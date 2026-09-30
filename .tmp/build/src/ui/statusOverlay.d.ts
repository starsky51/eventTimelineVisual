import { HighContrastSettings } from "../types";
export declare class StatusOverlayManager {
    statusOverlay: HTMLElement;
    statusTitle: HTMLElement;
    statusMessage: HTMLElement;
    statusDetails: HTMLElement;
    loadingOverlay: HTMLElement;
    private container;
    private fitTimelineButtonGetter;
    private contentContainerGetter;
    constructor(container: HTMLElement, fitTimelineButtonGetter: () => HTMLElement | null, contentContainerGetter: () => HTMLElement | null, getLocalizedString: (key: string, fallback: string) => string);
    showLoading(): void;
    hideLoading(): void;
    showStatus(title: string, message: string, details?: string): void;
    hideStatus(onAfterHide?: () => void): void;
    isStatusVisible(): boolean;
    applyHighContrast(hc: HighContrastSettings): void;
}
