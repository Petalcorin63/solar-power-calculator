/** The error every API call throws: the HTTP status (0 when the server is unreachable) and a readable message. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}
