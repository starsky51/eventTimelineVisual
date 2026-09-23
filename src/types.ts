/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;

export type OrderByOption = 'groupOrder' | 'alphabetical' | 'mostRecentEvent';
export type OrderDirectionOption = 'asc' | 'desc';

export interface GlobalListeners {
    handleGlobalUp: (event: MouseEvent | PointerEvent) => void;
    handleCheckButtons: (event: MouseEvent | PointerEvent) => void;
    handleBlur: (e: FocusEvent) => void;
}

export interface HighContrastSettings {
    isHighContrast: boolean;
    foreground?: string;
    background?: string;
    foregroundSelected?: string;
    hyperlink?: string;
}

export interface FontSettings {
    fontFamily: string;
    fontSize: number;
}

export interface ColorRgb {
    r: number;
    g: number;
    b: number;
}

export interface DecorationClassInfo {
    color: string;
    className: string;
}

export interface DeselectedMarkerColors {
    fill: string;
    border: string;
    text: string;
}

export interface ColumnRolesResult {
    colMap: { [key: string]: number };
    contentIndices: number[];
    calculationFieldIndices?: number[];
}

export interface EnhancedTooltipInfo {
    headerText: string;
    dateStr: string;
    contentVal: string;
    markerColor: string;
    eventClasses: string[];
    flagInfo?: DecorationClassInfo | null;
    sashInfo?: DecorationClassInfo | null;
    rgb: ColorRgb;
    moreCount?: number;
}

export interface MarkerStyleClassResult {
    className: string;
    style: string;
}

export interface ActiveSortInfo {
    role: string | null;
    direction: powerbi.SortDirection;
    column?: powerbi.DataViewMetadataColumn | null;
    columnIndex?: number;
}

export interface GroupDateStats {
    minStartDate?: number;
    maxStartDate?: number;
    minEndDate?: number;
    maxEndDate?: number;
    firstRowIndex: number;
}

