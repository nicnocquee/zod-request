import { z } from "zod";

/**
 * Valid Request mode values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
 */
export const REQUEST_MODES = [
  "same-origin",
  "no-cors",
  "cors",
  "navigate",
] as const;

/**
 * Request mode enum schema - validates against all valid Request mode values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
 */
export const requestModeEnumSchema = z.enum(REQUEST_MODES);

/**
 * Type representing a valid Request mode
 */
export type RequestMode = (typeof REQUEST_MODES)[number];

export function requestModeSchema<T extends RequestMode>(
  mode: T
): z.ZodLiteral<T> {
  if (!REQUEST_MODES.includes(mode)) {
    throw new Error(
      `Invalid Request mode: "${mode}". Must be one of: ${REQUEST_MODES.join(
        ", "
      )}`
    );
  }
  return z.literal(mode);
}

/**
 * Type representing a Zod schema that validates to a valid Request mode
 */
export type RequestModeSchema =
  | z.ZodLiteral<RequestMode>
  | typeof requestModeEnumSchema;
