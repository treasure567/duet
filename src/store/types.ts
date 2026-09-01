export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  AUDIO_LOCKED: 'AUDIO_LOCKED',
  MIC_UNAVAILABLE: 'MIC_UNAVAILABLE',
  NOTHING_HEARD: 'NOTHING_HEARD',
  UNKNOWN_PIECE: 'UNKNOWN_PIECE',
  NOTHING_LOADED: 'NOTHING_LOADED',
  ALREADY_LISTENING: 'ALREADY_LISTENING',
  NOT_LISTENING: 'NOT_LISTENING',
  POSITION_INVALID: 'POSITION_INVALID',
  LOOP_INVALID: 'LOOP_INVALID',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ActionOk<T> {
  ok: true;
  summary: string;
  stateVersion: number;
  data: T;
  nextActions: string[];
}

export interface ActionErr {
  ok: false;
  error: { code: ErrorCode; message: string };
  stateVersion: number;
}

export type ActionResult<T> = ActionOk<T> | ActionErr;

export function ok<T>(
  summary: string,
  stateVersion: number,
  data: T,
  nextActions: string[],
): ActionOk<T> {
  return { ok: true, summary, stateVersion, data, nextActions };
}

export function err(code: ErrorCode, message: string, stateVersion: number): ActionErr {
  return { ok: false, error: { code, message }, stateVersion };
}

export type ActivitySource = 'human' | 'agent' | 'system';

export interface ActivityEntry {
  id: string;
  source: ActivitySource;
  action: string;
  summary: string;
  stateVersion: number;
}
