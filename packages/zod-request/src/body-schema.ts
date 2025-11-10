import { z } from "zod";
import { ERROR_EXPECTED_REQUEST } from "./constants";

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
      // TEST#2 - Error handling for non-Request input
      if (!(val instanceof Request)) {
        throw new Error(ERROR_EXPECTED_REQUEST);
      }
      const contentType = val.headers.get("content-type") ?? "";
      const hasAnySchema = !!(schemas.json || schemas.formData || schemas.text);
      const hasBody = val.body !== null;

      // TEST#1 - JSON body processing tests
      if (schemas.json && contentType.includes("application/json")) {
        if (!hasBody) {
          throw new Error("Request body is required for JSON schema");
        }
        const json = await val.json();
        return { body: schemas.json.parse(json) as BodyType };
      }

      // TEST#1 - FormData body processing tests
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

      // TEST#1 - Text body processing tests
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

      // TEST#1, TEST#2 - Error handling for content-type mismatch and missing body
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
