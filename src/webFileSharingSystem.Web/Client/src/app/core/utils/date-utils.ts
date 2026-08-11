import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

export const DateUtils = {
  dateToStruct,
  structToDate,
  structToIsoString,
  areDatesEqual,
  addDays,
  addHours,
  formatDateToYMD,
};

/**
 * Converts a native JavaScript Date to NgbDateStruct.
 */
export function dateToStruct(date: Date): NgbDateStruct {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * Converts an NgbDateStruct to a native JavaScript Date.
 */
export function structToDate(struct: NgbDateStruct): Date {
  const newDate = new Date(Date.UTC(struct.year, struct.month - 1, struct.day));
  return newDate;
}

/**
 * Converts an NgbDateStruct to a ISO formatted string.
 */
export function structToIsoString(struct: NgbDateStruct): string {
  return structToDate(struct).toISOString().split('T')[0];
}

/**
 * Checks if two dates are equal.
 */
export function areDatesEqual(date1: Date, date2: Date): boolean {
  return date1.getTime() === date2.getTime();
}

/**
 * Adds a specified number of days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds a specified number of hours to a date.
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Converts an Date to 'yyyy-MM-dd' string.
 */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-based
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
