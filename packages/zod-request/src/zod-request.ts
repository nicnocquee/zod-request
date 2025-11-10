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
      throw new Error("Expected URLSearchParams or string");
    }
    // Convert to URLSearchParams - accept URLSearchParams or string (including empty string)
    let params: URLSearchParams;
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
        throw new Error("Expected URLSearchParams or string");
      }
    } else {
      throw new Error("Expected URLSearchParams or string");
    }
    const obj: Record<string, string | string[] | undefined> = {};
    const shape = schema.shape;
    for (const key in shape) {
      const fieldSchema = shape[key];
      if (!fieldSchema) continue;

      // Check if the field schema is an array type
      // In Zod v4, array schemas have _def.type === "array"
      const fieldSchemaAny = fieldSchema as any;
      const isArraySchema =
        fieldSchemaAny._def?.type === "array" ||
        fieldSchemaAny._def?.typeName === "ZodArray";

      // Get all values for this key
      let allValues: string[];
      if (params instanceof URLSearchParams) {
        allValues = params.getAll(key);
      } else if (typeof (params as any).getAll === "function") {
        allValues = (params as any).getAll(key);
      } else {
        // Fallback for URLSearchParams-like objects without getAll
        const value = (params as { get: (key: string) => string | null }).get(
          key
        );
        allValues = value !== null ? [value] : [];
      }

      // If multiple values exist, require array schema
      if (allValues.length > 1 && !isArraySchema) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `Multiple values found for parameter "${key}" but schema expects a single value. Use an array schema (e.g., z.array(z.string())) to accept multiple values.`,
          },
        ]);
      }

      // If array schema, always return array (even if single value)
      if (isArraySchema) {
        obj[key] = allValues.length > 0 ? allValues : undefined;
      } else {
        // Single value schema - return first value or undefined
        obj[key] = allValues.length > 0 ? allValues[0] : undefined;
      }
    }
    return obj;
  }, schema);
}

/**
 * Create a Zod schema that validates the body of a request
 * @param schemas - The Zod schemas to validate the body against
 * @returns A Zod schema that validates the body of a request
 */
export function bodySchema<
  T extends {
    json?: z.ZodTypeAny;
    formData?: z.ZodTypeAny;
    text?: z.ZodTypeAny;
  }
>(schemas: T) {
  type BodyType = T extends { json: infer J }
    ? J extends z.ZodTypeAny
      ? z.infer<J>
      : never
    : T extends { formData: infer F }
    ? F extends z.ZodTypeAny
      ? z.infer<F>
      : never
    : T extends { text: infer Text }
    ? Text extends z.ZodTypeAny
      ? z.infer<Text>
      : never
    : undefined;

  return z.preprocess(
    async (val) => {
      if (!(val instanceof Request)) {
        throw new Error("Expected Request");
      }
      const contentType = val.headers.get("content-type") ?? "";
      const hasAnySchema = !!(schemas.json || schemas.formData || schemas.text);
      const hasBody = val.body !== null;

      if (schemas.json && contentType.includes("application/json")) {
        if (!hasBody) {
          throw new Error("Request body is required for JSON schema");
        }
        const json = await val.json();
        return { body: schemas.json.parse(json) as BodyType };
      }

      if (
        schemas.formData &&
        (contentType.includes("multipart/form-data") ||
          contentType.includes("application/x-www-form-urlencoded"))
      ) {
        if (!hasBody) {
          throw new Error("Request body is required for FormData schema");
        }
        const obj: Record<string, string | undefined> = {};

        if (contentType.includes("application/x-www-form-urlencoded")) {
          // For urlencoded forms, try formData() first (in case body is FormData)
          // then fall back to text() and URLSearchParams
          try {
            const formData = await val.formData();
            for (const [key, value] of Array.from(
              formData as unknown as Iterable<[string, File | string]>
            )) {
              obj[key] = typeof value === "string" ? value : undefined;
            }
          } catch (formDataError) {
            // If formData() fails, try parsing as text with URLSearchParams
            try {
              const clonedRequest = val.clone();
              const text = await clonedRequest.text();
              const params = new URLSearchParams(text);
              for (const [key, value] of Array.from(
                params as unknown as Iterable<[string, string]>
              )) {
                obj[key] = value;
              }
            } catch (textError) {
              // If both fail, throw the original formData error
              throw formDataError;
            }
          }
        } else {
          // For multipart/form-data, use FormData
          // If Content-Type is manually set without boundary, we need to handle it specially
          const contentTypeHeader = val.headers.get("content-type");
          let formData: FormData;

          if (
            contentTypeHeader &&
            contentTypeHeader.includes("multipart/form-data") &&
            !contentTypeHeader.includes("boundary=")
          ) {
            // Content-Type set without boundary - try to clone request without Content-Type
            // so FormData can set it automatically with boundary
            try {
              // Clone the request body first
              const clonedRequest = val.clone();
              const headers = new Headers(clonedRequest.headers);
              headers.delete("content-type");
              const requestWithoutContentType = new Request(clonedRequest.url, {
                method: clonedRequest.method,
                headers,
                body: clonedRequest.body,
                // @ts-expect-error - duplex is needed for Request with body in some environments
                duplex: "half",
              });
              formData = await requestWithoutContentType.formData();
            } catch (cloneError) {
              // If cloning fails, try original request - might work in some environments
              try {
                formData = await val.formData();
              } catch (originalError) {
                // If both fail, throw the original error
                throw originalError;
              }
            }
          } else {
            // Content-Type has boundary or not set - use request directly
            formData = await val.formData();
          }

          for (const [key, value] of Array.from(
            formData as unknown as Iterable<[string, File | string]>
          )) {
            obj[key] = typeof value === "string" ? value : undefined;
          }
        }

        return { body: schemas.formData.parse(obj) as BodyType };
      }

      if (schemas.text) {
        // Check if content-type is text/* or empty (text can be used as fallback)
        const isTextContentType =
          contentType.startsWith("text/") || contentType === "";
        if (isTextContentType) {
          if (!hasBody) {
            throw new Error("Request body is required for text schema");
          }
          const text = await val.text();
          return { body: schemas.text.parse(text) as BodyType };
        }
      }

      // If schemas are defined but no matching content type was found, throw an error
      if (hasAnySchema) {
        if (!hasBody) {
          throw new Error("Request body is required");
        }
        // Determine which schema was expected based on what was provided
        const expectedTypes: string[] = [];
        if (schemas.json) expectedTypes.push("application/json");
        if (schemas.formData) {
          expectedTypes.push(
            "multipart/form-data",
            "application/x-www-form-urlencoded"
          );
        }
        if (schemas.text) expectedTypes.push("text/*");

        throw new Error(
          `Content-Type mismatch. Expected one of: ${expectedTypes.join(
            ", "
          )}, but got: ${contentType || "(no content-type header)"}`
        );
      }

      return { body: undefined as BodyType };
    },
    z.object({
      body: z.unknown().optional() as z.ZodType<BodyType | undefined>,
    })
  );
}

/**
 * Create a Zod schema that validates the headers of a request
 * @param schema - The Zod schema to validate the headers against
 * @returns A Zod schema that validates the headers of a request
 */
export function headersSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return z.preprocess((val) => {
    if (val === null || val === undefined) {
      throw new Error("Expected Headers");
    }
    // Convert to Headers - accept Headers or object with get method
    let headers: Headers;
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
        throw new Error("Expected Headers");
      }
    } else {
      throw new Error("Expected Headers");
    }
    const obj: Record<string, string | undefined> = {};
    const shape = schema.shape;
    for (const key in shape) {
      const value = headers.get(key);
      obj[key] = value ?? undefined;
    }
    return obj;
  }, schema);
}

/**
 * Create a Zod schema that validates the request
 * @param searchParams - The Zod schema to validate the search params against
 * @param body - The Zod schema to validate the body against
 * @param headers - The Zod schema to validate the headers against
 * @param method - The Zod schema to validate the method against
 * @param mode - The Zod schema to validate the mode against
 * @param protocol - The Zod schema to validate the protocol against
 * @param hostname - The Zod schema to validate the hostname against (must be a string schema)
 * @param pathname - The Zod schema to validate the pathname against (must be a string schema)
 * @returns A Zod schema that validates the request
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
  // Return type is inferred from the type assertion below
  // This avoids type path mismatch issues with Zod v4's complex type structure
  type SearchParamsType = typeof searchParams extends z.ZodTypeAny
    ? z.infer<typeof searchParams>
    : undefined;
  type BodyOutputType = typeof body extends z.ZodTypeAny
    ? z.infer<typeof body>
    : never;
  type BodyType = BodyOutputType extends { body: infer B }
    ? NonNullable<B>
    : undefined;
  type HeadersType = typeof headers extends z.ZodTypeAny
    ? z.infer<typeof headers>
    : undefined;
  type MethodType = typeof method extends z.ZodTypeAny
    ? z.infer<typeof method>
    : undefined;
  type ModeType = typeof mode extends z.ZodTypeAny
    ? z.infer<typeof mode>
    : undefined;
  type ProtocolType = typeof protocol extends z.ZodTypeAny
    ? z.infer<typeof protocol>
    : undefined;
  type HostnameType = typeof hostname extends z.ZodTypeAny
    ? z.infer<typeof hostname>
    : undefined;
  type PathnameType = typeof pathname extends z.ZodTypeAny
    ? z.infer<typeof pathname>
    : undefined;

  // Extract base schemas to avoid preprocessing issues in resultSchema
  // In Zod v4, preprocessed schemas (ZodPipe) store the base schema in def.out
  const searchParamsBaseSchema = searchParams
    ? (((searchParams as z.ZodTypeAny).def as any)?.out as
        | z.ZodObject<any>
        | undefined)
    : undefined;
  const headersBaseSchema = headers
    ? (((headers as z.ZodTypeAny).def as any)?.out as
        | z.ZodObject<any>
        | undefined)
    : undefined;

  const resultSchema = (() => {
    const base = {
      url: z.instanceof(URL),
    };
    const headersField = headers
      ? {
          headers: (headersBaseSchema || z.unknown()) as z.ZodTypeAny,
        }
      : { headers: z.unknown().optional() };
    const searchParamsField = searchParams
      ? {
          searchParamsObject: (searchParamsBaseSchema ||
            z.unknown()) as z.ZodTypeAny,
        }
      : { searchParamsObject: z.unknown().optional() };
    const bodyField = body
      ? {
          body: z
            .instanceof(ReadableStream)
            .nullable() as z.ZodType<ReadableStream<Uint8Array> | null>,
        }
      : { body: z.unknown().optional() };
    const bodyObjectField = body
      ? {
          bodyObject: z.unknown() as z.ZodType<BodyType>,
        }
      : { bodyObject: z.unknown().optional() };
    const methodField = method
      ? { method: method as z.ZodTypeAny }
      : { method: z.unknown().optional() };
    const modeField = mode
      ? { mode: mode as z.ZodTypeAny }
      : { mode: z.unknown().optional() };
    const protocolField = protocol
      ? { protocol: protocol as z.ZodTypeAny }
      : { protocol: z.unknown().optional() };
    const hostnameField = hostname
      ? { hostname: hostname as z.ZodTypeAny }
      : { hostname: z.unknown().optional() };
    const pathnameField = pathname
      ? { pathname: pathname as z.ZodTypeAny }
      : { pathname: z.unknown().optional() };

    return z.object({
      ...base,
      ...searchParamsField,
      ...bodyField,
      ...bodyObjectField,
      ...headersField,
      ...methodField,
      ...modeField,
      ...protocolField,
      ...hostnameField,
      ...pathnameField,
    });
  })();

  return z.preprocess(async (val) => {
    if (!(val instanceof Request)) {
      throw new Error("Expected Request");
    }
    const urlObj = new URL(val.url);
    // Extract search params manually to avoid preprocessing issues when calling
    // a preprocessed schema from within another preprocessing function
    // In Zod v4, preprocessed schemas are ZodPipe instances, and the base schema
    // is stored in _zod.def.out
    let searchParamsObject: SearchParamsType | undefined;
    if (searchParams) {
      const searchString = String(urlObj.search);
      const params = new URLSearchParams(searchString);

      // Access the base schema from the ZodPipe structure
      // In Zod v4, preprocessed schemas store the base schema in def.out
      const preprocessedSchema = searchParams as z.ZodTypeAny;
      const baseSchema = (preprocessedSchema as any).def?.out;

      // Check if we have a valid ZodObject schema
      if (
        baseSchema &&
        baseSchema.shape &&
        typeof baseSchema.shape === "object"
      ) {
        // Extract only the keys defined in the schema
        const shape = (baseSchema as z.ZodObject<any>).shape;
        const obj: Record<string, string | string[] | undefined> = {};
        for (const key in shape) {
          const fieldSchema = shape[key];
          // Check if the field schema is an array type
          // In Zod v4, array schemas have _def.type === "array"
          const fieldSchemaAny = fieldSchema as any;
          const isArraySchema =
            fieldSchemaAny._def?.type === "array" ||
            fieldSchemaAny._def?.typeName === "ZodArray";

          // Get all values for this key
          const allValues = params.getAll(key);

          // If multiple values exist, require array schema
          if (allValues.length > 1 && !isArraySchema) {
            throw new z.ZodError([
              {
                code: z.ZodIssueCode.custom,
                path: [key],
                message: `Multiple values found for parameter "${key}" but schema expects a single value. Use an array schema (e.g., z.array(z.string())) to accept multiple values.`,
              },
            ]);
          }

          // If array schema, always return array (even if single value)
          if (isArraySchema) {
            obj[key] = allValues.length > 0 ? allValues : undefined;
          } else {
            // Single value schema - return first value or undefined
            obj[key] = allValues.length > 0 ? allValues[0] : undefined;
          }
        }
        // Validate with the base schema (not the preprocessed one)
        searchParamsObject = (await baseSchema.parseAsync(
          obj
        )) as SearchParamsType;
      } else {
        // Fallback: if we can't access the base schema, throw a helpful error
        throw new Error(
          "Unable to extract base schema from preprocessed searchParams schema. " +
            "This may be a Zod v4 compatibility issue."
        );
      }
    }
    // Store the original request body before parsing (only if body schema is provided)
    // Once we parse the body, the stream is consumed, so we need to store it first
    const originalBody: ReadableStream<Uint8Array> | null | undefined = body
      ? val.body
      : undefined;

    const bodyParsed = body ? await body.parseAsync(val) : undefined;
    const bodyValue = bodyParsed
      ? ((bodyParsed as { body: BodyType }).body as BodyType)
      : undefined;
    // bodyObject is the unwrapped validated body value for direct property access
    const bodyObject = bodyValue;

    let headersObject: HeadersType | undefined;
    if (headers) {
      const preprocessedHeadersSchema = headers as z.ZodTypeAny;
      const baseSchema = (preprocessedHeadersSchema as any).def?.out;

      // Check if we have a valid ZodObject schema
      if (
        baseSchema &&
        baseSchema.shape &&
        typeof baseSchema.shape === "object"
      ) {
        // Extract only the keys defined in the schema
        const shape = (baseSchema as z.ZodObject<any>).shape;
        const obj: Record<string, string | undefined> = {};
        for (const key in shape) {
          const value = val.headers.get(key);
          obj[key] = value ?? undefined;
        }
        // Validate with the base schema (not the preprocessed one)
        headersObject = (await baseSchema.parseAsync(obj)) as HeadersType;
      } else {
        // Fallback: if we can't access the base schema, throw a helpful error
        throw new Error(
          "Unable to extract base schema from preprocessed headers schema. " +
            "This may be a Zod v4 compatibility issue."
        );
      }
    }

    let methodValue: MethodType | undefined;
    if (method) {
      methodValue = (await method.parseAsync(val.method)) as MethodType;
    }

    let modeValue: ModeType | undefined;
    if (mode) {
      modeValue = (await mode.parseAsync(val.mode)) as ModeType;
    }

    let protocolValue: ProtocolType | undefined;
    if (protocol) {
      // Extract protocol from URL (remove the colon, e.g., "http:" -> "http")
      const urlProtocol = urlObj.protocol.replace(":", "");
      protocolValue = (await protocol.parseAsync(urlProtocol)) as ProtocolType;
    }

    let hostnameValue: HostnameType | undefined;
    if (hostname) {
      // Extract hostname from URL
      const urlHostname = urlObj.hostname;
      hostnameValue = (await hostname.parseAsync(urlHostname)) as HostnameType;
    }

    let pathnameValue: PathnameType | undefined;
    if (pathname) {
      // Extract pathname from URL
      const urlPathname = urlObj.pathname;
      pathnameValue = (await pathname.parseAsync(urlPathname)) as PathnameType;
    }

    return {
      url: urlObj,
      searchParamsObject,
      body: originalBody,
      bodyObject,
      headers: headersObject,
      method: methodValue,
      mode: modeValue,
      protocol: protocolValue,
      hostname: hostnameValue,
      pathname: pathnameValue,
    };
  }, resultSchema) as unknown as z.ZodType<
    TSearchParams extends z.ZodTypeAny
      ? TBody extends z.ZodTypeAny
        ? THeaders extends z.ZodTypeAny
          ? TMethod extends z.ZodTypeAny
            ? TMode extends z.ZodTypeAny
              ? TProtocol extends z.ZodTypeAny
                ? THostname extends z.ZodTypeAny
                  ? {
                      url: URL;
                      searchParamsObject: z.infer<TSearchParams>;
                      body: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : never;
                      bodyObject: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : undefined;
                      headers: z.infer<THeaders>;
                      method: z.infer<TMethod>;
                      mode: z.infer<TMode>;
                      protocol: z.infer<TProtocol>;
                      hostname: z.infer<THostname>;
                      pathname: z.infer<TPathname>;
                    }
                  : TPathname extends z.ZodTypeAny
                  ? {
                      url: URL;
                      searchParamsObject: z.infer<TSearchParams>;
                      body: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : never;
                      bodyObject: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : undefined;
                      headers: z.infer<THeaders>;
                      method: z.infer<TMethod>;
                      mode: z.infer<TMode>;
                      protocol: z.infer<TProtocol>;
                      pathname: z.infer<TPathname>;
                    }
                  : {
                      url: URL;
                      searchParamsObject: z.infer<TSearchParams>;
                      body: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : never;
                      bodyObject: TBody extends z.ZodTypeAny<infer T>
                        ? T extends { body: infer B }
                          ? NonNullable<B>
                          : never
                        : undefined;
                      headers: z.infer<THeaders>;
                      method: z.infer<TMethod>;
                      mode: z.infer<TMode>;
                      protocol: z.infer<TProtocol>;
                    }
                : THostname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    hostname: z.infer<THostname>;
                    pathname: z.infer<TPathname>;
                  }
                : TPathname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                    pathname: z.infer<TPathname>;
                  }
                : {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                  }
              : THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  protocol: z.infer<TProtocol>;
                }
            : TMode extends z.ZodTypeAny
            ? TProtocol extends z.ZodTypeAny
              ? THostname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                    hostname: z.infer<THostname>;
                    pathname: z.infer<TPathname>;
                  }
                : TPathname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                    pathname: z.infer<TPathname>;
                  }
                : {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                  }
              : THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  mode: z.infer<TMode>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  mode: z.infer<TMode>;
                }
            : TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
              }
          : TMethod extends z.ZodTypeAny
          ? TMode extends z.ZodTypeAny
            ? TProtocol extends z.ZodTypeAny
              ? THostname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                    hostname: z.infer<THostname>;
                    pathname: z.infer<TPathname>;
                  }
                : TPathname extends z.ZodTypeAny
                ? {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    headers: z.infer<THeaders>;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                    pathname: z.infer<TPathname>;
                  }
                : {
                    url: URL;
                    searchParamsObject: z.infer<TSearchParams>;
                    body: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : never;
                    bodyObject: TBody extends z.ZodTypeAny<infer T>
                      ? T extends { body: infer B }
                        ? NonNullable<B>
                        : never
                      : undefined;
                    method: z.infer<TMethod>;
                    mode: z.infer<TMode>;
                    protocol: z.infer<TProtocol>;
                  }
              : THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                }
            : TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
              }
          : TMode extends z.ZodTypeAny
          ? TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                mode: z.infer<TMode>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                mode: z.infer<TMode>;
              }
          : TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
            }
        : THeaders extends z.ZodTypeAny
        ? TMethod extends z.ZodTypeAny
          ? TMode extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
              }
          : TMode extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              mode: z.infer<TMode>;
            }
          : {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
            }
        : TMethod extends z.ZodTypeAny
        ? TMode extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
            }
          : {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
            }
        : TMode extends z.ZodTypeAny
        ? TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body?: never;
                bodyObject?: never;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body?: never;
                bodyObject?: never;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              mode: z.infer<TMode>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              mode: z.infer<TMode>;
            }
        : TProtocol extends z.ZodTypeAny
        ? THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              protocol: z.infer<TProtocol>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body?: never;
              bodyObject?: never;
              protocol: z.infer<TProtocol>;
            }
        : THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body?: never;
            bodyObject?: never;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body?: never;
            bodyObject?: never;
          }
      : TBody extends z.ZodTypeAny
      ? THeaders extends z.ZodTypeAny
        ? TMethod extends z.ZodTypeAny
          ? TMode extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
              }
          : TMode extends z.ZodTypeAny
          ? TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject?: never;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject?: never;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                mode: z.infer<TMode>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                mode: z.infer<TMode>;
              }
          : TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
            }
        : TMethod extends z.ZodTypeAny
        ? TMode extends z.ZodTypeAny
          ? TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject?: never;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject?: never;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
              }
          : TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                method: z.infer<TMethod>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              method: z.infer<TMethod>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              method: z.infer<TMethod>;
            }
        : TMode extends z.ZodTypeAny
        ? TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              mode: z.infer<TMode>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              mode: z.infer<TMode>;
            }
        : TProtocol extends z.ZodTypeAny
        ? THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              protocol: z.infer<TProtocol>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              protocol: z.infer<TProtocol>;
            }
        : THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject?: never;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject?: never;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
          }
      : THeaders extends z.ZodTypeAny
      ? TMethod extends z.ZodTypeAny
        ? TMode extends z.ZodTypeAny
          ? TProtocol extends z.ZodTypeAny
            ? THostname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject?: never;
                  body?: never;
                  bodyObject?: never;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  hostname: z.infer<THostname>;
                  pathname: z.infer<TPathname>;
                }
              : TPathname extends z.ZodTypeAny
              ? {
                  url: URL;
                  searchParamsObject: z.infer<TSearchParams>;
                  body: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : never;
                  bodyObject: TBody extends z.ZodTypeAny<infer T>
                    ? T extends { body: infer B }
                      ? NonNullable<B>
                      : never
                    : undefined;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                  pathname: z.infer<TPathname>;
                }
              : {
                  url: URL;
                  searchParamsObject?: never;
                  body?: never;
                  bodyObject?: never;
                  headers: z.infer<THeaders>;
                  method: z.infer<TMethod>;
                  mode: z.infer<TMode>;
                  protocol: z.infer<TProtocol>;
                }
            : THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
              }
          : TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
            }
        : TMode extends z.ZodTypeAny
        ? TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                headers: z.infer<THeaders>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              mode: z.infer<TMode>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              mode: z.infer<TMode>;
            }
        : TProtocol extends z.ZodTypeAny
        ? THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              protocol: z.infer<TProtocol>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              headers: z.infer<THeaders>;
              protocol: z.infer<TProtocol>;
            }
        : THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            headers: z.infer<THeaders>;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            headers: z.infer<THeaders>;
          }
      : TMethod extends z.ZodTypeAny
      ? TMode extends z.ZodTypeAny
        ? TProtocol extends z.ZodTypeAny
          ? THostname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                hostname: z.infer<THostname>;
                pathname: z.infer<TPathname>;
              }
            : TPathname extends z.ZodTypeAny
            ? {
                url: URL;
                searchParamsObject: z.infer<TSearchParams>;
                body: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : never;
                bodyObject: TBody extends z.ZodTypeAny<infer T>
                  ? T extends { body: infer B }
                    ? NonNullable<B>
                    : never
                  : undefined;
                headers: z.infer<THeaders>;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
                pathname: z.infer<TPathname>;
              }
            : {
                url: URL;
                searchParamsObject?: never;
                body?: never;
                bodyObject?: never;
                method: z.infer<TMethod>;
                mode: z.infer<TMode>;
                protocol: z.infer<TProtocol>;
              }
          : THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
            }
        : TProtocol extends z.ZodTypeAny
        ? THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
              protocol: z.infer<TProtocol>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              method: z.infer<TMethod>;
              protocol: z.infer<TProtocol>;
            }
        : THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            method: z.infer<TMethod>;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            method: z.infer<TMethod>;
          }
      : TMode extends z.ZodTypeAny
      ? TProtocol extends z.ZodTypeAny
        ? THostname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              hostname: z.infer<THostname>;
              pathname: z.infer<TPathname>;
            }
          : TPathname extends z.ZodTypeAny
          ? {
              url: URL;
              searchParamsObject: z.infer<TSearchParams>;
              body: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : never;
              bodyObject: TBody extends z.ZodTypeAny<infer T>
                ? T extends { body: infer B }
                  ? NonNullable<B>
                  : never
                : undefined;
              headers: z.infer<THeaders>;
              method: z.infer<TMethod>;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
              pathname: z.infer<TPathname>;
            }
          : {
              url: URL;
              searchParamsObject?: never;
              body?: never;
              bodyObject?: never;
              mode: z.infer<TMode>;
              protocol: z.infer<TProtocol>;
            }
        : THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            mode: z.infer<TMode>;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            mode: z.infer<TMode>;
          }
      : TProtocol extends z.ZodTypeAny
      ? THostname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            protocol: z.infer<TProtocol>;
            hostname: z.infer<THostname>;
            pathname: z.infer<TPathname>;
          }
        : TPathname extends z.ZodTypeAny
        ? {
            url: URL;
            searchParamsObject: z.infer<TSearchParams>;
            body: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : never;
            bodyObject: TBody extends z.ZodTypeAny<infer T>
              ? T extends { body: infer B }
                ? NonNullable<B>
                : never
              : undefined;
            headers: z.infer<THeaders>;
            method: z.infer<TMethod>;
            mode: z.infer<TMode>;
            protocol: z.infer<TProtocol>;
            pathname: z.infer<TPathname>;
          }
        : {
            url: URL;
            searchParamsObject?: never;
            body?: never;
            bodyObject?: never;
            protocol: z.infer<TProtocol>;
          }
      : THostname extends z.ZodTypeAny
      ? {
          url: URL;
          searchParamsObject?: never;
          body?: never;
          bodyObject?: never;
          hostname: z.infer<THostname>;
          pathname: z.infer<TPathname>;
        }
      : TPathname extends z.ZodTypeAny
      ? {
          url: URL;
          searchParamsObject: z.infer<TSearchParams>;
          body: TBody extends z.ZodTypeAny<infer T>
            ? T extends { body: infer B }
              ? NonNullable<B>
              : never
            : never;
          bodyObject: TBody extends z.ZodTypeAny<infer T>
            ? T extends { body: infer B }
              ? NonNullable<B>
              : never
            : undefined;
          headers: z.infer<THeaders>;
          method: z.infer<TMethod>;
          mode: z.infer<TMode>;
          protocol: z.infer<TProtocol>;
          pathname: z.infer<TPathname>;
        }
      : {
          url: URL;
          searchParamsObject?: never;
          body?: never;
          bodyObject?: never;
        }
  >;
};
