export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any> | null;

  constructor(
    statusCode: number,
    message: string,
    code: string = "GENERIC_API_ERROR",
    details?: Record<string, any> | null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details || null;
  }
}