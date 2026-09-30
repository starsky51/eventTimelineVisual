import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsGroup = formattingSettings.Group;
import FormattingSettingsCompositeCard = formattingSettings.CompositeCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
/**
 * General Formatting Card
 */
declare class GeneralCardSettings extends FormattingSettingsCard {
    fontFamily: formattingSettings.FontPicker;
    fontSize: formattingSettings.NumUpDown;
    markerHeight: formattingSettings.NumUpDown;
    minZoom: formattingSettings.AutoDropdown;
    keepRangeMarkers: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Style Formatting Card (formerly Markers)
 */
declare class StyleCardSettings extends FormattingSettingsCard {
    colorTheme: formattingSettings.AutoDropdown;
    colorLevel: formattingSettings.AutoDropdown;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Miscellaneous Formatting Card
 */
export declare class MiscellaneousCardSettings extends FormattingSettingsCard {
    collapseSubgroupsOnLoad: formattingSettings.ToggleSwitch;
    crossFilter: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Main Elements Formatting Group (for top-level elements options)
 */
export declare class MainElementsGroupSettings extends FormattingSettingsGroup {
    constructor();
    showFutureEvents: formattingSettings.ToggleSwitch;
    showTooltips: formattingSettings.ToggleSwitch;
    showSearch: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string | undefined;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Mini Timeline Formatting Group
 */
export declare class MiniTimelineGroupSettings extends FormattingSettingsGroup {
    constructor();
    show: formattingSettings.ToggleSwitch;
    topLevelSlice: formattingSettings.ToggleSwitch;
    height: formattingSettings.NumUpDown;
    name: string;
    displayName: string;
    collapsible: boolean;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Top Level Group Formatting Group
 */
export declare class TopLevelGroupGroupSettings extends FormattingSettingsGroup {
    constructor();
    show: formattingSettings.ToggleSwitch;
    topLevelSlice: formattingSettings.ToggleSwitch;
    maxDistinctItems: formattingSettings.NumUpDown;
    overflowMessage: formattingSettings.TextInput;
    name: string;
    displayName: string;
    collapsible: boolean;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Details Panel Formatting Group
 */
export declare class DetailsPanelGroupSettings extends FormattingSettingsGroup {
    constructor();
    show: formattingSettings.ToggleSwitch;
    topLevelSlice: formattingSettings.ToggleSwitch;
    initialWidth: formattingSettings.NumUpDown;
    emptyMessage: formattingSettings.TextInput;
    showFieldNames: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string;
    collapsible: boolean;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Elements Parent Formatting Card
 */
export declare class ElementsCardSettings extends FormattingSettingsCompositeCard {
    name: string;
    displayName: string;
    mainGroup: MainElementsGroupSettings;
    miniTimeline: MiniTimelineGroupSettings;
    topLevelGroup: TopLevelGroupGroupSettings;
    detailsPanel: DetailsPanelGroupSettings;
    get showFutureEvents(): formattingSettings.ToggleSwitch;
    get showTooltips(): formattingSettings.ToggleSwitch;
    get showSearch(): formattingSettings.ToggleSwitch;
    get details(): DetailsPanelGroupSettings;
    groups: Array<FormattingSettingsGroup>;
}
export type MarkersCardSettings = StyleCardSettings;
export type MiniTimelineCardSettings = MiniTimelineGroupSettings;
export type TopLevelGroupCardSettings = TopLevelGroupGroupSettings;
export type DetailsPanelCardSettings = DetailsPanelGroupSettings;
/**
 * Visual formatting settings model class
 */
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    generalCard: GeneralCardSettings;
    styleCard: StyleCardSettings;
    elementsCard: ElementsCardSettings;
    miscellaneousCard: MiscellaneousCardSettings;
    get markersCard(): StyleCardSettings;
    get timelineCard(): {
        showFutureEvents: formattingSettings.ToggleSwitch;
        minZoom: formattingSettings.AutoDropdown;
    };
    get groupOrderCard(): {
        collapseSubgroupsOnLoad: formattingSettings.ToggleSwitch;
    };
    get miniTimelineCard(): MiniTimelineGroupSettings;
    get topBarCard(): {
        showSearch: formattingSettings.ToggleSwitch;
    };
    get topLevelGroupCard(): TopLevelGroupGroupSettings;
    get detailsPanelCard(): DetailsPanelGroupSettings;
    get tooltipsCard(): {
        show: formattingSettings.ToggleSwitch;
    };
    cards: (GeneralCardSettings | StyleCardSettings | ElementsCardSettings | MiscellaneousCardSettings)[];
}
export {};
