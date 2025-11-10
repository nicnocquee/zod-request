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

// Helper type to extract body type from a Zod schema
type ExtractBodyType<TBody extends z.ZodTypeAny | undefined> =
  TBody extends z.ZodTypeAny<infer T>
    ? T extends { body: infer B }
      ? NonNullable<B>
      : never
    : never;

// Helper type to conditionally include a required field
type IncludeIfDefined<
  TSchema extends z.ZodTypeAny | undefined,
  TKey extends string,
  TValue
> = TSchema extends z.ZodTypeAny
  ? { [K in TKey]: TValue }
  : { [K in TKey]?: never };

// Helper type to conditionally include an optional field (for fields that can be undefined)
type IncludeOptionalIfDefined<
  TSchema extends z.ZodTypeAny | undefined,
  TKey extends string,
  TValue
> = TSchema extends z.ZodTypeAny
  ? { [K in TKey]?: TValue }
  : { [K in TKey]?: never };

// Main return type helper
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
    ? { bodyObject?: ExtractBodyType<TBody> }
    : { bodyObject?: never }) &
  IncludeIfDefined<THeaders, "headers", Headers> &
  IncludeIfDefined<THeaders, "headersObj", z.infer<THeaders>> &
  IncludeOptionalIfDefined<TMethod, "method", z.infer<TMethod>> &
  IncludeOptionalIfDefined<TMode, "mode", z.infer<TMode>> &
  IncludeOptionalIfDefined<TProtocol, "protocol", z.infer<TProtocol>> &
  IncludeOptionalIfDefined<THostname, "hostname", z.infer<THostname>> &
  IncludeOptionalIfDefined<TPathname, "pathname", z.infer<TPathname>>;

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
    ? extractBaseSchema(searchParams as z.ZodTypeAny)
    : undefined;
  const headersBaseSchema = headers
    ? extractBaseSchema(headers as z.ZodTypeAny)
    : undefined;

  const resultSchema = (() => {
    const base = {
      url: z.instanceof(URL),
    };
    const headersField = headers
      ? {
          headers: z.instanceof(Headers) as z.ZodType<Headers>,
        }
      : { headers: z.unknown().optional() };
    const headersObjectField = headers
      ? {
          headersObj: (headersBaseSchema || z.unknown()) as z.ZodTypeAny,
        }
      : { headersObj: z.unknown().optional() };
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
      ...headersObjectField,
      ...methodField,
      ...modeField,
      ...protocolField,
      ...hostnameField,
      ...pathnameField,
    });
  })();

  return z.preprocess(async (val) => {
    if (!(val instanceof Request)) {
      throw new Error(ERROR_EXPECTED_REQUEST);
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
      const baseSchema = extractBaseSchema(searchParams as z.ZodTypeAny);

      if (baseSchema) {
        // Extract only the keys defined in the schema
        const obj = extractSearchParamsObject(params, baseSchema.shape);
        // Validate with the base schema (not the preprocessed one)
        searchParamsObject = (await baseSchema.parseAsync(
          obj
        )) as SearchParamsType;
      } else {
        // Fallback: if we can't access the base schema, throw a helpful error
        throw new Error(
          ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA.replace("{name}", "searchParams")
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

    // Store the original headers object
    const originalHeaders: Headers | undefined = headers
      ? val.headers
      : undefined;

    let headersObject: HeadersType | undefined;
    if (headers) {
      const baseSchema = extractBaseSchema(headers as z.ZodTypeAny);

      if (baseSchema) {
        // Extract only the keys defined in the schema
        const obj = extractHeadersObject(val.headers, baseSchema.shape);
        // Validate with the base schema (not the preprocessed one)
        headersObject = (await baseSchema.parseAsync(obj)) as HeadersType;
      } else {
        // Fallback: if we can't access the base schema, throw a helpful error
        throw new Error(
          ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA.replace("{name}", "headers")
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
