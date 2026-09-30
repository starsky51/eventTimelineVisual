import powerbi from "powerbi-visuals-api";
import ITooltipService = powerbi.extensibility.ITooltipService;
import { EnhancedTooltipInfo, HighContrastSettings } from "../types";
export interface TooltipManagerOptions {
    target: HTMLElement;
    tooltipService: ITooltipService | null;
    getItemsUnderPointer: (clientX: number, clientY: number) => any[];
    getItemById: (id: any) => any;
    getHighContrastSettings: () => HighContrastSettings;
    getShowFieldNames: () => boolean;
    getLocalizedString?: (key: string, fallback: string) => string;
}
export declare class TooltipManager {
    enhancedTooltipElement: HTMLElement;
    enhancedTooltipHeader: HTMLElement;
    enhancedTooltipTitleText: HTMLElement;
    enhancedTooltipBadges: HTMLElement;
    enhancedTooltipBadgeMore: HTMLElement;
    enhancedTooltipDate: HTMLElement;
    enhancedTooltipContentContainer: HTMLElement;
    enhancedTooltipContent: HTMLElement;
    enhancedTooltipMoreHint: HTMLElement;
    currentTooltipFontFamily: string;
    currentTooltipFontSize: number;
    private target;
    private tooltipService;
    private options;
    constructor(options: TooltipManagerOptions);
    updateTooltipCssVariables(markerColor: string, rgbStr: string, textColor: string, textRgb: string): void;
    applyEnhancedTooltipStyles(markerColor: string, rgbStr: string, textColor: string): void;
    showEnhancedColorTooltip(clientX: number, clientY: number, info: EnhancedTooltipInfo): void;
    hideEnhancedColorTooltip(): void;
    hideTooltip(immediately?: boolean): void;
    isTooltipsEnabled(formattingSettings: any, lastUpdateOptions: any): boolean;
    isCanvasTooltipConfigured(formattingSettings: any, lastUpdateOptions: any): boolean;
    showTooltipForPointer(clientX: number, clientY: number, formattingSettings: any, lastUpdateOptions: any, fallbackItemId?: any): void;
}
