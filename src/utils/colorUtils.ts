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
import { COLOR_MAP } from "../constants";
import { ColorRgb, DecorationClassInfo, DeselectedMarkerColors } from "../types";

export function normalizeColor(
    rawColor: any,
    fallbackColor: string = '#3677a8',
    colorPalette?: ISandboxExtendedColorPalette | null
): string {
    if (!rawColor) {
        if (colorPalette && typeof (colorPalette as any).getColor === 'function' && fallbackColor) {
            const palColor = (colorPalette as any).getColor(fallbackColor);
            if (palColor && palColor.value) return palColor.value;
        }
        return fallbackColor;
    }

    if (typeof rawColor === 'number' && !isNaN(rawColor)) {
        const hex = (rawColor & 0xFFFFFF).toString(16).padStart(6, '0');
        return `#${hex}`;
    }

    if (typeof rawColor !== 'string') {
        return fallbackColor;
    }

    const trimmed = rawColor.trim();
    if (!trimmed) return fallbackColor;

    const cleaned = trimmed.replace(/^["']|["']$/g, '').trim();

    // 1. Direct hex checks with #
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleaned)) {
        return cleaned;
    }

    // 2. Hex without # prefix (e.g. "f79646", "FF0000", "0078d4")
    if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleaned)) {
        return `#${cleaned}`;
    }

    // 3. rgb(...) / rgba(...) / hsl(...) / hsla(...)
    if (/^(rgb|rgba|hsl|hsla)\s*\(.+\)$/i.test(cleaned)) {
        return cleaned;
    }

    // 4. Common color names, flag classes, and healthcare/RAG synonyms
    const lower = cleaned.toLowerCase().replace(/[\s_-]/g, '');
    const strippedKey = lower.replace(/^(?:flag|sash)/, '');
    if (COLOR_MAP[strippedKey]) {
        return COLOR_MAP[strippedKey];
    }

    if (typeof document !== 'undefined' && document.createElement) {
        try {
            const testEl = document.createElement('div');
            testEl.style.color = cleaned;
            if (testEl.style.color) {
                return cleaned;
            }
        } catch {}
    }

    return fallbackColor;
}

export function extractDecorationClass(
    eventClass: string | null | undefined,
    prefix: 'flag' | 'sash',
    colorPalette?: ISandboxExtendedColorPalette | null
): DecorationClassInfo | null {
    if (!eventClass) return null;
    const classes = String(eventClass).trim().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`^${prefix}[-_]?(.*)$`, 'i');
    for (const cls of classes) {
        const m = cls.match(regex);
        if (m) {
            const colorPart = m[1] || 'red';
            const color = normalizeColor(colorPart, '', colorPalette) || normalizeColor(cls, '', colorPalette) || '#c8483b';
            return { color, className: cls };
        }
    }
    return null;
}

export function extractFlagClass(
    eventClass: string | null | undefined,
    colorPalette?: ISandboxExtendedColorPalette | null
): DecorationClassInfo | null {
    return extractDecorationClass(eventClass, 'flag', colorPalette);
}

export function extractSashClass(
    eventClass: string | null | undefined,
    colorPalette?: ISandboxExtendedColorPalette | null
): DecorationClassInfo | null {
    return extractDecorationClass(eventClass, 'sash', colorPalette);
}

export function getItemSashFlagVars(
    eventClass: string | null | undefined,
    colorPalette?: ISandboxExtendedColorPalette | null
): string {
    const flagInfo = extractFlagClass(eventClass, colorPalette);
    const sashInfo = extractSashClass(eventClass, colorPalette);
    let vars = '';
    if (flagInfo) {
        vars += `--flag-color: ${flagInfo.color}; `;
    }
    if (sashInfo) {
        vars += `--sash-color: ${sashInfo.color}; `;
    }
    return vars;
}

/**
 * Calculates the altered translucent-appearing color for deselected/dimmed markers.
 * Blends the marker base color against the light grey background (#f2f2f2 / rgb(242,242,242))
 * so that it appears translucent without reducing CSS opacity.
 * This avoids multiple overlapping markers compounding their opacities into a dark blob.
 */
export function getRgbFromColor(
    rawColor: string,
    colorPalette?: ISandboxExtendedColorPalette | null
): ColorRgb {
    const base = normalizeColor(rawColor, '#3677a8', colorPalette);
    let r = 54, g = 119, b = 168;

    if (base.startsWith('#')) {
        let hex = base.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length >= 6) {
            const parsedR = parseInt(hex.slice(0, 2), 16);
            const parsedG = parseInt(hex.slice(2, 4), 16);
            const parsedB = parseInt(hex.slice(4, 6), 16);
            if (!isNaN(parsedR) && !isNaN(parsedG) && !isNaN(parsedB)) {
                r = parsedR;
                g = parsedG;
                b = parsedB;
            }
        }
    } else {
        const match = base.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
            r = parseInt(match[1], 10);
            g = parseInt(match[2], 10);
            b = parseInt(match[3], 10);
        }
    }
    return { r, g, b };
}

export function getReadableTextColorForBg(r: number, g: number, b: number): { textColor: string; textRgb: string } {
    const sR = r / 255;
    const sG = g / 255;
    const sB = b / 255;
    const lumR = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
    const lumG = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
    const lumB = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
    const luminance = 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB;

    if (luminance > 0.48) {
        return { textColor: '#1a1a1a', textRgb: '26, 26, 26' };
    } else {
        return { textColor: '#ffffff', textRgb: '255, 255, 255' };
    }
}

export function getDeselectedMarkerColors(
    rawColor: string,
    colorPalette?: ISandboxExtendedColorPalette | null
): DeselectedMarkerColors {
    const { r, g, b } = getRgbFromColor(rawColor, colorPalette);

    // Blend with light grey background (#f2f2f2 -> rgb(242, 242, 242))
    // Fill: 55% marker color + 45% light grey background
    // Border: 75% marker color + 25% light grey background
    const bgR = 242, bgG = 242, bgB = 242;
    const fillWeight = 0.55;
    const borderWeight = 0.75;

    const fillR = Math.round(fillWeight * r + (1 - fillWeight) * bgR);
    const fillG = Math.round(fillWeight * g + (1 - fillWeight) * bgG);
    const fillB = Math.round(fillWeight * b + (1 - fillWeight) * bgB);

    const borderR = Math.round(borderWeight * r + (1 - borderWeight) * bgR);
    const borderG = Math.round(borderWeight * g + (1 - borderWeight) * bgG);
    const borderB = Math.round(borderWeight * b + (1 - borderWeight) * bgB);

    const toHex = (num: number) => Math.max(0, Math.min(255, num)).toString(16).padStart(2, '0');

    const fillHex = `#${toHex(fillR)}${toHex(fillG)}${toHex(fillB)}`;
    const borderHex = `#${toHex(borderR)}${toHex(borderG)}${toHex(borderB)}`;

    return {
        fill: fillHex,
        border: borderHex,
        text: '#444444'
    };
}
