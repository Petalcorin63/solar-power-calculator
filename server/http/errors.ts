/**
 * Thrown by route code to end the request with a specific status and message. The
 * app's error handler turns it into `{ error: message }`.
 */
export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}
