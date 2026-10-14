/**
 * Every color the app uses lives here — screens reference tokens, never hex
 * literals, so a palette change is a one-file edit instead of a grep-and-pray.
 *
 * Status tones map onto `@domain/types`' `RentPeriodStatus` ('paid'|
 * 'partial'|'pending') plus a fourth state the domain ledger also produces
 * (`Ledger.creditPaise > 0`, an overpaid/credit balance) — four tones, no
 * overlap, each with an `on*` pair for text/icon color on top of it.
 */
export interface ColorTokens {
  background: string;
  surface: string;
  border: string;

  text: string;
  textMuted: string;

  primary: string;
  onPrimary: string;

  success: string; // paid
  onSuccess: string;
  warning: string; // partial
  onWarning: string;
  danger: string; // pending
  onDanger: string;
  credit: string; // overpaid / unapplied credit
  onCredit: string;
}

export const lightColors: ColorTokens = {
  background: '#F7F7FA',
  surface: '#FFFFFF',
  border: '#E2E2E8',

  text: '#1A1A1F',
  textMuted: '#6B6B76',

  primary: '#2F6FED',
  onPrimary: '#FFFFFF',

  success: '#1E8E5A',
  onSuccess: '#FFFFFF',
  warning: '#C77700',
  onWarning: '#FFFFFF',
  danger: '#D64545',
  onDanger: '#FFFFFF',
  credit: '#7C4FE0',
  onCredit: '#FFFFFF',
};

export const darkColors: ColorTokens = {
  background: '#121214',
  surface: '#1C1C20',
  border: '#2E2E34',

  text: '#F2F2F5',
  textMuted: '#A0A0AC',

  primary: '#6E9FFF',
  onPrimary: '#0B1220',

  success: '#4CC38A',
  onSuccess: '#06281A',
  warning: '#E3A008',
  onWarning: '#2B1D00',
  danger: '#F07373',
  onDanger: '#330A0A',
  credit: '#B18CF2',
  onCredit: '#241539',
};
