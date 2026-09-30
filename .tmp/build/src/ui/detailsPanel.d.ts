import { HighContrastSettings } from "../types";
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
export declare class DetailsPanelManager {
    detailsPanel: HTMLElement;
    detailsPanelResizer: HTMLElement;
    detailsPanelHeader: HTMLElement;
    detailsHeaderCount: HTMLElement;
    detailsPanelBody: HTMLElement;
    detailsPanelWidth: number | null;
    lastPointerX: number | null;
    lastPointerY: number | null;
    currentGlowingCard: HTMLElement | null;
    currentRenderContext: DetailsPanelRenderContext | null;
    private container;
    private contentContainer;
    constructor(container: HTMLElement, contentContainer: HTMLElement, getLocalizedString: (key: string, fallback: string) => string, onOpenExternalUrl: (url: string) => void, onClearGlow: () => void, onResized: () => void, allowInteractionsGetter: () => boolean);
    resetDetailsPanelScroll(): void;
    clearCardHoverGlow(): void;
    private updateCardGlowUnderPointer;
    renderDetailsEmptyState(emptyMessage: string, searchTerm?: string): HTMLElement;
    renderDetailsItemCard(item: any, selectedIdSet: Set<any>, isMultiSelect: boolean, count: number, hc: HighContrastSettings, ctx: DetailsPanelRenderContext): HTMLElement;
    renderDetailsPanel(ctx: DetailsPanelRenderContext, resetScroll?: boolean): void;
}
