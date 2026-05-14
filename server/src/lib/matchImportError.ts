// Raised when a match-import payload or action is semantically invalid (as opposed to a
// zod shape error). The HTTP error handler maps this to 422.
export class MatchImportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchImportValidationError'
  }
}
