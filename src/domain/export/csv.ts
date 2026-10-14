import { formatCalendarDate, type CalendarDate } from '../dates';
import { isPositive, type Paise } from '../money';
import type { Ledger } from '../types';

/**
 * Quote a CSV field if it contains a comma, double quote, or newline;
 * double internal quotes per RFC 4180. Every field goes through this — a
 * tenant name with a comma in it is the realistic failure mode, not a
 * hypothetical one.
 */
export function csvEscape(field: string): string {
  return /[",\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/** Plain decimal rupees, not `formatINR`'s grouped `₹` form — a spreadsheet
 *  needs to parse this column as a number. */
function rupeesDecimal(p: Paise): string {
  return (p / 100).toFixed(2);
}

export interface LedgerCsvMeta {
  tenantName: string;
  /** The caller supplies "now" (e.g. `todayIST()`) — keeps this pure. */
  generatedOn: CalendarDate;
}

const HEADER = ['Period', 'From', 'To', 'Due date', 'Expected (Rs)', 'Paid (Rs)', 'Pending (Rs)', 'Status'];

function csvRow(fields: readonly string[]): string {
  return fields.map(csvEscape).join(',');
}

/** One row per ledger period, plus a TOTAL row and a CREDIT row when the
 *  tenancy is carrying an unapplied overpayment. */
export function formatLedgerCsv(ledger: Ledger, meta: LedgerCsvMeta): string {
  const lines: string[] = [
    // Still CSV-escaped even though these two lines read as prose: an
    // un-escaped comma in the tenant name would otherwise split into a
    // phantom extra column the moment a spreadsheet parses this file.
    csvEscape(`Rent history for ${meta.tenantName}`),
    `Generated on ${formatCalendarDate(meta.generatedOn)}`,
    '',
    csvRow(HEADER),
  ];

  for (const row of ledger.rows) {
    lines.push(
      csvRow([
        row.period.key,
        formatCalendarDate(row.period.from),
        formatCalendarDate(row.period.to),
        formatCalendarDate(row.period.dueDate),
        rupeesDecimal(row.period.expectedPaise),
        rupeesDecimal(row.paidPaise),
        rupeesDecimal(row.pendingPaise),
        row.status,
      ]),
    );
  }

  lines.push(
    csvRow([
      'TOTAL',
      '',
      '',
      '',
      rupeesDecimal(ledger.totalExpectedPaise),
      rupeesDecimal(ledger.totalPaidPaise),
      rupeesDecimal(ledger.totalPendingPaise),
      '',
    ]),
  );

  if (isPositive(ledger.creditPaise)) {
    lines.push(csvRow(['CREDIT (unapplied)', '', '', '', '', rupeesDecimal(ledger.creditPaise), '', '']));
  }

  return lines.join('\n');
}
