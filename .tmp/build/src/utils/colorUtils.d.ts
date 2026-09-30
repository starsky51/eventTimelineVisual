import powerbi from "powerbi-visuals-api";
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { ColorRgb, DecorationClassInfo, DeselectedMarkerColors } from "../types";
export declare function normalizeColor(rawColor: any, fallbackColor?: string, colorPalette?: ISandboxExtendedColorPalette | null): string;
export declare function extractDecorationClass(eventClass: string | null | undefined, prefix: 'flag' | 'sash', colorPalette?: ISandboxExtendedColorPalette | null): DecorationClassInfo | null;
export declare function extractFlagClass(eventClass: string | null | undefined, colorPalette?: ISandboxExtendedColorPalette | null): DecorationClassInfo | null;
export declare function extractSashClass(eventClass: string | null | undefined, colorPalette?: ISandboxExtendedColorPalette | null): DecorationClassInfo | null;
export declare function getItemSashFlagVars(eventClass: string | null | undefined, colorPalette?: ISandboxExtendedColorPalette | null): string;
/**
 * Calculates the altered translucent-appearing color for deselected/dimmed markers.
 * Blends the marker base color against the light grey background (#f2f2f2 / rgb(242,242,242))
 * so that it appears translucent without reducing CSS opacity.
 * This avoids multiple overlapping markers compounding their opacities into a dark blob.
 */
export declare function getRgbFromColor(rawColor: string, colorPalette?: ISandboxExtendedColorPalette | null): ColorRgb;
export declare function getReadableTextColorForBg(r: number, g: number, b: number): {
    textColor: string;
    textRgb: string;
};
export declare function getDeselectedMarkerColors(rawColor: string, colorPalette?: ISandboxExtendedColorPalette | null): DeselectedMarkerColors;
