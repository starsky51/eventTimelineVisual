import powerbi from "powerbi-visuals-api";
import { ActiveSortInfo, GroupDateStats } from "../types";
export declare function computeDataSignature(rows: any[], columns: any[], topLevelGroup: string | null, metadataColumns?: any[]): string;
export declare function getActiveSortInfo(columns: powerbi.DataViewMetadataColumn[], colMap?: {
    [key: string]: number;
}): ActiveSortInfo | null;
export declare function hasExternalHighlights(table: any, columns: powerbi.DataViewMetadataColumn[], categoricalValues: any[]): boolean;
export declare function isRowExternallyHighlighted(rowIndex: number, tableHighlights: any, columns: powerbi.DataViewMetadataColumn[], categoricalValues: any[]): boolean;
export declare function sortGroups(groups: any[], hasGroupOrderField?: boolean, activeSort?: ActiveSortInfo | null, groupDateStats?: Map<string, GroupDateStats>): void;
