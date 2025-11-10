import { z } from "zod";
import { ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA } from "./constants";

/**
 * Create a Zod schema that validates the search params of a request
 * @param schema - The Zod schema to validate the search params against
 * @returns A Zod schema that validates the search params of a request
 */
export function isArraySchema(fieldSchema: z.ZodTypeAny | undefined): boolean {
  if (!fieldSchema) return false;
  const fieldSchemaAny = fieldSchema as any;
  return (
    fieldSchemaAny._def?.type === "array" ||
    fieldSchemaAny._def?.typeName === "ZodArray"
  );
}

/**
 * Helper function to extract the base schema from a preprocessed Zod schema
 * In Zod v4, preprocessed schemas (ZodPipe) store the base schema in def.out
 * @param preprocessedSchema - The preprocessed schema
 * @returns The base schema or undefined if not found
 */
export function extractBaseSchema(
  preprocessedSchema: z.ZodTypeAny
): z.ZodObject<any> | undefined {
  const baseSchema = (preprocessedSchema as any).def?.out;
  if (baseSchema && baseSchema.shape && typeof baseSchema.shape === "object") {
    return baseSchema as z.ZodObject<any>;
  }
  return undefined;
}

/**
 * Helper function to extract search params object from URLSearchParams
 * @param params - The URLSearchParams or URLSearchParams-like object
 * @param shape - The schema shape to extract keys from
 * @returns An object with extracted search params
 */
export function extractSearchParamsObject(
  params:
    | URLSearchParams
    | {
        get: (key: string) => string | null;
        getAll?: (key: string) => string[];
      },
  shape: z.ZodRawShape
): Record<string, string | string[] | undefined> {
  const obj: Record<string, string | string[] | undefined> = {};
  for (const key in shape) {
    const fieldSchema = shape[key] as z.ZodTypeAny | undefined;
    if (!fieldSchema) continue;

    const isArray = isArraySchema(fieldSchema);

    // Get all values for this key
    let allValues: string[];
    if (params instanceof URLSearchParams) {
      allValues = params.getAll(key);
    } else if (typeof params.getAll === "function") {
      allValues = params.getAll(key);
    } else {
      // Fallback for URLSearchParams-like objects without getAll
      const value = params.get(key);
      allValues = value !== null ? [value] : [];
    }

    // If multiple values exist, require array schema
    if (allValues.length > 1 && !isArray) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: [key],
          message: ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA.replace("{key}", key),
        },
      ]);
    }

    // If array schema, always return array (even if single value)
    if (isArray) {
      obj[key] = allValues.length > 0 ? allValues : undefined;
    } else {
      // Single value schema - return first value or undefined
      obj[key] = allValues.length > 0 ? allValues[0] : undefined;
    }
  }
  return obj;
}

/**
 * Helper function to extract headers object from Headers
 * @param headers - The Headers object
 * @param shape - The schema shape to extract keys from
 * @returns An object with extracted headers
 */
export function extractHeadersObject(
  headers: Headers | { get: (key: string) => string | null },
  shape: z.ZodRawShape
): Record<string, string | undefined> {
  const obj: Record<string, string | undefined> = {};
  for (const key in shape) {
    const value = headers.get(key);
    obj[key] = value ?? undefined;
  }
  return obj;
}
