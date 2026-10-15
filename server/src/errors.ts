/** Error codes double as client translation keys (see web/src/i18n). */
export type ErrorCode =
  | 'invalid' | 'personal' | 'slow' | 'forbidden' | 'missing' | 'conflict'
  | 'unauthorized' | 'credentials' | 'emailTaken' | 'duplicate' | 'unavailable';

const STATUS: Record<ErrorCode, number> = {
  invalid: 400, personal: 422, slow: 429, forbidden: 403, missing: 404, conflict: 409,
  unauthorized: 401, credentials: 401, emailTaken: 409, duplicate: 409, unavailable: 500,
};

export class ApiError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode) {
    super(code);
    this.status = STATUS[code];
  }
}
