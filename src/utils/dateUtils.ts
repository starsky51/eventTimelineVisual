/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*/
"use strict";

import * as _moment from "moment";
const moment: any = (_moment as any).default || _moment;
moment.suppressDeprecationWarnings = true;

/**
 * Robust date parsing supporting cross-realm Date objects, timestamps, ISO strings,
 * localized formats, and 4-digit year numbers (from Power BI Date Hierarchy).
 */
export function parseDate(val: any): Date | undefined {
    if (val === null || val === undefined || val === '') {
        return undefined;
    }

    // Unwrap object if wrapped with .value
    if (typeof val === 'object' && val !== null && !(val instanceof Date) && 'value' in val) {
        return parseDate((val as any).value);
    }

    // Cross-realm Date or Date instance
    if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
        const d = val as Date;
        if (isNaN(d.getTime())) return undefined;
        return new Date(d.getTime());
    }
    if (typeof val === 'object' && val !== null && typeof (val as any).getTime === 'function') {
        const t = (val as any).getTime();
        return isNaN(t) ? undefined : new Date(t);
    }

    // Number handling
    if (typeof val === 'number') {
        if (isNaN(val)) return undefined;
        // Check for 4-digit Year (e.g. 1900 - 2100) from Power BI Date Hierarchy -> Assume GMT Jan 1
        if (val >= 1900 && val <= 2100 && Number.isInteger(val)) {
            return new Date(val, 0, 1, 0, 0, 0, 0);
        }
        // Epoch seconds vs milliseconds
        const ms = val < 10000000000 ? val * 1000 : val;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? undefined : d;
    }

    // String handling
    if (typeof val === 'string') {
        const trimmed = val.replace(/\u00a0/g, ' ').trim();
        if (!trimmed) return undefined;

        // Check for 4-digit year string -> Assume GMT Jan 1
        if (/^\d{4}$/.test(trimmed)) {
            const y = parseInt(trimmed, 10);
            if (y >= 1900 && y <= 2100) {
                return new Date(y, 0, 1, 0, 0, 0, 0);
            }
        }

        // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD with optional time and optional timezone
        // Examples: "2026-09-21", "2026-09-20T23:00:00.000Z", "2026-09-21 14:30:00", "2026-09-21T14:30:00+02:00"
        const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?)?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?|\b[A-Za-z]+\b))?$/i);
        if (isoMatch) {
            const tz = isoMatch[8];
            if (tz) {
                let normalized = trimmed.replace(/\//g, '-');
                if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:/.test(normalized)) {
                    normalized = normalized.replace(/\s+/, 'T');
                }
                normalized = normalized.replace(/\s*(Z|[+-]\d{2}(?::?\d{2})?)$/i, '$1');
                const nativeD = new Date(normalized);
                if (!isNaN(nativeD.getTime())) {
                    return nativeD;
                }
            }
            const year = parseInt(isoMatch[1], 10);
            const month = parseInt(isoMatch[2], 10) - 1;
            const day = parseInt(isoMatch[3], 10);
            const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
            const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
            const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
            const ms = isoMatch[7] ? Math.round(parseFloat('0.' + isoMatch[7]) * 1000) : 0;
            if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return new Date(year, month, day, hours, minutes, seconds, ms);
            }
        }

        // 2. DD/MM/YYYY or MM/DD/YYYY with 4-digit year (and optional time / timezone)
        // Examples: "21/09/2026", "21-09-2026", "21/09/2026 14:30", "09/21/2026"
        const dmy4Match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?)?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?|\b[A-Za-z]+\b))?$/i);
        if (dmy4Match) {
            const part1 = parseInt(dmy4Match[1], 10);
            const part2 = parseInt(dmy4Match[2], 10);
            const year = parseInt(dmy4Match[3], 10);
            const hours = dmy4Match[4] ? parseInt(dmy4Match[4], 10) : 0;
            const minutes = dmy4Match[5] ? parseInt(dmy4Match[5], 10) : 0;
            const seconds = dmy4Match[6] ? parseInt(dmy4Match[6], 10) : 0;
            const ms = dmy4Match[7] ? Math.round(parseFloat('0.' + dmy4Match[7]) * 1000) : 0;
            const tz = dmy4Match[8];

            let day: number;
            let month: number;
            if (part1 > 12) {
                day = part1;
                month = part2 - 1;
            } else if (part2 > 12) {
                month = part1 - 1;
                day = part2;
            } else {
                day = part1;
                month = part2 - 1;
            }

            if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                if (tz) {
                    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${tz.trim()}`;
                    const nativeD = new Date(isoStr);
                    if (!isNaN(nativeD.getTime())) {
                        return nativeD;
                    }
                }
                return new Date(year, month, day, hours, minutes, seconds, ms);
            }
        }

        // 3. DD/MM/YY or MM/DD/YY with 2-digit year (and optional time / timezone)
        // Examples: "21/09/26", "21-09-26", "21/09/26 14:30", "09/21/26"
        const dmy2Match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?)?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?|\b[A-Za-z]+\b))?$/i);
        if (dmy2Match) {
            const part1 = parseInt(dmy2Match[1], 10);
            const part2 = parseInt(dmy2Match[2], 10);
            const rawY = parseInt(dmy2Match[3], 10);
            const year = rawY >= 69 ? 1900 + rawY : 2000 + rawY;
            const hours = dmy2Match[4] ? parseInt(dmy2Match[4], 10) : 0;
            const minutes = dmy2Match[5] ? parseInt(dmy2Match[5], 10) : 0;
            const seconds = dmy2Match[6] ? parseInt(dmy2Match[6], 10) : 0;
            const ms = dmy2Match[7] ? Math.round(parseFloat('0.' + dmy2Match[7]) * 1000) : 0;
            const tz = dmy2Match[8];

            let day: number;
            let month: number;
            if (part1 > 12) {
                day = part1;
                month = part2 - 1;
            } else if (part2 > 12) {
                month = part1 - 1;
                day = part2;
            } else {
                day = part1;
                month = part2 - 1;
            }

            if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                if (tz) {
                    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${tz.trim()}`;
                    const nativeD = new Date(isoStr);
                    if (!isNaN(nativeD.getTime())) {
                        return nativeD;
                    }
                }
                return new Date(year, month, day, hours, minutes, seconds, ms);
            }
        }

        // 4. Try moment with common formats
        const momentFormats = [
            'D MMM YYYY HH:mm',
            'D MMMM YYYY HH:mm',
            'D MMM YYYY',
            'D MMMM YYYY',
            'MMM D, YYYY HH:mm',
            'MMMM D, YYYY HH:mm',
            'MMM D, YYYY',
            'MMMM D, YYYY'
        ];
        const parsedMoment = moment(trimmed, momentFormats, false);
        if (parsedMoment.isValid()) {
            return parsedMoment.toDate();
        }
        const pz = moment.parseZone(trimmed);
        if (pz.isValid()) {
            return pz.toDate();
        }
        const looseMoment = moment(trimmed);
        if (looseMoment.isValid()) {
            return looseMoment.toDate();
        }
    }

    return undefined;
}

export interface ParsedTime {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

/**
 * Converts text and numeric time values into a valid 24-hour time representation.
 * Supports:
 * - Date objects (extracts time component)
 * - Objects with .value wrapper
 * - Decimal fractions of a day (e.g. 0.5 -> 12:00:00, 0.75 -> 18:00:00 as stored in DAX/Excel)
 * - Decimal hours (e.g. 14.5 -> 14:30:00, 9.25 -> 09:15:00)
 * - Integer hours (e.g. 0-24)
 * - Integer military time (e.g. 930 -> 09:30, 1430 -> 14:30, 2359 -> 23:59)
 * - Integer military time with seconds (e.g. 143000 -> 14:30:00)
 * - Milliseconds since midnight (< 86400000)
 * - Epoch timestamps (>= 86400000)
 * - Time strings in standard formats: "HH:mm", "HH:mm:ss", "HH:mm:ss.SSS", with optional AM/PM
 * - European notation: "14h30", "14h", "14.30"
 * - ISO date/time strings (extracts time portion)
 */
export function parseTime(timeVal: any): ParsedTime | undefined {
    if (timeVal === null || timeVal === undefined || timeVal === '') {
        return undefined;
    }

    // Unwrap object if wrapped with .value
    if (typeof timeVal === 'object' && timeVal !== null && !(timeVal instanceof Date) && 'value' in timeVal) {
        return parseTime((timeVal as any).value);
    }

    // Date instance or cross-realm Date
    if (timeVal instanceof Date || Object.prototype.toString.call(timeVal) === '[object Date]') {
        const d = timeVal as Date;
        if (isNaN(d.getTime())) return undefined;
        return {
            hours: d.getHours(),
            minutes: d.getMinutes(),
            seconds: d.getSeconds(),
            milliseconds: d.getMilliseconds()
        };
    }
    if (typeof timeVal === 'object' && timeVal !== null && typeof (timeVal as any).getTime === 'function' && typeof (timeVal as any).getHours === 'function') {
        const d = timeVal as any;
        if (isNaN(d.getTime())) return undefined;
        return {
            hours: d.getHours(),
            minutes: d.getMinutes(),
            seconds: d.getSeconds(),
            milliseconds: typeof d.getMilliseconds === 'function' ? d.getMilliseconds() : 0
        };
    }

    // Number handling
    if (typeof timeVal === 'number') {
        if (isNaN(timeVal)) return undefined;

        // 1. Fraction of a day: 0 <= val < 1 (Excel / Power BI DAX time storage)
        if (timeVal >= 0 && timeVal < 1) {
            const totalMs = Math.round(timeVal * 86400000);
            const hours = Math.floor(totalMs / 3600000) % 24;
            const minutes = Math.floor((totalMs % 3600000) / 60000);
            const seconds = Math.floor((totalMs % 60000) / 1000);
            const milliseconds = totalMs % 1000;
            return { hours, minutes, seconds, milliseconds };
        }

        // 2. Decimal hours: 1 <= val < 24 and not integer (e.g., 14.5 = 14:30)
        if (timeVal >= 1 && timeVal < 24 && !Number.isInteger(timeVal)) {
            const hours = Math.floor(timeVal);
            const remMin = (timeVal - hours) * 60;
            const minutes = Math.floor(remMin);
            const remSec = (remMin - minutes) * 60;
            const seconds = Math.floor(remSec);
            const milliseconds = Math.round((remSec - seconds) * 1000);
            return { hours: hours % 24, minutes, seconds, milliseconds };
        }

        // 3. Integer hour: 0 <= val <= 24
        if (timeVal >= 0 && timeVal <= 24 && Number.isInteger(timeVal)) {
            return { hours: timeVal % 24, minutes: 0, seconds: 0, milliseconds: 0 };
        }

        // 4. Military time HHmm: 100 <= val <= 2400 (e.g. 930 -> 09:30, 1430 -> 14:30)
        if (timeVal >= 100 && timeVal <= 2400 && Number.isInteger(timeVal)) {
            const hours = Math.floor(timeVal / 100);
            const minutes = timeVal % 100;
            if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59) {
                return { hours: hours % 24, minutes, seconds: 0, milliseconds: 0 };
            }
        }

        // 5. Military time with seconds HHmmss: 10000 <= val <= 240000 (e.g. 143000 -> 14:30:00)
        if (timeVal >= 10000 && timeVal <= 240000 && Number.isInteger(timeVal)) {
            const hours = Math.floor(timeVal / 10000);
            const minutes = Math.floor((timeVal % 10000) / 100);
            const seconds = timeVal % 100;
            if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                return { hours: hours % 24, minutes, seconds, milliseconds: 0 };
            }
        }

        // 6. Milliseconds since midnight: 240000 < val < 86400000
        if (timeVal > 240000 && timeVal < 86400000) {
            const hours = Math.floor(timeVal / 3600000) % 24;
            const minutes = Math.floor((timeVal % 3600000) / 60000);
            const seconds = Math.floor((timeVal % 60000) / 1000);
            const milliseconds = Math.floor(timeVal % 1000);
            return { hours, minutes, seconds, milliseconds };
        }

        // 7. Epoch timestamp: >= 86400000
        if (timeVal >= 86400000) {
            const ms = timeVal < 10000000000 ? timeVal * 1000 : timeVal;
            const d = new Date(ms);
            if (!isNaN(d.getTime())) {
                return {
                    hours: d.getHours(),
                    minutes: d.getMinutes(),
                    seconds: d.getSeconds(),
                    milliseconds: d.getMilliseconds()
                };
            }
        }

        return undefined;
    }

    // String handling
    if (typeof timeVal === 'string') {
        let trimmed = timeVal.replace(/\u00a0/g, ' ').trim();
        if (!trimmed) return undefined;

        // Check if string contains ISO date with 'T' (e.g. "2024-05-15T14:30:00.000Z" or "1899-12-30T14:30:00")
        if (trimmed.includes('T')) {
            const afterT = trimmed.split('T')[1];
            if (afterT) {
                trimmed = afterT.replace(/Z$/i, '').replace(/[+-]\d{2}(?::?\d{2})?$/, '').trim();
            }
        } else {
            // Check if string has leading date like "2024-05-15 14:30:00" or "15/05/2024 14:30:00"
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2 && (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(parts[0]) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(parts[0]))) {
                trimmed = parts.slice(1).join(' ').trim();
            }
        }

        // Check fraction string: e.g. "0.5", ".75", "0.5833"
        if (/^0?\.\d+$/.test(trimmed)) {
            const f = parseFloat(trimmed);
            if (!isNaN(f) && f >= 0 && f < 1) {
                const totalMs = Math.round(f * 86400000);
                const hours = Math.floor(totalMs / 3600000) % 24;
                const minutes = Math.floor((totalMs % 3600000) / 60000);
                const seconds = Math.floor((totalMs % 60000) / 1000);
                const milliseconds = totalMs % 1000;
                return { hours, minutes, seconds, milliseconds };
            }
        }

        // Colon-separated: HH:mm[:ss][.ms] [am/pm]
        const colonMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
        if (colonMatch) {
            let hours = parseInt(colonMatch[1], 10);
            const minutes = parseInt(colonMatch[2], 10);
            const seconds = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
            let milliseconds = 0;
            if (colonMatch[4]) {
                milliseconds = Math.round(parseFloat('0.' + colonMatch[4]) * 1000);
            }
            const ampm = colonMatch[5] ? colonMatch[5].toLowerCase().replace(/\./g, '') : undefined;
            if (ampm === 'pm' && hours < 12) {
                hours += 12;
            } else if (ampm === 'am' && hours === 12) {
                hours = 0;
            }
            if (hours === 24 && minutes === 0 && seconds === 0) {
                hours = 0;
            }
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                return { hours, minutes, seconds, milliseconds };
            }
        }

        // European dot time: e.g. "14.30", "14.30.00", "09.15"
        const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{2})(?:\.(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
        if (dotMatch) {
            let hours = parseInt(dotMatch[1], 10);
            const minutes = parseInt(dotMatch[2], 10);
            const seconds = dotMatch[3] ? parseInt(dotMatch[3], 10) : 0;
            const ampm = dotMatch[4] ? dotMatch[4].toLowerCase().replace(/\./g, '') : undefined;
            if (ampm === 'pm' && hours < 12) {
                hours += 12;
            } else if (ampm === 'am' && hours === 12) {
                hours = 0;
            }
            if (hours === 24 && minutes === 0 && seconds === 0) {
                hours = 0;
            }
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                return { hours, minutes, seconds, milliseconds: 0 };
            }
        }

        // Hour with am/pm (no minutes): e.g. "2pm", "2 pm", "11am", "12 AM"
        const hourAmPmMatch = trimmed.match(/^(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)$/i);
        if (hourAmPmMatch) {
            let hours = parseInt(hourAmPmMatch[1], 10);
            const ampm = hourAmPmMatch[2].toLowerCase().replace(/\./g, '');
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            if (hours >= 0 && hours <= 23) {
                return { hours, minutes: 0, seconds: 0, milliseconds: 0 };
            }
        }

        // European "h" format: e.g. "14h", "14h30", "14h30m"
        const hMatch = trimmed.match(/^(\d{1,2})h(?:(\d{1,2})(?:m)?)?$/i);
        if (hMatch) {
            let hours = parseInt(hMatch[1], 10);
            const minutes = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
            if (hours === 24 && minutes === 0) hours = 0;
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return { hours, minutes, seconds: 0, milliseconds: 0 };
            }
        }

        // Pure digits: e.g. "9", "14", "930", "1430", "143000"
        if (/^\d{1,6}$/.test(trimmed)) {
            if (trimmed.length <= 2) {
                let hours = parseInt(trimmed, 10);
                if (hours >= 0 && hours <= 24) {
                    return { hours: hours % 24, minutes: 0, seconds: 0, milliseconds: 0 };
                }
            } else if (trimmed.length <= 4) {
                let hours = parseInt(trimmed.slice(0, -2), 10);
                const minutes = parseInt(trimmed.slice(-2), 10);
                if (hours === 24 && minutes === 0) hours = 0;
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    return { hours: hours % 24, minutes, seconds: 0, milliseconds: 0 };
                }
            } else {
                let hours = parseInt(trimmed.slice(0, -4), 10);
                const minutes = parseInt(trimmed.slice(-4, -2), 10);
                const seconds = parseInt(trimmed.slice(-2), 10);
                if (hours === 24 && minutes === 0 && seconds === 0) hours = 0;
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                    return { hours: hours % 24, minutes, seconds, milliseconds: 0 };
                }
            }
        }

        // Moment fallback for other string formats
        const parsedMoment = moment(trimmed, [
            'HH:mm:ss',
            'HH:mm',
            'h:mm:ss a',
            'h:mm a',
            'H:mm:ss',
            'H:mm',
            'hh:mm a',
            'hh:mm:ss a'
        ], true);
        if (parsedMoment.isValid()) {
            return {
                hours: parsedMoment.hours(),
                minutes: parsedMoment.minutes(),
                seconds: parsedMoment.seconds(),
                milliseconds: parsedMoment.milliseconds()
            };
        }

        const loose = moment(trimmed);
        if (loose.isValid()) {
            return {
                hours: loose.hours(),
                minutes: loose.minutes(),
                seconds: loose.seconds(),
                milliseconds: loose.milliseconds()
            };
        }
    }

    return undefined;
}

/**
 * Combines a date field and an optional time field according to:
 * 1) If date and time fields are both populated, take the date portion of the date field
 *    and the time portion of the time field and combine them into a single datetime.
 * 2) If date field is populated but time field is not, use the value in the date field
 *    (which could be pure date or datetime).
 */
export function combineDateAndTime(dateVal: any, timeVal: any): Date | undefined {
    const parsedDate = parseDate(dateVal);
    if (!parsedDate) {
        return undefined;
    }

    if (timeVal === null || timeVal === undefined || timeVal === '') {
        return parsedDate;
    }

    const parsedTime = parseTime(timeVal);
    if (!parsedTime) {
        return parsedDate;
    }

    return new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        parsedTime.hours,
        parsedTime.minutes,
        parsedTime.seconds,
        parsedTime.milliseconds
    );
}

export function formatEventDate(start: any, end?: any): string {
    if (!start) return '';
    const startD = parseDate(start);
    if (!startD || isNaN(startD.getTime())) return '';
    const startStr = moment(startD).format('DD/MM/YYYY HH:mm');
    if (!end) return startStr;
    const endD = parseDate(end);
    if (!endD || isNaN(endD.getTime()) || startD.getTime() === endD.getTime()) {
        return startStr;
    }
    let endStr = moment(endD).format('DD/MM/YYYY HH:mm');
    if (moment(startD).isSame(moment(endD), 'day')) {
       endStr = moment(endD).format('HH:mm');
    }
    return `${startStr} - ${endStr}`;
}

export function isDateColumn(col: any): boolean {
    if (!col) return false;
    if (col.type) {
        if (col.type.dateTime || (col.type as any).underlyingType === 519) {
            return true;
        }
        if (typeof col.type === 'object') {
            for (const k of Object.keys(col.type)) {
                if (k.toLowerCase().includes('date') && (col.type as any)[k]) return true;
            }
        }
    }
    const colTypeStr = String(col.type || '').toLowerCase();
    if (colTypeStr.includes('date') || colTypeStr.includes('time')) {
        return true;
    }
    const formatStr = String(col.format || '').toLowerCase();
    if (formatStr && (formatStr.includes('yy') || formatStr.includes('yyyy') || (formatStr.includes('mm') && formatStr.includes('dd')))) {
        return true;
    }
    const colName = (col.displayName || col.queryName || '').toLowerCase();
    if (/\b(date|time|timestamp)\b/i.test(colName) || colName.endsWith('date') || colName.endsWith('time')) {
        return true;
    }
    return false;
}

/**
 * Formats a date value into "dd MMM yyyy" format (e.g. "05 Jan 2023").
 * Assumes GMT unless an explicit time zone is specified.
 */
export function formatDateAsDDMMMYYYY(val: any): string {
    if (val === null || val === undefined || String(val).trim().length === 0) {
        return '(Blank)';
    }
    const d = parseDate(val);
    if (d && !isNaN(d.getTime())) {
        return moment(d).format('DD MMM YYYY');
    }
    return String(val).trim();
}
