import type { ActionResult } from '../store/types';

const MAX_RESULT_CHARS = 1400;

export function serializeResult<T>(result: ActionResult<T>): unknown {
  const raw = JSON.stringify(result);
  if (raw.length <= MAX_RESULT_CHARS || !result.ok) return result;
  return {
    ok: true,
    summary: result.summary,
    stateVersion: result.stateVersion,
    warnings: [
      'This result was larger than the response budget, so the detail was withheld rather than silently cut.',
    ],
    data: {
      omitted: true,
      recover: 'Call duet.read_score with fromBar/toBar or a cursor to page through the notes.',
    },
    nextActions: [...result.nextActions, 'read_score'],
  };
}
