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
    // TEST#1, TEST#2 - Error handling for null/undefined input
    if (val === null || val === undefined) {
      throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
    }
    // TEST#1 - Search params processing tests
    // Convert to URLSearchParams - accept URLSearchParams or string (including empty string)
    let params:
      | URLSearchParams
      | {
          get: (key: string) => string | null;
          getAll?: (key: string) => string[];
        };
    if (typeof val === "string") {
      // TEST#1 - Empty string is valid - it creates an empty URLSearchParams
      // urlObj.search includes the '?' prefix, which URLSearchParams handles correctly
      params = new URLSearchParams(val);
    } else if (val instanceof URLSearchParams) {
      // TEST#1 - URLSearchParams instance handling
      params = val;
    } else if (val && typeof val === "object") {
      // TEST#1 - Check if it's already a URLSearchParams-like object
      // First check if it has a get method
      if (
        "get" in val &&
        typeof (val as { get?: unknown }).get === "function"
      ) {
        // TEST#1 - It has a get method, assume it's URLSearchParams-like
        params = val as unknown as URLSearchParams;
      } else {
        // TEST#1, TEST#2 - Error handling for object without get method
        throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
      }
    } else {
      // TEST#1, TEST#2 - Error handling for non-string, non-object input
      throw new Error(ERROR_EXPECTED_URL_SEARCH_PARAMS);
    }
    // TEST#1, TEST#2 - Extract search params (includes array validation)
    return extractSearchParamsObject(params, schema.shape);
  }, schema);
}
