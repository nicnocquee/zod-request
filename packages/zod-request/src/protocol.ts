import { z } from "zod";

/**
 * Valid protocol values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/protocol
 */
export const PROTOCOLS = ["http", "https"] as const;

export type Protocol = (typeof PROTOCOLS)[number];

export function protocolSchema<T extends Protocol>(
  protocol: T
): z.ZodLiteral<T> {
  if (!PROTOCOLS.includes(protocol)) {
    throw new Error(
      `Invalid protocol: "${protocol}". Must be one of: ${PROTOCOLS.join(", ")}`
    );
  }
  return z.literal(protocol);
}

/**
 * Protocol enum schema - validates against all valid protocol values
 */
export const protocolEnumSchema = z.enum(PROTOCOLS);

/**
 * Type representing a Zod schema that validates to a valid protocol
 */
export type ProtocolSchema =
  | z.ZodLiteral<Protocol>
  | typeof protocolEnumSchema
  | ReturnType<typeof protocolSchema>;
