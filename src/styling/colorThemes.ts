/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

export interface ColorThemeDefinition {
    id: string;
    displayName: string;
    defaultColor: string;
    palette: string[];
}

export const COLOR_THEMES: Record<string, ColorThemeDefinition> = {
    standard: {
        id: 'standard',
        displayName: 'Standard',
        defaultColor: '#3677a8',
        palette: [
            '#3677a8', '#388559', '#be4f32', '#6c508a', '#308075',
            '#9f4591', '#355d82', '#567c2e', '#a857a0', '#429fbe',
            '#be478a', '#c66133', '#79619c', '#347b7f', '#557069'
        ]
    },
    highContrast: {
        id: 'highContrast',
        displayName: 'High Contrast',
        defaultColor: '#0078d4',
        palette: [
            '#0078d4', '#d13438', '#107c41', '#d83b01', '#5c2d91',
            '#004e8c', '#a80000', '#008272', '#b4009e', '#002050',
            '#881798', '#498205'
        ]
    },
    nhs: {
        id: 'nhs',
        displayName: 'NHS',
        defaultColor: '#005eb8',
        palette: [
            '#005eb8', '#007f3b', '#ed8b00', '#0072ce', '#7c2855',
            '#41b6e6', '#005a36', '#ffb81c', '#330072', '#00a9ce',
            '#003087'
        ]
    },
    blues: {
        id: 'blues',
        displayName: 'Blues',
        defaultColor: '#1f77b4',
        palette: [
            '#1f77b4', '#004e8c', '#2b8cbe', '#0078d4', '#4682b4',
            '#1b4f72', '#5dade2', '#005a9e', '#6baed6', '#3182bd',
            '#08519c', '#2171b5'
        ]
    },
    pastels: {
        id: 'pastels',
        displayName: 'Pastels',
        defaultColor: '#7293cb',
        palette: [
            '#7293cb', '#e1974c', '#84ba5b', '#d35e60', '#808585',
            '#9067a7', '#ab6857', '#ccc197', '#67a9cf', '#f4a582',
            '#b8e186', '#e8a8c8'
        ]
    },
    warm: {
        id: 'warm',
        displayName: 'Warm',
        defaultColor: '#d9534f',
        palette: [
            '#d9534f', '#f0ad4e', '#d35400', '#c0392b', '#e67e22',
            '#b9770e', '#cd6155', '#e74c3c', '#d68910', '#ba4a00',
            '#922b21', '#a04000'
        ]
    },
    eventColor: {
        id: 'eventColor',
        displayName: 'Event Color',
        defaultColor: '#3677a8',
        palette: [
            '#3677a8', '#388559', '#be4f32', '#6c508a', '#308075',
            '#9f4591', '#355d82', '#567c2e', '#a857a0', '#429fbe',
            '#be478a', '#c66133', '#79619c', '#347b7f', '#557069'
        ]
    }
};

export function getColorTheme(themeKey?: any): ColorThemeDefinition {
    if (!themeKey) return COLOR_THEMES.standard;
    const raw = typeof themeKey === 'object' && themeKey !== null ? (themeKey.value || '') : String(themeKey);
    const normalized = raw.toLowerCase().replace(/[\s-_]/g, '');

    if (normalized === 'highcontrast' || normalized === 'contrast') return COLOR_THEMES.highContrast;
    if (normalized === 'nhs') return COLOR_THEMES.nhs;
    if (normalized === 'blues' || normalized === 'blue') return COLOR_THEMES.blues;
    if (normalized === 'pastels' || normalized === 'pastel') return COLOR_THEMES.pastels;
    if (normalized === 'warm' || normalized === 'sunset') return COLOR_THEMES.warm;
    if (normalized === 'eventcolor') return COLOR_THEMES.eventColor;
    return COLOR_THEMES.standard;
}

