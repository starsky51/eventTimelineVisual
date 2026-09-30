/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsGroup = formattingSettings.Group;
import FormattingSettingsCompositeCard = formattingSettings.CompositeCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * General Formatting Card
 */
class GeneralCardSettings extends FormattingSettingsCard {
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font",
        value: "Segoe UI Light, sans-serif"
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Base Font Size",
        value: 11,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 7
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 30
            }
        }
    });

    markerHeight = new formattingSettings.NumUpDown({
        name: "markerHeight",
        displayName: "Marker Height",
        value: 20,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 10
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 40
            }
        }
    });

    minZoom = new formattingSettings.AutoDropdown({
        name: "minZoom",
        displayName: "Maximum Zoom Level",
        value: "day"
    });

    keepRangeMarkers = new formattingSettings.ToggleSwitch({
        name: "keepRangeMarkers",
        displayName: "Keep Range Markers",
        value: false
    });

    name: string = "general";
    displayName: string = "General";
    slices: Array<FormattingSettingsSlice> = [this.fontFamily, this.fontSize, this.markerHeight, this.minZoom, this.keepRangeMarkers];
}

/**
 * Style Formatting Card (formerly Markers)
 */
class StyleCardSettings extends FormattingSettingsCard {
    colorTheme = new formattingSettings.AutoDropdown({
        name: "colorTheme",
        displayName: "Colour Theme",
        value: "standard"
    });

    colorLevel = new formattingSettings.AutoDropdown({
        name: "colorLevel",
        displayName: "Colour Change Mode",
        value: "eventType"
    });

    name: string = "markers";
    displayName: string = "Style";
    slices: Array<FormattingSettingsSlice> = [this.colorTheme, this.colorLevel];
}

/**
 * Miscellaneous Formatting Card
 */
export class MiscellaneousCardSettings extends FormattingSettingsCard {
    collapseSubgroupsOnLoad = new formattingSettings.ToggleSwitch({
        name: "collapseSubgroupsOnLoad",
        displayName: "Collapse Subgroups on Load",
        value: true
    });

    crossFilter = new formattingSettings.ToggleSwitch({
        name: "crossFilter",
        displayName: "Cross-Filter Other Visuals",
        value: false
    });

    name: string = "miscellaneous";
    displayName: string = "Miscellaneous";
    slices: Array<FormattingSettingsSlice> = [this.collapseSubgroupsOnLoad, this.crossFilter];
}

/**
 * Main Elements Formatting Group (for top-level elements options)
 */
export class MainElementsGroupSettings extends FormattingSettingsGroup {
    constructor() {
        super({} as any);
    }

    showFutureEvents = new formattingSettings.ToggleSwitch({
        name: "showFutureEvents",
        displayName: "Show Future Events Overlay",
        value: true
    });

    showTooltips = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Tooltips",
        value: true
    });

    showSearch = new formattingSettings.ToggleSwitch({
        name: "showSearch",
        displayName: "Show Text Search",
        value: true
    });

    name: string = "elements";
    displayName: string | undefined = undefined;
    slices: Array<FormattingSettingsSlice> = [this.showFutureEvents, this.showTooltips, this.showSearch];
}

/**
 * Mini Timeline Formatting Group
 */
export class MiniTimelineGroupSettings extends FormattingSettingsGroup {
    constructor() {
        super({} as any);
    }

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Mini Timeline",
        value: true
    });

    public topLevelSlice = this.show;

    height = new formattingSettings.NumUpDown({
        name: "height",
        displayName: "Mini Timeline Height",
        value: 80,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 50
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 300
            }
        }
    });

    name: string = "miniTimeline";
    displayName: string = "Mini Timeline";
    collapsible: boolean = true;
    slices: Array<FormattingSettingsSlice> = [this.height];
}

/**
 * Top Level Group Formatting Group
 */
export class TopLevelGroupGroupSettings extends FormattingSettingsGroup {
    constructor() {
        super({} as any);
    }

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Top Level Filter",
        value: true
    });

    public topLevelSlice = this.show;

    maxDistinctItems = new formattingSettings.NumUpDown({
        name: "maxDistinctItems",
        displayName: "Max Top Level Values",
        value: 100,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 1
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 10000
            }
        }
    });

    overflowMessage = new formattingSettings.TextInput({
        name: "overflowMessage",
        displayName: "Overflow message",
        placeholder: "Too many results have been returned and you should select a filter value to continue.",
        value: "Too many results have been returned and you should select a filter value to continue."
    });

    name: string = "topLevelGroupCard";
    displayName: string = "Top Level Group";
    collapsible: boolean = true;
    slices: Array<FormattingSettingsSlice> = [this.maxDistinctItems, this.overflowMessage];
}

/**
 * Details Panel Formatting Group
 */
export class DetailsPanelGroupSettings extends FormattingSettingsGroup {
    constructor() {
        super({} as any);
    }

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Event Details",
        value: true
    });

    public topLevelSlice = this.show;

    initialWidth = new formattingSettings.NumUpDown({
        name: "initialWidth",
        displayName: "Initial Width",
        value: 300,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 150
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 1200
            }
        }
    });

    emptyMessage = new formattingSettings.TextInput({
        name: "emptyMessage",
        displayName: "No Selection Message",
        placeholder: "Click a marker to view details",
        value: "Click a marker to view details"
    });

    showFieldNames = new formattingSettings.ToggleSwitch({
        name: "showFieldNames",
        displayName: "Show field names",
        value: true
    });

    name: string = "detailsPanel";
    displayName: string = "Details";
    collapsible: boolean = true;
    slices: Array<FormattingSettingsSlice> = [this.initialWidth, this.emptyMessage, this.showFieldNames];
}

/**
 * Elements Parent Formatting Card
 */
export class ElementsCardSettings extends FormattingSettingsCompositeCard {
    name: string = "elements";
    displayName: string = "Elements";

    mainGroup = new MainElementsGroupSettings();
    miniTimeline = new MiniTimelineGroupSettings();
    topLevelGroup = new TopLevelGroupGroupSettings();
    detailsPanel = new DetailsPanelGroupSettings();

    // Friendly direct slice accessors
    get showFutureEvents() { return this.mainGroup.showFutureEvents; }
    get showTooltips() { return this.mainGroup.showTooltips; }
    get showSearch() { return this.mainGroup.showSearch; }
    get details(): DetailsPanelGroupSettings { return this.detailsPanel; }

    groups: Array<FormattingSettingsGroup> = [
        this.mainGroup,
        this.miniTimeline,
        this.topLevelGroup,
        this.detailsPanel
    ];
}

// Backward compatibility type aliases
export type MarkersCardSettings = StyleCardSettings;
export type MiniTimelineCardSettings = MiniTimelineGroupSettings;
export type TopLevelGroupCardSettings = TopLevelGroupGroupSettings;
export type DetailsPanelCardSettings = DetailsPanelGroupSettings;

/**
 * Visual formatting settings model class
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    generalCard = new GeneralCardSettings();
    styleCard = new StyleCardSettings();
    elementsCard = new ElementsCardSettings();
    miscellaneousCard = new MiscellaneousCardSettings();

    // Backward-compatible accessors
    get markersCard(): StyleCardSettings { return this.styleCard; }
    get timelineCard() { return { showFutureEvents: this.elementsCard.showFutureEvents, minZoom: this.generalCard.minZoom }; }
    get groupOrderCard() { return { collapseSubgroupsOnLoad: this.miscellaneousCard.collapseSubgroupsOnLoad }; }
    get miniTimelineCard(): MiniTimelineGroupSettings { return this.elementsCard.miniTimeline; }
    get topBarCard() { return { showSearch: this.elementsCard.showSearch }; }
    get topLevelGroupCard(): TopLevelGroupGroupSettings { return this.elementsCard.topLevelGroup; }
    get detailsPanelCard(): DetailsPanelGroupSettings { return this.elementsCard.detailsPanel; }
    get tooltipsCard() { return { show: this.elementsCard.showTooltips }; }

    cards = [
        this.generalCard,
        this.styleCard,
        this.elementsCard,
        this.miscellaneousCard
    ];
}



