import { z } from "zod";

/**
 * Standard HTTP methods
 */
export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

/**
 * Type-safe HTTP method schema
 * Use this instead of z.literal() to ensure only valid HTTP methods are used.
 * TypeScript will catch invalid methods at compile time, and this also validates at runtime.
 */
export function httpMethodSchema<T extends (typeof HTTP_METHODS)[number]>(
  method: T
): z.ZodLiteral<T> {
  if (!HTTP_METHODS.includes(method)) {
    throw new Error(
      `Invalid HTTP method: "${method}". Must be one of: ${HTTP_METHODS.join(
        ", "
      )}`
    );
  }
  return z.literal(method);
}

/**
 * HTTP method enum schema - validates against all standard HTTP methods
 */
export const httpMethodEnumSchema = z.enum(HTTP_METHODS);

/**
 * Type representing a valid HTTP method
 */
export type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Type representing a Zod schema that validates to a valid HTTP method
 */
export type HttpMethodSchema =
  | z.ZodLiteral<HttpMethod>
  | typeof httpMethodEnumSchema
  | ReturnType<typeof httpMethodSchema>;
