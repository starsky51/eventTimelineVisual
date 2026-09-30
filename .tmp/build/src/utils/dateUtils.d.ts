/**
 * Robust date parsing supporting cross-realm Date objects, timestamps, ISO strings,
 * localized formats, and 4-digit year numbers (from Power BI Date Hierarchy).
 */
export declare function parseDate(val: any): Date | undefined;
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
export declare function parseTime(timeVal: any): ParsedTime | undefined;
/**
 * Combines a date field and an optional time field according to:
 * 1) If date and time fields are both populated, take the date portion of the date field
 *    and the time portion of the time field and combine them into a single datetime.
 * 2) If date field is populated but time field is not, use the value in the date field
 *    (which could be pure date or datetime).
 */
export declare function combineDateAndTime(dateVal: any, timeVal: any): Date | undefined;
export declare function formatEventDate(start: any, end?: any, isOngoing?: boolean): string;
export declare function isDateColumn(col: any): boolean;
/**
 * Formats a date value into "dd MMM yyyy HH:mm" format (e.g. "05 Jan 2023 14:30").
 */
export declare function formatDateAsDDMMMYYYY(val: any): string;
