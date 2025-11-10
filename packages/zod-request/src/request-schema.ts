import { z } from "zod";
import {
  ERROR_EXPECTED_REQUEST,
  ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA,
} from "./constants";
import {
  extractBaseSchema,
  extractSearchParamsObject,
  extractHeadersObject,
} from "./utils";
import type { HttpMethodSchema } from "./http-method";
import type { RequestModeSchema } from "./request-mode";
import type { ProtocolSchema } from "./protocol";

// ============================================================================
// Type Helpers
// ============================================================================

type ExtractBodyType<TBody extends z.ZodTypeAny | undefined> =
  TBody extends z.ZodTypeAny<infer T>
    ? T extends { body: infer B }
      ? NonNullable<B>
      : never
    : never;

type IncludeIfDefined<
  TSchema extends z.ZodTypeAny | undefined,
  TKey extends string,
  TValue
> = TSchema extends z.ZodTypeAny
  ? { [K in TKey]: TValue }
  : { [K in TKey]?: never };

type IncludeOptionalIfDefined<
  TSchema extends z.ZodTypeAny | undefined,
  TKey extends string,
  TValue
> = TSchema extends z.ZodTypeAny
  ? { [K in TKey]?: TValue }
  : { [K in TKey]?: never };

type RequestSchemaReturnType<
  TSearchParams extends z.ZodTypeAny | undefined,
  TBody extends z.ZodTypeAny | undefined,
  THeaders extends z.ZodTypeAny | undefined,
  TMethod extends HttpMethodSchema | undefined,
  TMode extends RequestModeSchema | undefined,
  TProtocol extends ProtocolSchema | undefined,
  THostname extends z.ZodTypeAny | undefined,
  TPathname extends z.ZodTypeAny | undefined
> = {
  url: URL;
} & IncludeIfDefined<
  TSearchParams,
  "searchParamsObject",
  z.infer<TSearchParams>
> &
  IncludeIfDefined<TBody, "body", ExtractBodyType<TBody>> &
  (TBody extends z.ZodTypeAny
    ? { bodyObject: ExtractBodyType<TBody> }
    : { bodyObject?: never }) &
  IncludeIfDefined<THeaders, "headers", Headers> &
  IncludeIfDefined<THeaders, "headersObj", z.infer<THeaders>> &
  IncludeOptionalIfDefined<TMethod, "method", z.infer<TMethod>> &
  IncludeOptionalIfDefined<TMode, "mode", z.infer<TMode>> &
  IncludeOptionalIfDefined<TProtocol, "protocol", z.infer<TProtocol>> &
  IncludeOptionalIfDefined<THostname, "hostname", z.infer<THostname>> &
  IncludeOptionalIfDefined<TPathname, "pathname", z.infer<TPathname>>;

// ============================================================================
// Internal Type Definitions
// ============================================================================

type SchemaConfig<
  TSearchParams extends z.ZodTypeAny | undefined,
  TBody extends z.ZodTypeAny | undefined,
  THeaders extends z.ZodTypeAny | undefined,
  TMethod extends HttpMethodSchema | undefined,
  TMode extends RequestModeSchema | undefined,
  TProtocol extends ProtocolSchema | undefined,
  THostname extends z.ZodTypeAny | undefined,
  TPathname extends z.ZodTypeAny | undefined
> = {
  searchParams?: TSearchParams;
  body?: TBody;
  headers?: THeaders;
  method?: TMethod;
  mode?: TMode;
  protocol?: TProtocol;
  hostname?: THostname;
  pathname?: TPathname;
};

// ============================================================================
// Helper Functions for Schema Construction
// ============================================================================

function buildResultSchema<
  TSearchParams extends z.ZodTypeAny | undefined,
  TBody extends z.ZodTypeAny | undefined,
  THeaders extends z.ZodTypeAny | undefined,
  TMethod extends HttpMethodSchema | undefined,
  TMode extends RequestModeSchema | undefined,
  TProtocol extends ProtocolSchema | undefined,
  THostname extends z.ZodTypeAny | undefined,
  TPathname extends z.ZodTypeAny | undefined,
  TBodyType = TBody extends z.ZodTypeAny
    ? z.infer<TBody> extends { body: infer B }
      ? NonNullable<B>
      : undefined
    : undefined
>(
  config: SchemaConfig<
    TSearchParams,
    TBody,
    THeaders,
    TMethod,
    TMode,
    TProtocol,
    THostname,
    TPathname
  >,
  _bodyType: TBodyType
) {
  const base = { url: z.instanceof(URL) };

  const fields: Record<string, z.ZodTypeAny> = { ...base };

  // Search params field
  if (config.searchParams) {
    const baseSchema = extractBaseSchema(config.searchParams as z.ZodTypeAny);
    fields.searchParamsObject = (baseSchema || z.unknown()) as z.ZodTypeAny;
  } else {
    fields.searchParamsObject = z.unknown().optional();
  }

  // Body fields
  // TEST#4 - Type safety regression prevention tests
  if (config.body) {
    fields.body = z
      .instanceof(ReadableStream)
      .nullable() as z.ZodType<ReadableStream<Uint8Array> | null>;
    // bodyObject is required when body schema is provided (matches TypeScript type)
    // Use the type parameter for proper type inference
    fields.bodyObject = z.unknown() as z.ZodType<TBodyType>;
  } else {
    fields.body = z.unknown().optional();
    fields.bodyObject = z.unknown().optional();
  }

  // Headers fields
  if (config.headers) {
    fields.headers = z.instanceof(Headers) as z.ZodType<Headers>;
    const baseSchema = extractBaseSchema(config.headers as z.ZodTypeAny);
    fields.headersObj = (baseSchema || z.unknown()) as z.ZodTypeAny;
  } else {
    fields.headers = z.unknown().optional();
    fields.headersObj = z.unknown().optional();
  }

  // Optional fields (method, mode, protocol, hostname, pathname)
  fields.method = config.method
    ? (config.method as z.ZodTypeAny)
    : z.unknown().optional();
  fields.mode = config.mode
    ? (config.mode as z.ZodTypeAny)
    : z.unknown().optional();
  fields.protocol = config.protocol
    ? (config.protocol as z.ZodTypeAny)
    : z.unknown().optional();
  fields.hostname = config.hostname
    ? (config.hostname as z.ZodTypeAny)
    : z.unknown().optional();
  fields.pathname = config.pathname
    ? (config.pathname as z.ZodTypeAny)
    : z.unknown().optional();

  return z.object(fields);
}

// ============================================================================
// Helper Functions for Request Processing
// ============================================================================

/**
 * Process the search params
 * @param searchParams - The search params schema
 * @param urlObj - The URL object
 * @returns The parsed search params
 */
// TEST#1 - All search params processing tests
async function processSearchParams<TSearchParams extends z.ZodTypeAny>(
  searchParams: TSearchParams,
  urlObj: URL
): Promise<z.infer<TSearchParams>> {
  const searchString = String(urlObj.search);
  const params = new URLSearchParams(searchString);
  const baseSchema = extractBaseSchema(searchParams as z.ZodTypeAny);

  if (!baseSchema) {
    throw new Error(
      ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA.replace("{name}", "searchParams")
    );
  }

  const obj = extractSearchParamsObject(params, baseSchema.shape);
  return (await baseSchema.parseAsync(obj)) as z.infer<TSearchParams>;
}

/**
 * Process the headers
 * @param headers - The headers schema
 * @param requestHeaders - The request headers
 * @returns The parsed headers
 */
// TEST#3 - All headers processing tests
async function processHeaders<THeaders extends z.ZodTypeAny>(
  headers: THeaders,
  requestHeaders: Headers
): Promise<z.infer<THeaders>> {
  const baseSchema = extractBaseSchema(headers as z.ZodTypeAny);

  if (!baseSchema) {
    throw new Error(
      ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA.replace("{name}", "headers")
    );
  }

  const obj = extractHeadersObject(requestHeaders, baseSchema.shape);
  return (await baseSchema.parseAsync(obj)) as z.infer<THeaders>;
}

/**
 * Process the body
 * @param body - The body schema
 * @param request - The request
 * @returns The parsed body
 */
// TEST#2 - All body processing tests
async function processBody<TBody extends z.ZodTypeAny>(
  body: TBody,
  request: Request
): Promise<{
  parsed: z.infer<TBody>;
  bodyValue: ExtractBodyType<TBody>;
  originalBody: ReadableStream<Uint8Array> | null;
}> {
  const originalBody = request.body;
  const parsed = await body.parseAsync(request);
  const bodyValue = (parsed as { body: ExtractBodyType<TBody> })
    .body as ExtractBodyType<TBody>;

  return {
    parsed,
    bodyValue,
    originalBody,
  };
}

/**
 * Process a simple field
 * @param schema - The schema
 * @param value - The value
 * @returns The parsed value
 */
async function processSimpleField<T extends z.ZodTypeAny>(
  schema: T,
  value: string
): Promise<z.infer<T>> {
  return (await schema.parseAsync(value)) as z.infer<T>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create a request schema
 * @see https://nicnocquee.github.io/zod-request/api/request-schema
 * @param searchParams - The search params schema
 * @param body - The body schema
 * @param headers - The headers schema
 * @param method - The method schema
 * @param mode - The mode schema
 * @param protocol - The protocol schema
 * @param hostname - The hostname schema
 * @param pathname - The pathname schema
 * @returns A preprocessed Zod schema that validates the entire Request object
 */
export const requestSchema = <
  TSearchParams extends z.ZodTypeAny | undefined = undefined,
  TBody extends z.ZodTypeAny | undefined = undefined,
  THeaders extends z.ZodTypeAny | undefined = undefined,
  TMethod extends HttpMethodSchema | undefined = undefined,
  TMode extends RequestModeSchema | undefined = undefined,
  TProtocol extends ProtocolSchema | undefined = undefined,
  THostname extends z.ZodTypeAny | undefined = undefined,
  TPathname extends z.ZodTypeAny | undefined = undefined
>({
  searchParams,
  body,
  headers,
  method,
  mode,
  protocol,
  hostname,
  pathname,
}: {
  searchParams?: TSearchParams;
  body?: TBody;
  headers?: THeaders;
  method?: TMethod;
  mode?: TMode;
  protocol?: TProtocol;
  hostname?: THostname;
  pathname?: TPathname;
}) => {
  // Compute BodyType for proper type inference (matching original implementation)
  type BodyOutputType = typeof body extends z.ZodTypeAny
    ? z.infer<typeof body>
    : never;
  type BodyType = BodyOutputType extends { body: infer B }
    ? NonNullable<B>
    : undefined;

  const config: SchemaConfig<
    TSearchParams,
    TBody,
    THeaders,
    TMethod,
    TMode,
    TProtocol,
    THostname,
    TPathname
  > = {
    searchParams,
    body,
    headers,
    method,
    mode,
    protocol,
    hostname,
    pathname,
  };

  const resultSchema = buildResultSchema(config, undefined as BodyType);

  return z.preprocess(async (val) => {
    // TEST#11 - Error handling for non-Request input
    if (!(val instanceof Request)) {
      throw new Error(ERROR_EXPECTED_REQUEST);
    }

    // TEST#5 - URL handling tests
    const urlObj = new URL(val.url);

    // Process search params
    const searchParamsObject = searchParams
      ? await processSearchParams(searchParams, urlObj)
      : undefined;

    // Process body (store original before parsing since stream is consumed)
    const bodyResult = body
      ? await processBody(body, val)
      : {
          parsed: undefined,
          bodyValue: undefined,
          originalBody: undefined,
        };

    // Process headers
    const headersObject = headers
      ? await processHeaders(headers, val.headers)
      : undefined;
    const originalHeaders = headers ? val.headers : undefined;

    // Process simple string-based fields
    // TEST#6 - Method validation tests
    const methodValue = method
      ? await processSimpleField(method, val.method)
      : undefined;
    // TEST#7 - Mode validation tests
    const modeValue = mode
      ? await processSimpleField(mode, val.mode)
      : undefined;

    // Process URL-based fields
    // TEST#8 - Protocol validation tests
    const protocolValue = protocol
      ? await processSimpleField(protocol, urlObj.protocol.replace(":", ""))
      : undefined;
    // TEST#9 - Hostname validation tests
    const hostnameValue = hostname
      ? await processSimpleField(hostname, urlObj.hostname)
      : undefined;
    // TEST#10 - Pathname validation tests
    const pathnameValue = pathname
      ? await processSimpleField(pathname, urlObj.pathname)
      : undefined;

    // TEST#12 - Empty request (no searchParams, body, or headers)
    return {
      url: urlObj,
      searchParamsObject,
      body: bodyResult.originalBody,
      bodyObject: bodyResult.bodyValue,
      headers: originalHeaders,
      headersObj: headersObject,
      method: methodValue,
      mode: modeValue,
      protocol: protocolValue,
      hostname: hostnameValue,
      pathname: pathnameValue,
    };
  }, resultSchema) as unknown as z.ZodType<
    RequestSchemaReturnType<
      TSearchParams,
      TBody,
      THeaders,
      TMethod,
      TMode,
      TProtocol,
      THostname,
      TPathname
    >
  >;
};
