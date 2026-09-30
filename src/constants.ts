/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

export const SVG_NS = "http://www.w3.org/2000/svg";

export const COLOR_MAP: Record<string, string> = {
    amber: '#e5a910',
    yellow: '#d4a017',
    gold: '#e6be22',
    orange: '#c45b2b',
    red: '#c8483b',
    crimson: '#b82e46',
    green: '#2f8252',
    lime: '#5ba63b',
    lightgreen: '#82c982',
    blue: '#3677a8',
    navy: '#1f3454',
    darkblue: '#2c537d',
    skyblue: '#429fbe',
    teal: '#2c8276',
    cyan: '#32a2ab',
    aqua: '#48cad2',
    purple: '#6c508a',
    violet: '#79619c',
    magenta: '#9f4591',
    pink: '#be478a',
    grey: '#737373',
    gray: '#737373',
    black: '#1f1f1f',
    white: '#ffffff',
    brown: '#963838',
    olive: '#74771e',
    maroon: '#782323',
    coral: '#d96e48',
    salmon: '#d47467'
};

export const FONT_SIZE_OFFSETS = {
    xAxis: -1,          // Timeline X-axis: base - 1
    groupHeader: 0,    // Groups: base + 0
    miniTimeline: -2,  // Mini Timeline: base - 2
    topBar: 1,         // Toolbar: base + 1
    detailsHeader: 0,  // Details Header: base + 0
    detailsBody: 0,    // Details Content: base + 0
    tooltip: 0         // Tooltip: base + 0
} as const;

export const PADDING_OFFSETS = {
    topBar: -8,  // Toolbar padding: base (11) - 11 = 0 px
    details: -4   // Details panel padding: base (11) - 1 = 10 px
} as const;

export const PADDING_VALUES = {
    marker: 4,   // Swimlane/marker vertical padding: hard coded to 4
} as const; 
