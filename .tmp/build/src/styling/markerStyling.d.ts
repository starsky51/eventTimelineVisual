import powerbi from "powerbi-visuals-api";
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { MarkerStyleClassResult } from "../types";
export declare function computeItemStyleAndClass(item: any, isSelected: boolean, hasSelection: boolean, isMultiSelect: boolean, mostRecentSelectedId: any, searchMatchedItemIds?: Set<any>, isPointOverride?: boolean, colorPalette?: ISandboxExtendedColorPalette | null): MarkerStyleClassResult;
export declare function findMostRecentItemId(items: any[]): any;
export declare function getItemContent(item: any, showFieldNames?: boolean): string;
export declare function formatContentForTooltip(content: string): string;
