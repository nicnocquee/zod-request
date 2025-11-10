import { z } from "zod";
import { ERROR_EXPECTED_HEADERS } from "./constants";
import { extractHeadersObject } from "./utils";

/**
 * Create a Zod schema that validates the headers of a request
 * @param schema - The Zod schema to validate the headers against
 * @returns A Zod schema that validates the headers of a request
 */
export function headersSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return z.preprocess((val) => {
    if (val === null || val === undefined) {
      throw new Error(ERROR_EXPECTED_HEADERS);
    }
    // Convert to Headers - accept Headers or object with get method
    let headers: Headers | { get: (key: string) => string | null };
    if (val instanceof Headers) {
      headers = val;
    } else if (val && typeof val === "object") {
      // Check if it's already a Headers-like object
      // First check if it has a get method
      if (
        "get" in val &&
        typeof (val as { get?: unknown }).get === "function"
      ) {
        // It has a get method, assume it's Headers-like
        headers = val as unknown as Headers;
      } else {
        throw new Error(ERROR_EXPECTED_HEADERS);
      }
    } else {
      throw new Error(ERROR_EXPECTED_HEADERS);
    }
    return extractHeadersObject(headers, schema.shape);
  }, schema);
}
