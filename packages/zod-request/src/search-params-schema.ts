import { z } from "zod";
import { ERROR_EXPECTED_URL_SEARCH_PARAMS } from "./constants";
import { extractSearchParamsObject } from "./utils";

/**
 * Create a Zod schema that validates the search params of a request
 * @param schema - The Zod schema to validate the search params against
 * @returns A Zod schema that validates the search params of a request
 */
export function searchParamsSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return z.preprocess((val) => {
    if (val === null || val === undefined) {
      throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
    }
    // Convert to URLSearchParams - accept URLSearchParams or string (including empty string)
    let params:
      | URLSearchParams
      | {
          get: (key: string) => string | null;
          getAll?: (key: string) => string[];
        };
    if (typeof val === "string") {
      // Empty string is valid - it creates an empty URLSearchParams
      // urlObj.search includes the '?' prefix, which URLSearchParams handles correctly
      params = new URLSearchParams(val);
    } else if (val instanceof URLSearchParams) {
      params = val;
    } else if (val && typeof val === "object") {
      // Check if it's already a URLSearchParams-like object
      // First check if it has a get method
      if (
        "get" in val &&
        typeof (val as { get?: unknown }).get === "function"
      ) {
        // It has a get method, assume it's URLSearchParams-like
        params = val as unknown as URLSearchParams;
      } else {
        throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
      }
    } else {
      throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
    }
    return extractSearchParamsObject(params, schema.shape);
  }, schema);
}
