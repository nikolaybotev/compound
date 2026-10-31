export function paymentDate(
  startMonth: string,
  paymentNumber: number,
): { year: number; month: number };

export function dueDate(
  startMonth: string,
  paymentNumber: number,
): { year: number; month: number };

export function yearsAndMonths(months: number): string;

export function formatPayoffDate(startMonth: string, payoffMonth: number): string;
