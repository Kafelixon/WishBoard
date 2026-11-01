/** A failed product-details lookup. Carries the HTTP status so the UI can show a translated message. */
export class ProductMetaError extends Error {
  constructor(readonly status: number) {
    super(`Product lookup failed (${String(status)})`);
  }
}
