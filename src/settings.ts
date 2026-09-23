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
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Timeline & X-Axis Formatting Card
 */
class TimelineCardSettings extends FormattingSettingsCard {
    showFutureEvents = new formattingSettings.ToggleSwitch({
        name: "showFutureEvents",
        displayName: "Future events",
        value: true
    });

    minZoom = new formattingSettings.AutoDropdown({
        name: "minZoom",
        displayName: "Minimum Zoom Level",
        value: "day"
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "X-Axis Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 11,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    name: string = "timeline";
    displayName: string = "Timeline";
    slices: Array<FormattingSettingsSlice> = [this.showFutureEvents, this.minZoom, this.font];
}

/**
 * Markers Formatting Card
 */
class MarkersCardSettings extends FormattingSettingsCard {
    colorTheme = new formattingSettings.AutoDropdown({
        name: "colorTheme",
        displayName: "Color Theme",
        value: "standard"
    });

    colorLevel = new formattingSettings.AutoDropdown({
        name: "colorLevel",
        displayName: "Color Level",
        value: "eventType"
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
                value: 80
            }
        }
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Padding",
        value: 6,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 50
            }
        }
    });

    crossFilter = new formattingSettings.ToggleSwitch({
        name: "crossFilter",
        displayName: "Cross-filter other visuals",
        value: false
    });

    keepRangeMarkers = new formattingSettings.ToggleSwitch({
        name: "keepRangeMarkers",
        displayName: "Keep vis-range markers",
        value: false
    });

    name: string = "markers";
    displayName: string = "Markers";
    slices: Array<FormattingSettingsSlice> = [this.colorTheme, this.colorLevel, this.markerHeight, this.padding, this.crossFilter, this.keepRangeMarkers];
}

/**
 * Groups Formatting Card
 */
class GroupOrderCardSettings extends FormattingSettingsCard {
    collapseSubgroupsOnLoad = new formattingSettings.ToggleSwitch({
        name: "collapseSubgroupsOnLoad",
        displayName: "Collapse subgroups on load",
        value: true
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Group Header Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 11,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    name: string = "groupOrderCard";
    displayName: string = "Groups";
    slices: Array<FormattingSettingsSlice> = [this.collapseSubgroupsOnLoad, this.font];
}

/**
 * Mini Timeline Formatting Card
 */
class MiniTimelineCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        value: true
    });

    height = new formattingSettings.NumUpDown({
        name: "height",
        displayName: "Size",
        value: 90,
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

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Axis Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 10,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    name: string = "miniTimeline";
    displayName: string = "Mini Timeline";
    slices: Array<FormattingSettingsSlice> = [this.show, this.height, this.font];
}

/**
 * Top Bar Formatting Card
 */
class TopBarCardSettings extends FormattingSettingsCard {
    showSearch = new formattingSettings.ToggleSwitch({
        name: "showSearch",
        displayName: "Show Text Search",
        value: true
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Padding",
        value: 0,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 50
            }
        }
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Toolbar Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 11,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    name: string = "topBar";
    displayName: string = "Toolbar";
    slices: Array<FormattingSettingsSlice> = [this.showSearch, this.padding, this.font];
}

/**
 * Details Panel Formatting Card
 */
class DetailsPanelCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        value: true
    });

    initialWidth = new formattingSettings.NumUpDown({
        name: "initialWidth",
        displayName: "Initial Width",
        value: 240,
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

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Padding",
        value: 10,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 50
            }
        }
    });

    headerFont = new formattingSettings.FontControl({
        name: "headerFont",
        displayName: "Header Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "headerFontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "headerFontSize",
            displayName: "Font Size",
            value: 12,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Details Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 12,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
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
        value: false
    });

    name: string = "detailsPanel";
    displayName: string = "Details";
    slices: Array<FormattingSettingsSlice> = [this.show, this.initialWidth, this.padding, this.headerFont, this.font, this.emptyMessage, this.showFieldNames];
}

/**
 * Tooltips Formatting Card
 */
class TooltipsCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Tooltips",
        value: true
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Tooltip Font",
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Font Family",
            value: "Segoe UI, sans-serif"
        }),
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Font Size",
            value: 12,
            options: {
                minValue: {
                    type: powerbi.visuals.ValidatorType.Min,
                    value: 6
                },
                maxValue: {
                    type: powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        })
    });

    name: string = "tooltips";
    displayName: string = "Tooltips";
    slices: Array<FormattingSettingsSlice> = [this.show, this.font];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    timelineCard = new TimelineCardSettings();
    markersCard = new MarkersCardSettings();
    groupOrderCard = new GroupOrderCardSettings();
    miniTimelineCard = new MiniTimelineCardSettings();
    topBarCard = new TopBarCardSettings();
    detailsPanelCard = new DetailsPanelCardSettings();
    tooltipsCard = new TooltipsCardSettings();
    cards = [this.timelineCard, this.markersCard, this.groupOrderCard, this.miniTimelineCard, this.topBarCard, this.detailsPanelCard, this.tooltipsCard];
}


