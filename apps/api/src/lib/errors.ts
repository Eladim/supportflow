export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
