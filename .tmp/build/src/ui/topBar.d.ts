import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { FontSettings, OrderByOption, OrderDirectionOption } from "../types";
export interface TopBarUpdateOptions {
    currentGroup: string;
    distinctGroups: string[];
    fieldName?: string;
    isDateField?: boolean;
    visualInstanceId: string;
    allowInteractions: boolean;
    host: IVisualHost;
    currentOrderBy?: OrderByOption;
    currentOrderDirection?: OrderDirectionOption;
    showGroupOrder?: boolean;
    showSearch: boolean;
    searchTerm: string;
    hasSubgroups?: boolean;
    collapseTitle?: string;
    expandTitle?: string;
    getFontSettings: (cardName: string, objectName: string) => FontSettings;
    onGroupChange: (newGroup: string) => void;
    onOrderByChange?: (orderBy: OrderByOption) => void;
    onOrderDirectionChange?: (dir: OrderDirectionOption) => void;
    onSearchInput: (term: string) => void;
    onSearchSubmit: (term: string) => void;
    onSearchClear: () => void;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
}
export declare class TopBarManager {
    topBar: HTMLElement;
    searchInputEl: HTMLInputElement | null;
    searchClearBtn: HTMLButtonElement | null;
    private container;
    constructor(container: HTMLElement);
    renderTopBarGroupSelector(currentGroup: string, distinctGroups: string[], fieldName: string, visualInstanceId: string, allowInteractions: boolean, getFontSettings: (cardName: string, objectName: string) => FontSettings, onGroupChange: (newGroup: string) => void, isDateField?: boolean): HTMLElement | null;
    renderTopBarGroupOrderSection(currentOrderBy: OrderByOption, currentOrderDirection: OrderDirectionOption, allowInteractions: boolean, host: IVisualHost, onOrderByChange: (orderBy: OrderByOption) => void, onOrderDirectionChange: (dir: OrderDirectionOption) => void): HTMLElement;
    renderTopBarSearchSection(searchTerm: string, onSearchInput: (term: string) => void, onSearchSubmit: (term: string) => void, onSearchClear: () => void): HTMLElement;
    clearTextSearch(onClear?: () => void): void;
    renderTopBarSubgroupControls(onCollapseAll?: () => void, onExpandAll?: () => void, allowInteractions?: boolean, collapseTitle?: string, expandTitle?: string): HTMLElement;
    updateTopBar(opts: TopBarUpdateOptions): void;
}
