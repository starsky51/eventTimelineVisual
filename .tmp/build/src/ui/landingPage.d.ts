export declare class LandingPageManager {
    landingPageOverlay: HTMLElement;
    private container;
    private fitTimelineButtonGetter;
    private contentContainerGetter;
    private topBarGetter;
    private mainTimelineContainerGetter;
    private miniTimelineContainerGetter;
    constructor(container: HTMLElement, fitTimelineButtonGetter: () => HTMLElement | null, contentContainerGetter: () => HTMLElement | null, topBarGetter: () => HTMLElement | null, mainTimelineContainerGetter: () => HTMLElement | null, miniTimelineContainerGetter: () => HTMLElement | null);
    showLandingPage(options: {
        distinctGroups: string[];
        fieldName?: string;
        visualInstanceId: string;
        allowInteractions: boolean;
        onSelectGroup: (val: string) => void;
        hideStatus: () => void;
        hideLoading: () => void;
    }): void;
    hideLandingPage(onAfterHide?: () => void): void;
    isVisible(): boolean;
}
