/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { ColumnRolesResult } from "../types";

export function resolveColumnRoles(
    columns: powerbi.DataViewMetadataColumn[],
    options: VisualUpdateOptions
): ColumnRolesResult {
    const colMap: { [key: string]: number } = {};
    const contentIndices: number[] = [];
    const calculationFieldIndices: number[] = [];
    if (!columns || !Array.isArray(columns)) {
        return { colMap, contentIndices, calculationFieldIndices };
    }

    const groupIndices: number[] = [];
    columns.forEach((col: any, index: number) => {
        if (col && col.roles) {
            Object.keys(col.roles).forEach((role: string) => {
                if (role === 'calculationFields' || role === 'calculationField') {
                    if (!calculationFieldIndices.includes(index)) {
                        calculationFieldIndices.push(index);
                    }
                } else if (role === 'content' || role === 'description') {
                    if (!contentIndices.includes(index)) {
                        contentIndices.push(index);
                    }
                } else if (role === 'group' || role === 'subgroup') {
                    if (!groupIndices.includes(index)) {
                        groupIndices.push(index);
                    }
                } else {
                    colMap[role] = index;
                }
            });
        }
    });

    const findCol = (...names: string[]) => {
        return columns.findIndex((c: any) => {
            const colName = (c.displayName || c.queryName || '').toLowerCase().replace(/[\s_-]/g, '');
            return names.some(n => colName === n.toLowerCase().replace(/[\s_-]/g, ''));
        });
    };

    if (colMap['topLevelGroup'] === undefined) {
        const idx = findCol('topLevelGroup', 'toplevelgroup', 'topGroup', 'parentGroup', 'mainFilter', 'filterGroup');
        if (idx !== -1) colMap['topLevelGroup'] = idx;
    }
    if (colMap['startDate'] === undefined) {
        const idx = findCol('startDate', 'startdate', 'dateStart', 'datestart', 'start', 'startDateTime', 'startdatetime', 'from', 'datefrom', 'fromdate', 'beginning');
        if (idx !== -1) colMap['startDate'] = idx;
    }
    if (colMap['startTime'] === undefined) {
        const idx = findCol('startTime', 'starttime', 'timeStart', 'timestart', 'timeFrom', 'fromTime', 'startT', 'time');
        if (idx !== -1) colMap['startTime'] = idx;
    }
    if (colMap['endDate'] === undefined) {
        const idx = findCol('endDate', 'enddate', 'dateEnd', 'dateend', 'end', 'endDateTime', 'enddatetime', 'to', 'dateto', 'todate', 'finish', 'finishdate', 'expiry', 'expirydate', 'complete', 'completedate');
        if (idx !== -1) colMap['endDate'] = idx;
    }
    if (colMap['endTime'] === undefined) {
        const idx = findCol('endTime', 'endtime', 'timeEnd', 'timeend', 'timeTo', 'toTime', 'endT');
        if (idx !== -1) colMap['endTime'] = idx;
    }

    if (colMap['eventType'] === undefined) {
        const idx = findCol('eventType', 'type', 'event');
        if (idx !== -1) colMap['eventType'] = idx;
    }
    if (contentIndices.length === 0) {
        if (colMap['content'] !== undefined) {
            contentIndices.push(colMap['content']);
        } else {
            columns.forEach((c: any, index: number) => {
                const colName = (c.displayName || c.queryName || '').toLowerCase().replace(/[\s_-]/g, '');
                if (['description', 'content', 'details', 'text'].some(n => colName === n)) {
                    if (!contentIndices.includes(index) && !calculationFieldIndices.includes(index)) {
                        contentIndices.push(index);
                    }
                }
            });
            if (contentIndices.length > 0) {
                colMap['content'] = contentIndices[0];
            }
        }
    }

    const metadataColumns = (options.dataViews[0] && options.dataViews[0].metadata && Array.isArray(options.dataViews[0].metadata.columns))
        ? options.dataViews[0].metadata.columns
        : [];

    const getRoleOrderForCol = (colIdx: number, roleName: string = 'content'): number | undefined => {
        const col = columns[colIdx];
        if (!col) return undefined;

        const extractRoleIdx = (target: any): number | undefined => {
            if (!target || typeof target !== 'object') return undefined;
            const rIndex = target.rolesIndex || target.rolesIndices || target.roleIndex;
            if (rIndex && typeof rIndex === 'object') {
                for (const k of Object.keys(rIndex)) {
                    const lk = k.toLowerCase();
                    if (roleName === 'content' && (lk === 'content' || lk === 'description')) {
                        const v = rIndex[k];
                        if (Array.isArray(v) && v.length > 0) {
                            const parsed = Number(v[0]);
                            if (!isNaN(parsed)) return parsed;
                        } else if (typeof v === 'number' && !isNaN(v)) {
                            return v;
                        } else if (typeof v === 'string') {
                            const parsed = Number(v);
                            if (!isNaN(parsed)) return parsed;
                        }
                    } else if (roleName === 'group' && (lk === 'group' || lk === 'subgroup')) {
                        const v = rIndex[k];
                        if (Array.isArray(v) && v.length > 0) {
                            const parsed = Number(v[0]);
                            if (!isNaN(parsed)) return parsed;
                        } else if (typeof v === 'number' && !isNaN(v)) {
                            return v;
                        } else if (typeof v === 'string') {
                            const parsed = Number(v);
                            if (!isNaN(parsed)) return parsed;
                        }
                    }
                }
            }
            return undefined;
        };

        let order = extractRoleIdx(col);
        if (order !== undefined) return order;

        if (metadataColumns.length > 0) {
            let metaCol = metadataColumns.find((m: any) => m === col);
            if (!metaCol && col.queryName) {
                metaCol = metadataColumns.find((m: any) => m.queryName === col.queryName);
            }
            if (!metaCol && col.displayName) {
                metaCol = metadataColumns.find((m: any) => m.displayName === col.displayName);
            }
            if (!metaCol && typeof col.index === 'number') {
                metaCol = metadataColumns.find((m: any) => m.index === col.index);
            }
            if (!metaCol && metadataColumns[colIdx]) {
                metaCol = metadataColumns[colIdx];
            }

            if (metaCol) {
                order = extractRoleIdx(metaCol);
                if (order !== undefined) return order;
            }
        }

        return undefined;
    };

    const getMetadataColumnIndex = (colIdx: number): number => {
        const col = columns[colIdx];
        if (!col || metadataColumns.length === 0) return colIdx;

        let metaIdx = metadataColumns.findIndex((m: any) => m === col);
        if (metaIdx === -1 && col.queryName) {
            metaIdx = metadataColumns.findIndex((m: any) => m.queryName === col.queryName);
        }
        if (metaIdx === -1 && col.displayName) {
            metaIdx = metadataColumns.findIndex((m: any) => m.displayName === col.displayName);
        }
        if (metaIdx === -1 && typeof col.index === 'number') {
            metaIdx = metadataColumns.findIndex((m: any) => m.index === col.index);
        }
        return metaIdx !== -1 ? metaIdx : colIdx;
    };

    if (contentIndices.length > 1) {
        contentIndices.sort((a, b) => {
            const orderA = getRoleOrderForCol(a);
            const orderB = getRoleOrderForCol(b);

            if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
            }
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;

            const metaIdxA = getMetadataColumnIndex(a);
            const metaIdxB = getMetadataColumnIndex(b);
            if (metaIdxA !== metaIdxB) {
                return metaIdxA - metaIdxB;
            }

            return a - b;
        });
    }

    if (contentIndices.length > 0) {
        colMap['content'] = contentIndices[0];
    }

    if (groupIndices.length > 1) {
        groupIndices.sort((a, b) => {
            const orderA = getRoleOrderForCol(a, 'group');
            const orderB = getRoleOrderForCol(b, 'group');

            if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
            }
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;

            const metaIdxA = getMetadataColumnIndex(a);
            const metaIdxB = getMetadataColumnIndex(b);
            if (metaIdxA !== metaIdxB) {
                return metaIdxA - metaIdxB;
            }

            return a - b;
        });
    }

    if (groupIndices.length > 0) {
        colMap['group'] = groupIndices[0];
        if (groupIndices.length > 1) {
            colMap['subgroup'] = groupIndices[1];
        }
    }

    if (colMap['group'] === undefined) {
        const idx = findCol('group', 'category');
        if (idx !== -1) colMap['group'] = idx;
    }
    if (colMap['subgroup'] === undefined) {
        const idx = findCol('subgroup', 'subGroup', 'subCategory', 'sub_group', 'subCat', 'sub_category');
        if (idx !== -1 && idx !== colMap['group']) colMap['subgroup'] = idx;
    }

    if (colMap['color'] === undefined) {
        const idx = findCol('color', 'colour', 'eventColor', 'eventColour');
        if (idx !== -1) colMap['color'] = idx;
    }
    if (colMap['groupColor'] === undefined) {
        const idx = findCol('groupColor', 'groupColour');
        if (idx !== -1) colMap['groupColor'] = idx;
    }
    if (colMap['groupOrder'] === undefined) {
        const idx = findCol('groupOrder', 'order');
        if (idx !== -1) colMap['groupOrder'] = idx;
    }
    if (colMap['eventClass'] === undefined) {
        const idx = findCol('eventClass', 'eventclass', 'class', 'className', 'classname', 'additionalClass', 'additionalclass');
        if (idx !== -1) colMap['eventClass'] = idx;
    }

    return { colMap, contentIndices, calculationFieldIndices };
}
