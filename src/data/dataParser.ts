/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { ActiveSortInfo, GroupDateStats } from "../types";

export function computeDataSignature(
    rows: any[],
    columns: any[],
    topLevelGroup: string | null,
    metadataColumns?: any[]
): string {
    if (!rows || rows.length === 0) return 'empty';
    const len = rows.length;
    const colLen = columns ? columns.length : 0;
    const sortSig1 = Array.isArray(columns)
        ? columns.map((c: any, i: number) => (c && c.sort !== undefined ? `${i}:${c.sort}` : '')).filter(Boolean).join(',')
        : '';
    const sortSig2 = Array.isArray(metadataColumns)
        ? metadataColumns.map((c: any, i: number) => (c && c.sort !== undefined ? `${c.queryName || i}:${c.sort}` : '')).filter(Boolean).join(',')
        : '';
    const sortSig = `${sortSig1}|${sortSig2}`;

    let sampleStr = '';
    if (len <= 150) {
        sampleStr = rows.map(r => Array.isArray(r) ? r.slice(0, 6).map(v => (v instanceof Date ? v.getTime() : String(v))).join('|') : String(r)).join(';');
    } else {
        const step = Math.floor(len / 20);
        const parts: string[] = [];
        for (let i = 0; i < len; i += step) {
            const r = rows[i];
            parts.push(Array.isArray(r) ? r.slice(0, 6).map(v => (v instanceof Date ? v.getTime() : String(v))).join('|') : String(r));
        }
        const lastRow = rows[len - 1];
        parts.push(Array.isArray(lastRow) ? lastRow.slice(0, 6).map((v: any) => (v instanceof Date ? v.getTime() : String(v))).join('|') : String(lastRow));
        sampleStr = parts.join(';');
    }
    return `${topLevelGroup ?? ''}::${colLen}::${len}::sort:${sortSig}::${sampleStr}`;
}

export function getActiveSortInfo(
    columns: powerbi.DataViewMetadataColumn[],
    colMap?: { [key: string]: number }
): ActiveSortInfo | null {
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
        return null;
    }

    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col && col.sort !== undefined && col.sort !== null) {
            let role: string | null = null;
            if (col.roles) {
                if (col.roles['groupOrder']) role = 'groupOrder';
                else if (col.roles['group'] || col.roles['subgroup']) role = 'group';
                else if (col.roles['startDate']) role = 'startDate';
                else if (col.roles['startTime']) role = 'startTime';
                else if (col.roles['endDate']) role = 'endDate';
                else if (col.roles['endTime']) role = 'endTime';
                else if (col.roles['topLevelGroup']) role = 'topLevelGroup';
                else if (col.roles['eventType']) role = 'eventType';
                else if (col.roles['content'] || col.roles['description']) role = 'content';
                else if (col.roles['color']) role = 'color';
                else if (col.roles['groupColor']) role = 'groupColor';
                else if (col.roles['eventClass'] || col.roles['additionalClass']) role = 'eventClass';
                else {
                    const firstRole = Object.keys(col.roles)[0];
                    if (firstRole) role = firstRole;
                }
            }

            if (!role && colMap) {
                for (const [r, idx] of Object.entries(colMap)) {
                    if (idx === i) {
                        role = r;
                        break;
                    }
                }
            }

            if (!role) {
                const colName = (col.displayName || col.queryName || '').toLowerCase().replace(/[\s_-]/g, '');
                if (colName.includes('grouporder') || colName.includes('order')) role = 'groupOrder';
                else if (colName.includes('group') || colName.includes('subgroup')) role = 'group';
                else if (colName.includes('startdate') || colName.includes('start')) role = 'startDate';
                else if (colName.includes('enddate') || colName.includes('end')) role = 'endDate';
            }

            return {
                role,
                direction: col.sort,
                column: col,
                columnIndex: i
            };
        }
    }

    return null;
}

export function hasExternalHighlights(
    table: any,
    columns: powerbi.DataViewMetadataColumn[],
    categoricalValues: any[]
): boolean {
    const tableHighlights = table?.highlights;
    if (Array.isArray(tableHighlights) && tableHighlights.length > 0) {
        if (tableHighlights.some((h: any) => Array.isArray(h) ? h.some((cell: any) => cell !== null && cell !== undefined) : (h !== null && h !== undefined))) {
            return true;
        }
    }
    if (columns && Array.isArray(columns)) {
        if (columns.some((col: any) => Array.isArray(col.highlights) && col.highlights.some((h: any) => h !== null && h !== undefined))) {
            return true;
        }
    }
    if (Array.isArray(categoricalValues)) {
        if (categoricalValues.some((v: any) => Array.isArray(v.highlights) && v.highlights.some((h: any) => h !== null && h !== undefined))) {
            return true;
        }
    }
    return false;
}

export function isRowExternallyHighlighted(
    rowIndex: number,
    tableHighlights: any,
    columns: powerbi.DataViewMetadataColumn[],
    categoricalValues: any[]
): boolean {
    if (Array.isArray(tableHighlights)) {
        const rowH = tableHighlights[rowIndex];
        if (Array.isArray(rowH)) {
            if (rowH.some((cell: any) => cell !== null && cell !== undefined)) return true;
        } else if (rowH !== null && rowH !== undefined) {
            return true;
        }
    }
    if (Array.isArray(columns) && columns.some((c: any) => Array.isArray(c.highlights) && c.highlights[rowIndex] !== null && c.highlights[rowIndex] !== undefined)) {
        return true;
    }
    if (Array.isArray(categoricalValues) && categoricalValues.some((v: any) => Array.isArray(v.highlights) && v.highlights[rowIndex] !== null && v.highlights[rowIndex] !== undefined)) {
        return true;
    }
    return false;
}

export function sortGroups(
    groups: any[],
    hasGroupOrderField: boolean = false,
    activeSort?: ActiveSortInfo | null,
    groupDateStats?: Map<string, GroupDateStats>
): void {
    // Separate top-level groups and nested subgroups
    const topLevelGroups: any[] = [];
    const subgroupMap = new Map<string, any[]>(); // parentId -> child groups

    groups.forEach(g => {
        if (g.nestedInGroup) {
            const parentId = String(g.nestedInGroup);
            if (!subgroupMap.has(parentId)) {
                subgroupMap.set(parentId, []);
            }
            subgroupMap.get(parentId)!.push(g);
        } else {
            topLevelGroups.push(g);
        }
    });

    const isDesc = activeSort ? activeSort.direction === 2 : false;
    const sortRole = activeSort?.role ?? null;

    const groupComparator = (a: any, b: any): number => {
        const idA = String(a.id);
        const idB = String(b.id);
        const statsA = groupDateStats?.get(idA);
        const statsB = groupDateStats?.get(idB);

        if (sortRole === 'groupOrder') {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) {
                return isDesc ? orderB - orderA : orderA - orderB;
            }
            return isDesc
                ? String(b.content || b.id).localeCompare(String(a.content || a.id))
                : String(a.content || a.id).localeCompare(String(b.content || b.id));
        }

        if (sortRole === 'group' || sortRole === 'subgroup') {
            const nameA = String(a.content || a.id);
            const nameB = String(b.content || b.id);
            const comp = nameA.localeCompare(nameB);
            if (comp !== 0) {
                return isDesc ? -comp : comp;
            }
            return (statsA?.firstRowIndex ?? 0) - (statsB?.firstRowIndex ?? 0);
        }

        if (sortRole === 'startDate' || sortRole === 'startTime') {
            if (isDesc) {
                const valA = statsA?.maxStartDate ?? -Infinity;
                const valB = statsB?.maxStartDate ?? -Infinity;
                if (valA !== valB) return valB - valA;
                const minA = statsA?.minStartDate ?? -Infinity;
                const minB = statsB?.minStartDate ?? -Infinity;
                if (minA !== minB) return minB - minA;
            } else {
                const valA = statsA?.minStartDate ?? Infinity;
                const valB = statsB?.minStartDate ?? Infinity;
                if (valA !== valB) return valA - valB;
                const maxA = statsA?.maxStartDate ?? Infinity;
                const maxB = statsB?.maxStartDate ?? Infinity;
                if (maxA !== maxB) return maxA - maxB;
            }
            return (statsA?.firstRowIndex ?? 0) - (statsB?.firstRowIndex ?? 0);
        }

        if (sortRole === 'endDate' || sortRole === 'endTime') {
            if (isDesc) {
                const valA = statsA?.maxEndDate ?? (statsA?.maxStartDate ?? -Infinity);
                const valB = statsB?.maxEndDate ?? (statsB?.maxStartDate ?? -Infinity);
                if (valA !== valB) return valB - valA;
            } else {
                const valA = statsA?.minEndDate ?? (statsA?.minStartDate ?? Infinity);
                const valB = statsB?.minEndDate ?? (statsB?.minStartDate ?? Infinity);
                if (valA !== valB) return valA - valB;
            }
            return (statsA?.firstRowIndex ?? 0) - (statsB?.firstRowIndex ?? 0);
        }

        // If no explicit sort role from user, but hasGroupOrderField is present
        if (hasGroupOrderField && !sortRole) {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return String(a.content || a.id).localeCompare(String(b.content || b.id));
        }

        // Default / fallback: encounter order from rows (Power BI table rows order)
        const idxA = statsA?.firstRowIndex ?? 0;
        const idxB = statsB?.firstRowIndex ?? 0;
        if (idxA !== idxB) {
            return idxA - idxB;
        }
        return String(a.content || a.id).localeCompare(String(b.content || b.id));
    };

    topLevelGroups.sort(groupComparator);

    // Rebuild groups array in hierarchical order
    groups.length = 0;
    let globalOrder = 0;

    topLevelGroups.forEach(parent => {
        parent.order = globalOrder++;
        groups.push(parent);

        const children = subgroupMap.get(String(parent.id));
        if (children && children.length > 0) {
            children.sort(groupComparator);

            parent.nestedGroups = children.map(c => c.id);

            children.forEach(child => {
                child.order = globalOrder++;
                groups.push(child);
            });
        } else {
            delete parent.nestedGroups;
            delete parent.showNested;
        }
    });
}
