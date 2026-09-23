/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getItemSashFlagVars, getDeselectedMarkerColors } from "../utils/colorUtils";
import { sanitizeHtmlToText } from "../utils/domUtils";
import { MarkerStyleClassResult } from "../types";

export function computeItemStyleAndClass(
    item: any,
    isSelected: boolean,
    hasSelection: boolean,
    isMultiSelect: boolean,
    mostRecentSelectedId: any,
    searchMatchedItemIds: Set<any> = new Set(),
    isPointOverride?: boolean,
    colorPalette?: ISandboxExtendedColorPalette | null
): MarkerStyleClassResult {
    const isPoint = isPointOverride !== undefined ? isPointOverride : (item.isPoint || item.type === 'point');
    const baseColor = item.color || '#3677a8';
    const cleanOrigClass = (item.originalClass || '')
        .replace(/\btimeline-bar\b/g, '')
        .replace(/\bselected-primary\b/g, '')
        .replace(/\bselected-dashed\b/g, '')
        .replace(/\bsearch-matched\b/g, '')
        .trim();
    const baseClass = isPoint ? cleanOrigClass : (cleanOrigClass ? `timeline-bar ${cleanOrigClass}` : 'timeline-bar').trim();
    const sashFlagVars = getItemSashFlagVars(item.eventClass || item.originalClass, colorPalette);

    let className = baseClass;
    let style = '';

    if (hasSelection) {
        if (isSelected) {
            const isDashed = isMultiSelect && item.id !== mostRecentSelectedId;
            const borderClass = isDashed ? 'selected-dashed' : 'selected-primary';
            const borderStyle = isDashed ? '2px dashed #0078d4' : '2px solid #0078d4';
            className = baseClass ? `${baseClass} cross-highlight-selected ${borderClass}` : `cross-highlight-selected ${borderClass}`;
            if (isPoint) {
                style = `${sashFlagVars}--item-color: ${baseColor}; --item-border-color: #0078d4; background: transparent; border: none; box-shadow: none; opacity: 1.0;`;
            } else {
                style = `${sashFlagVars}--item-color: ${baseColor}; --item-border-color: #0078d4; color: #ffffff; background-color: ${baseColor}; border-color: #0078d4; opacity: 1.0; box-shadow: 0 0 3px rgba(0, 120, 212, 0.85); border: ${borderStyle};`;
            }
        } else {
            className = baseClass ? `${baseClass} cross-highlight-dimmed` : 'cross-highlight-dimmed';
            const dimmed = getDeselectedMarkerColors(baseColor, colorPalette);
            style = isPoint
                ? `${sashFlagVars}--item-color: ${dimmed.fill}; --item-border-color: ${dimmed.border}; background: transparent; border: none; box-shadow: none; opacity: 1.0;`
                : `${sashFlagVars}--item-color: ${dimmed.fill}; --item-border-color: ${dimmed.border}; color: ${dimmed.text}; background-color: ${dimmed.fill}; border-color: ${dimmed.border}; opacity: 1.0; box-shadow: none;`;
        }
    } else {
        style = isPoint
            ? `${sashFlagVars}--item-color: ${baseColor}; --item-border-color: #555555; background: transparent; border: none; box-shadow: none; opacity: 1.0;`
            : `${sashFlagVars}--item-color: ${baseColor}; --item-border-color: #555555; color: #ffffff; background-color: ${baseColor}; border: 1px solid #555555; border-color: #555555; opacity: 1.0;`;
    }

    if (searchMatchedItemIds.has(item.id)) {
        className = className ? `${className} search-matched` : 'search-matched';
    }

    return { className, style };
}

export function findMostRecentItemId(items: any[]): any {
    if (!items || items.length === 0) return null;
    let latestTime = -Infinity;
    let mostRecentId: any = null;
    items.forEach(item => {
        const s = item.start ? new Date(item.start).getTime() : 0;
        const e = item.end ? new Date(item.end).getTime() : s;
        const itemTime = Math.max(s, e);
        if (itemTime > latestTime) {
            latestTime = itemTime;
            mostRecentId = item.id;
        } else if (itemTime === latestTime && (mostRecentId === null || item.id > mostRecentId)) {
            mostRecentId = item.id;
        }
    });
    return mostRecentId;
}

export function getItemContent(item: any, showFieldNames: boolean = true): string {
    if (!item) return '';
    let contentVal = '';
    if (showFieldNames && item.contentWithNames != null && String(item.contentWithNames).trim() !== '') {
        contentVal = String(item.contentWithNames);
    } else if (!showFieldNames && item.contentWithoutNames != null && String(item.contentWithoutNames).trim() !== '') {
        contentVal = String(item.contentWithoutNames);
    } else {
        const rawContent = (item.content != null && String(item.content).trim() !== '')
            ? String(item.content)
            : (item.contentValue != null && String(item.contentValue).trim() !== ''
                ? String(item.contentValue)
                : (item.originalContent && item.originalContent !== item.eventType
                    ? String(item.originalContent)
                    : (item.content && item.content !== item.eventType ? String(item.content) : '')));
        contentVal = rawContent || '';
    }
    return contentVal ? contentVal.replace(/\\n/g, '\n') : '';
}

export function formatContentForTooltip(content: string): string {
    if (!content) return '';
    const str = String(content)
        .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, 'View')
        .replace(/(https?:\/\/[^\s<>"']+)/gi, 'View');
    return sanitizeHtmlToText(str);
}

