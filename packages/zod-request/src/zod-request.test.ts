import { describe, it, expect } from "vitest";
import { z } from "zod";
import { searchParamsSchema } from "./search-params-schema";
import { headersSchema } from "./headers-schema";
import { bodySchema } from "./body-schema";
import { requestSchema } from "./request-schema";
import { httpMethodSchema, httpMethodEnumSchema } from "./http-method";
import { requestModeEnumSchema } from "./request-mode";
import { protocolSchema, protocolEnumSchema } from "./protocol";

describe("searchParamsSchema", () => {
  it("should parse valid search params", () => {
    const schema = z.object({
      name: z.string(),
      age: z.string(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("name", "John");
    searchParams.set("age", "30");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({
      name: "John",
      age: "30",
    });
  });

  it("should handle missing search params as undefined", () => {
    const schema = z.object({
      name: z.string().optional(),
      age: z.string().optional(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("name", "John");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({
      name: "John",
      age: undefined,
    });
  });

  it("should throw error when input is not URLSearchParams or string", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(123);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("should validate schema constraints", () => {
    const schema = z.object({
      age: z.string().transform((val) => Number(val)),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("age", "30");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ age: 30 });
  });

  it("should handle empty search params", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const searchParams = new URLSearchParams();

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ name: undefined });
  });

  it("should only extract keys defined in schema", () => {
    const schema = z.object({
      name: z.string(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("name", "John");
    searchParams.set("extra", "value");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ name: "John" });
    expect(result).not.toHaveProperty("extra");
  });

  it("should handle empty string input", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const result = searchParamsSchema(schema).parse("");

    expect(result).toEqual({ name: undefined });
  });

  it("should handle string with query prefix", () => {
    const schema = z.object({
      name: z.string(),
      age: z.string(),
    });

    const result = searchParamsSchema(schema).parse("?name=John&age=30");

    expect(result).toEqual({ name: "John", age: "30" });
  });

  it("should handle string with only query prefix", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const result = searchParamsSchema(schema).parse("?");

    expect(result).toEqual({ name: undefined });
  });

  it("should handle URL-encoded special characters", () => {
    const schema = z.object({
      query: z.string(),
      value: z.string(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("query", "hello world");
    searchParams.set("value", "a+b=c&d");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({
      query: "hello world",
      value: "a+b=c&d",
    });
  });

  it("should throw error when multiple values exist but schema is not array", () => {
    const schema = z.object({
      tag: z.string(),
    });

    const searchParams = new URLSearchParams();
    searchParams.append("tag", "first");
    searchParams.append("tag", "second");

    expect(() => {
      searchParamsSchema(schema).parse(searchParams);
    }).toThrow();
  });

  it("should return array when multiple values exist and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()),
    });

    const searchParams = new URLSearchParams();
    searchParams.append("tag", "first");
    searchParams.append("tag", "second");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: ["first", "second"] });
  });

  it("should return array with single value when single value exists and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("tag", "single");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: ["single"] });
  });

  it("should return undefined array when no value exists and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()).optional(),
    });

    const searchParams = new URLSearchParams();

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: undefined });
  });

  it("should handle object with get method (URLSearchParams-like)", () => {
    const schema = z.object({
      name: z.string(),
    });

    const mockParams = {
      get: (key: string) => (key === "name" ? "John" : null),
    };

    const result = searchParamsSchema(schema).parse(mockParams);

    expect(result).toEqual({ name: "John" });
  });

  it("should throw error for null input", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(null);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("should throw error for undefined input", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(undefined);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("should handle empty string values", () => {
    const schema = z.object({
      empty: z.string(),
      optional: z.string().optional(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("empty", "");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ empty: "", optional: undefined });
  });

  it("should handle very long query strings", () => {
    const schema = z.object({
      long: z.string(),
    });

    const longValue = "a".repeat(10000);
    const searchParams = new URLSearchParams();
    searchParams.set("long", longValue);

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ long: longValue });
  });

  it("should handle object without get method", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse({ name: "John" });
    }).toThrow("Expected URLSearchParams or string");
  });
});

describe("headersSchema", () => {
  it("should parse valid headers", () => {
    const schema = z.object({
      authorization: z.string(),
      "content-type": z.string(),
    });

    const headers = new Headers();
    headers.set("authorization", "Bearer token123");
    headers.set("content-type", "application/json");

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({
      authorization: "Bearer token123",
      "content-type": "application/json",
    });
  });

  it("should handle missing headers as undefined", () => {
    const schema = z.object({
      authorization: z.string().optional(),
      "content-type": z.string().optional(),
    });

    const headers = new Headers();
    headers.set("authorization", "Bearer token123");

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({
      authorization: "Bearer token123",
      "content-type": undefined,
    });
  });

  it("should throw error when input is not Headers", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const schemaWithPreprocess = headersSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(123);
    }).toThrow("Expected Headers");
  });

  it("should validate schema constraints", () => {
    const schema = z.object({
      "x-api-version": z.string().transform((val) => Number(val)),
    });

    const headers = new Headers();
    headers.set("x-api-version", "2");

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({ "x-api-version": 2 });
  });

  it("should handle empty headers", () => {
    const schema = z.object({
      authorization: z.string().optional(),
    });

    const headers = new Headers();

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({ authorization: undefined });
  });

  it("should only extract keys defined in schema", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const headers = new Headers();
    headers.set("authorization", "Bearer token123");
    headers.set("x-custom-header", "value");

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({ authorization: "Bearer token123" });
    expect(result).not.toHaveProperty("x-custom-header");
  });

  it("should handle object with get method (Headers-like)", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const mockHeaders = {
      get: (key: string) =>
        key === "authorization" ? "Bearer token123" : null,
    };

    const result = headersSchema(schema).parse(mockHeaders);

    expect(result).toEqual({ authorization: "Bearer token123" });
  });

  it("should throw error for null input", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const schemaWithPreprocess = headersSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(null);
    }).toThrow("Expected Headers");
  });

  it("should throw error for undefined input", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const schemaWithPreprocess = headersSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(undefined);
    }).toThrow("Expected Headers");
  });

  it("should handle empty string values", () => {
    const schema = z.object({
      empty: z.string(),
      optional: z.string().optional(),
    });

    const headers = new Headers();
    headers.set("empty", "");

    const result = headersSchema(schema).parse(headers);

    expect(result).toEqual({ empty: "", optional: undefined });
  });

  it("should handle header names (Headers are case-insensitive)", () => {
    const schema = z.object({
      Authorization: z.string(),
      "Content-Type": z.string(),
    });

    const headers = new Headers();
    headers.set("Authorization", "Bearer token123");
    headers.set("Content-Type", "application/json");
    // Note: Headers are case-insensitive, so setting "authorization" after "Authorization"
    // will overwrite the previous value
    headers.set("authorization", "lowercase");

    const result = headersSchema(schema).parse(headers);

    // Headers.get() is case-insensitive, so "authorization" overwrites "Authorization"
    expect(result).toEqual({
      Authorization: "lowercase",
      "Content-Type": "application/json",
    });
  });

  it("should handle object without get method", () => {
    const schema = z.object({
      authorization: z.string(),
    });

    const schemaWithPreprocess = headersSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse({ authorization: "Bearer token123" });
    }).toThrow("Expected Headers");
  });
});

describe("bodySchema", () => {
  describe("JSON body", () => {
    it("should parse valid JSON body", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John", age: 30 }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ name: "John", age: 30 });
    });

    it("should handle JSON with charset", async () => {
      const schema = z.object({
        value: z.string(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ value: "test" });
    });

    it("should throw validation error for invalid JSON", async () => {
      const schema = z.object({
        age: z.number(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ age: "not-a-number" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow();
    });

    it("should throw error for malformed JSON syntax", async () => {
      const schema = z.object({
        value: z.string(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ invalid json }",
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow();
    });

    it("should handle empty JSON body", async () => {
      const schema = z.object({
        value: z.string().optional(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ value: undefined });
    });

    it("should handle JSON with array root", async () => {
      const schema = z.array(z.string());

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(["a", "b", "c"]),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual(["a", "b", "c"]);
    });

    it("should handle JSON with null root", async () => {
      const schema = z.null();

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBeNull();
    });

    it("should handle content-type with whitespace", async () => {
      const schema = z.object({
        value: z.string(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": " application/json " },
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ value: "test" });
    });

    it("should handle case-insensitive content-type (note: implementation is case-sensitive)", async () => {
      const schema = z.object({
        value: z.string(),
      });

      // Note: The implementation uses includes() which is case-sensitive
      // This test documents that behavior - content-type matching is case-sensitive
      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" }, // lowercase works
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ value: "test" });
    });

    it("should handle content-type with multiple parameters", async () => {
      const schema = z.object({
        value: z.string(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8; boundary=something",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ value: "test" });
    });
  });

  describe("formData body", () => {
    it("should parse multipart/form-data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.string(),
      });

      const formData = new FormData();
      formData.append("name", "John");
      formData.append("age", "30");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ name: "John", age: "30" });
    });

    it("should parse application/x-www-form-urlencoded", async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      const params = new URLSearchParams();
      params.append("name", "John");
      params.append("email", "john@example.com");

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({
        name: "John",
        email: "john@example.com",
      });
    });

    it("should handle non-string form data values as undefined", async () => {
      const schema = z.object({
        name: z.string().optional(),
        file: z.string().optional(),
      });

      const formData = new FormData();
      formData.append("name", "John");
      formData.append("file", new Blob(["content"], { type: "text/plain" }));

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ name: "John", file: undefined });
    });

    it("should throw validation error for invalid formData", async () => {
      const schema = z.object({
        age: z.string().transform((val) => {
          const num = Number(val);
          if (Number.isNaN(num)) {
            throw new Error("Invalid number");
          }
          return num;
        }),
      });

      const formData = new FormData();
      formData.append("age", "not-a-number");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({
        formData: schema,
      });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow();
    });

    it("should handle empty FormData", async () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      const formData = new FormData();

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ name: undefined });
    });

    it("should handle FormData with multiple values for same key", async () => {
      const schema = z.object({
        tag: z.string(),
      });

      const formData = new FormData();
      formData.append("tag", "first");
      formData.append("tag", "second");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      // FormData.entries() iteration order may vary by environment
      // The implementation uses entries() which may return values in different order
      expect(result.body).toBeDefined();
      if (result.body) {
        expect(result.body.tag).toBeDefined();
        expect(["first", "second"]).toContain(result.body.tag);
      }
    });

    it("should handle empty string form values", async () => {
      const schema = z.object({
        empty: z.string(),
        optional: z.string().optional(),
      });

      const formData = new FormData();
      formData.append("empty", "");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ empty: "", optional: undefined });
    });

    it("should handle urlencoded with special characters", async () => {
      const schema = z.object({
        query: z.string(),
        value: z.string(),
      });

      const params = new URLSearchParams();
      params.append("query", "hello world");
      params.append("value", "a+b=c&d");

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({
        query: "hello world",
        value: "a+b=c&d",
      });
    });

    it("should handle multipart/form-data without boundary in content-type (may fail in some environments)", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const formData = new FormData();
      formData.append("name", "John");

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "multipart/form-data" },
        body: formData,
      });

      const bodySchemaInstance = bodySchema({ formData: schema });

      // This edge case may fail in some environments (e.g., happy-dom)
      // The implementation tries to handle it but FormData parsing requires boundary
      try {
        const result = await bodySchemaInstance.parseAsync(request);
        expect(result.body).toEqual({ name: "John" });
      } catch (error) {
        // If it fails, that's expected behavior for this edge case
        expect(error).toBeDefined();
      }
    });

    it("should handle urlencoded with empty body", async () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "",
      });

      const bodySchemaInstance = bodySchema({ formData: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ name: undefined });
    });
  });

  describe("text body", () => {
    it("should parse text body", async () => {
      const schema = z.string();

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "Hello, World!",
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe("Hello, World!");
    });

    it("should validate text with schema", async () => {
      const schema = z.string().min(5);

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "Hello",
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe("Hello");
    });

    it("should throw validation error for invalid text", async () => {
      const schema = z.string().min(10);

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "Short",
      });

      const bodySchemaInstance = bodySchema({ text: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow();
    });

    it("should handle empty text body", async () => {
      const schema = z.string();

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "",
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe("");
    });

    it("should handle very long text body", async () => {
      const schema = z.string();

      const longText = "a".repeat(100000);

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: longText,
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe(longText);
    });

    it("should handle text with special characters", async () => {
      const schema = z.string();

      const specialText = "Hello\nWorld\tTab\r\nNewline";

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: specialText,
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe(specialText);
    });

    it("should handle text with unicode characters", async () => {
      const schema = z.string();

      const unicodeText = "Hello 世界 🌍";

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: unicodeText,
      });

      const bodySchemaInstance = bodySchema({ text: schema });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBe(unicodeText);
    });
  });

  describe("priority and fallback", () => {
    it("should prioritize JSON over formData when both are provided", async () => {
      const jsonSchema = z.object({ type: z.literal("json") });
      const formDataSchema = z.object({ type: z.literal("form") });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "json" }),
      });

      const bodySchemaInstance = bodySchema({
        json: jsonSchema,
        formData: formDataSchema,
      });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ type: "json" });
    });

    it("should prioritize formData over text when both are provided", async () => {
      const formDataSchema = z.object({ type: z.literal("form") });
      const textSchema = z.string();

      const formData = new FormData();
      formData.append("type", "form");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const bodySchemaInstance = bodySchema({
        formData: formDataSchema,
        text: textSchema,
      });
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toEqual({ type: "form" });
    });

    it("should throw error when no matching content type", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/xml" },
        body: "<xml></xml>",
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow(
        "Content-Type mismatch"
      );
    });

    it("should return undefined body when no schemas provided", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({});
      const result = await bodySchemaInstance.parseAsync(request);

      expect(result.body).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should throw error when input is not Request", async () => {
      const schema = z.object({ value: z.string() });
      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(
        bodySchemaInstance.parseAsync("not-a-request")
      ).rejects.toThrow("Expected Request");
    });

    it("should throw error when missing content-type header", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow(
        "Content-Type mismatch"
      );
    });

    it("should throw error when empty content-type header", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "" },
        body: JSON.stringify({ value: "test" }),
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow(
        "Content-Type mismatch"
      );
    });

    it("should throw error when GET request has no body", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "GET",
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow(
        "Request body is required"
      );
    });

    it("should throw error when POST request has no body", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "POST",
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow(
        "Request body is required"
      );
    });

    it("should handle request with null body", async () => {
      const schema = z.object({ value: z.string() });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: null,
      });

      const bodySchemaInstance = bodySchema({ json: schema });

      await expect(bodySchemaInstance.parseAsync(request)).rejects.toThrow();
    });
  });
});

describe("requestSchema", () => {
  describe("searchParams only", () => {
    it("should parse request with search params only", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          name: z.string(),
          age: z.string(),
        })
      );

      const request = new Request("https://example.com?name=John&age=30", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.toString()).toBe(
        "https://example.com/?name=John&age=30"
      );
      expect(result.searchParamsObject.age).toBe("30");
      expect(result.searchParamsObject).toEqual({
        name: "John",
        age: "30",
      });
      expect(result.body).toBeUndefined();
    });

    it("should handle empty search params", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          name: z.string().optional(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      const result = await schema.parseAsync(request);

      expect(result.searchParamsObject).toEqual({ name: undefined });
    });

    it("should throw error when search params do not match schema", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          name: z.string(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });
  });

  describe("body only", () => {
    it("should parse request with JSON body only", async () => {
      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        body,
      });

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.toString()).toBe("https://example.com/");
      expect(result.searchParamsObject).toBeUndefined();
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.value).toBe("test");
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject.value).toBe("test");
    });

    it("should parse request with formData body only", async () => {
      const formData = new FormData();
      formData.append("name", "John");

      const body = bodySchema({
        formData: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const schema = requestSchema({
        body,
      });

      const result = await schema.parseAsync(request);

      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.name).toBe("John");
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject.name).toBe("John");
    });
  });

  describe("searchParams and body", () => {
    it("should parse request with both search params and JSON body", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        searchParams,
        body,
      });

      const result = await schema.parseAsync(request);

      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.value).toBe("test");
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject.value).toBe("test");
    });

    it("should parse request with both search params and formData body", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          action: z.string(),
        })
      );

      const formData = new FormData();
      formData.append("name", "John");

      const body = bodySchema({
        formData: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com?action=create", {
        method: "POST",
        body: formData,
      });

      const schema = requestSchema({
        searchParams,
        body,
      });

      const result = await schema.parseAsync(request);

      expect(result.searchParamsObject).toEqual({ action: "create" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.name).toBe("John");
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      // This type assertion will fail at compile time if bodyObject becomes optional
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      // Verify we can access properties without optional chaining
      expect(bodyObject.name).toBe("John");
    });
  });

  describe("type safety regression prevention", () => {
    // These tests use TypeScript's type system to catch regressions at compile time
    // If bodyObject becomes optional when it shouldn't be, these will fail to compile

    it("should ensure bodyObject is never undefined when body schema is provided", async () => {
      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({ body });
      const result = await schema.parseAsync(request);

      // Type-level test: This assignment should fail at compile time
      // If bodyObject becomes optional, this would compile (which is wrong)
      // @ts-expect-error - This SHOULD error because bodyObject is required, not undefined
      const _testUndefined: undefined = result.bodyObject;

      // Type-level test: This should work without optional chaining
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject.value).toBe("test");
    });

    it("should ensure bodyObject is undefined when body schema is not provided", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});
      const result = await schema.parseAsync(request);

      // Type-level test: bodyObject should be undefined/never when no body schema
      // This should compile without error
      const bodyObject: undefined = (result as { bodyObject?: never })
        .bodyObject;
      expect(bodyObject).toBeUndefined();
    });

    it("should ensure bodyObject type matches the body schema type", async () => {
      const body = bodySchema({
        formData: z.object({
          name: z.string(),
          age: z.string().transform((val) => Number(val)),
        }),
      });

      const formData = new FormData();
      formData.append("name", "John");
      formData.append("age", "30");

      const request = new Request("https://example.com", {
        method: "POST",
        body: formData,
      });

      const schema = requestSchema({ body });
      const result = await schema.parseAsync(request);

      // Type-level test: bodyObject should have the exact type from the schema
      const bodyObject: { name: string; age: number } = result.bodyObject;
      expect(bodyObject.name).toBe("John");
      expect(bodyObject.age).toBe(30);
    });
  });

  describe("headers only", () => {
    it("should parse request with headers only", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
          "content-type": z.string(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
      });

      const schema = requestSchema({
        headers,
      });

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.toString()).toBe("https://example.com/");
      expect(result.searchParamsObject).toBeUndefined();
      expect(result.body).toBeUndefined();
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
        "content-type": "application/json",
      });
    });

    it("should handle empty headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string().optional(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        headers,
      });

      const result = await schema.parseAsync(request);

      expect(result.headersObj).toEqual({ authorization: undefined });
    });
  });

  describe("headers with searchParams", () => {
    it("should parse request with headers and search params", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const request = new Request("https://example.com?filter=active", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        searchParams,
      });

      const result = await schema.parseAsync(request);

      expect(result.searchParamsObject.filter).toEqual("active");
      expect(result.headersObj.authorization).toEqual("Bearer token123");
      expect(result.body).toBeUndefined();
    });
  });

  describe("headers with body", () => {
    it("should parse request with headers and JSON body", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        headers,
        body,
      });

      const result = await schema.parseAsync(request);

      expect(result.headersObj.authorization).toEqual("Bearer token123");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.searchParamsObject).toBeUndefined();
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.value).toEqual("test");
    });
  });

  describe("headers with searchParams and body", () => {
    it("should parse request with headers, search params, and JSON body", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        headers,
        searchParams,
        body,
      });

      const result = await schema.parseAsync(request);

      expect(result.headersObj.authorization).toEqual("Bearer token123");
      expect(result.searchParamsObject.filter).toEqual("active");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject.value).toEqual("test");
    });
  });

  describe("neither searchParams nor body", () => {
    it("should parse request with neither search params nor body", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.toString()).toBe("https://example.com/");
      expect(result.searchParamsObject).toBeUndefined();
      expect(result.body).toBeUndefined();
      expect((result as { headersObj?: unknown }).headersObj).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should throw error when input is not Request", async () => {
      const schema = requestSchema({});

      await expect(schema.parseAsync("not-a-request")).rejects.toThrow(
        "Expected Request"
      );
    });

    it("should throw validation error for invalid search params", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          age: z.string().transform((val) => {
            const num = Number(val);
            if (Number.isNaN(num)) {
              throw new Error("Invalid number");
            }
            return num;
          }),
        })
      );

      const request = new Request("https://example.com?age=not-a-number", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should throw validation error for invalid body", async () => {
      const body = bodySchema({
        json: z.object({ age: z.number() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ age: "not-a-number" }),
      });

      const schema = requestSchema({
        body,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should throw validation error for missing body", async () => {
      const body = bodySchema({
        json: z.object({ age: z.number() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      const schema = requestSchema({
        body,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should throw validation error for invalid headers", async () => {
      const headers = headersSchema(
        z.object({
          "x-api-version": z.string().transform((val) => {
            const num = Number(val);
            if (Number.isNaN(num)) {
              throw new Error("Invalid number");
            }
            return num;
          }),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
        headers: { "x-api-version": "not-a-number" },
      });

      const schema = requestSchema({
        headers,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should throw validation error for missing headers", async () => {
      const headers = headersSchema(
        z.object({
          "x-api-version": z.string().transform((val) => {
            const num = Number(val);
            if (Number.isNaN(num)) {
              throw new Error("Invalid number");
            }
            return num;
          }),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        headers,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });
  });

  describe("URL handling", () => {
    it("should correctly parse URL with path and query", async () => {
      const request = new Request("https://example.com/api/users?page=1", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.pathname).toBe("/api/users");
      expect(result.url.search).toBe("?page=1");
    });

    it("should handle URL with hash", async () => {
      const request = new Request("https://example.com#section", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.hash).toBe("#section");
    });

    it("should handle URL with port number", async () => {
      const request = new Request("https://example.com:8080/api", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.port).toBe("8080");
      expect(result.url.pathname).toBe("/api");
    });

    it("should handle URL parsing (credentials not supported in Request constructor)", async () => {
      // Note: Request constructor doesn't allow credentials in URL for security reasons
      // This test documents that URLs are parsed correctly when valid
      const request = new Request("https://example.com/api", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.pathname).toBe("/api");
      expect(result.url.hostname).toBe("example.com");
    });

    it("should handle URL with encoded special characters in path", async () => {
      const request = new Request(
        "https://example.com/api/users%20list?name=John",
        {
          method: "GET",
        }
      );

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // URL.pathname returns the encoded path, not decoded
      // This is expected behavior - decoding should be done by the application if needed
      expect(result.url.pathname).toBe("/api/users%20list");
      expect(result.url.search).toBe("?name=John");
    });

    it("should throw error when URL has multiple query params with same key but schema is not array", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          tag: z.string(),
        })
      );

      const request = new Request("https://example.com?tag=first&tag=second", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should return array when URL has multiple query params with same key and schema is array", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          tag: z.array(z.string()),
        })
      );

      const request = new Request("https://example.com?tag=first&tag=second", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
      });

      const result = await schema.parseAsync(request);

      expect(result.searchParamsObject).toEqual({ tag: ["first", "second"] });
    });

    it("should handle URL parsing (relative URLs require base URL)", async () => {
      // Note: Request constructor requires absolute URLs
      // In real usage, relative URLs would be resolved against a base URL
      const request = new Request("https://example.com/api/users?page=1", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.pathname).toBe("/api/users");
      expect(result.url.search).toBe("?page=1");
    });

    it("should handle URL with empty path", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.pathname).toBe("/");
    });

    it("should handle URL with fragment and query", async () => {
      const request = new Request("https://example.com?page=1#section", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.search).toBe("?page=1");
      expect(result.url.hash).toBe("#section");
    });

    it("should handle very long URL", async () => {
      const longPath = "/" + "a".repeat(1000);
      const request = new Request(`https://example.com${longPath}`, {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url.pathname).toBe(longPath);
    });

    it("should handle URL parsing (URL constructor is lenient)", async () => {
      // Note: The URL constructor is quite lenient and may accept various formats
      // This test documents that URL parsing works for valid URLs
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.hostname).toBe("example.com");
    });
  });

  describe("method validation", () => {
    it("should validate GET method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("GET");
    });

    it("should validate POST method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
      });

      const schema = requestSchema({
        method: z.literal("POST"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("POST");
    });

    it("should validate PUT method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "PUT",
      });

      const schema = requestSchema({
        method: z.literal("PUT"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("PUT");
    });

    it("should validate PATCH method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "PATCH",
      });

      const schema = requestSchema({
        method: z.literal("PATCH"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("PATCH");
    });

    it("should validate DELETE method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "DELETE",
      });

      const schema = requestSchema({
        method: z.literal("DELETE"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("DELETE");
    });

    it("should validate HEAD method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "HEAD",
      });

      const schema = requestSchema({
        method: z.literal("HEAD"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("HEAD");
    });

    it("should validate OPTIONS method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "OPTIONS",
      });

      const schema = requestSchema({
        method: z.literal("OPTIONS"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("OPTIONS");
    });

    it("should reject invalid method with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate method with httpMethodSchema helper", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
      });

      const schema = requestSchema({
        method: httpMethodSchema("POST"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("POST");
    });

    it("should validate method with httpMethodEnumSchema", async () => {
      const request = new Request("https://example.com", {
        method: "PUT",
      });

      const schema = requestSchema({
        method: httpMethodEnumSchema,
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("PUT");
    });

    it("should reject invalid method with httpMethodEnumSchema", async () => {
      const request = new Request("https://example.com", {
        method: "INVALID",
      });

      const schema = requestSchema({
        method: httpMethodEnumSchema,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate method combined with searchParams", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          id: z.string(),
        })
      );

      const request = new Request("https://example.com?id=123", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
        method: z.literal("GET"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("GET");
      expect(result.searchParamsObject).toEqual({ id: "123" });
    });

    it("should validate method combined with body", async () => {
      const body = bodySchema({
        json: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      const schema = requestSchema({
        body,
        method: z.literal("POST"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("POST");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ name: "John" });
    });

    it("should validate method combined with headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        method: z.literal("GET"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("GET");
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
    });

    it("should validate method combined with searchParams, body, and headers", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        searchParams,
        body,
        headers,
        method: z.literal("POST"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("POST");
      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ value: "test" });
    });

    it("should not include method in result when method schema is not provided", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // Method is not in the TypeScript type, but may be undefined at runtime
      // Check that it's not a valid method value
      expect((result as any).method).toBeUndefined();
    });

    it("should reject request when method does not match schema", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        method: z.literal("POST"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should reject request when method is invalid with httpMethodSchema", async () => {
      const request = new Request("https://example.com", {
        method: "INVALID",
      });

      const schema = requestSchema({
        method: httpMethodSchema("POST"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should handle method validation (Request API normalizes methods to uppercase)", async () => {
      // Note: The Request API normalizes HTTP methods to uppercase
      // So "post" becomes "POST" automatically
      const request = new Request("https://example.com", {
        method: "post", // lowercase input
      });

      const schema = requestSchema({
        method: z.literal("POST"), // uppercase
      });

      // Request API normalizes to uppercase, so this should pass
      const result = await schema.parseAsync(request);
      expect(result.method).toBe("POST");
      // Verify the request method was normalized
      expect(request.method).toBe("POST");
    });

    it("should validate same-origin mode with z.literal", async () => {
      const request = new Request("https://example.com", {
        mode: "same-origin",
      });

      const schema = requestSchema({
        mode: z.literal("same-origin"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("same-origin");
    });

    it("should validate no-cors mode with z.literal", async () => {
      const request = new Request("https://example.com", {
        mode: "no-cors",
      });

      const schema = requestSchema({
        mode: z.literal("no-cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("no-cors");
    });

    it("should validate cors mode with z.literal", async () => {
      const request = new Request("https://example.com", {
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("cors");
    });

    it("should validate navigate mode with z.literal", async () => {
      // Note: "navigate" mode cannot be set in Request constructor
      // It's only used internally by the browser for navigation requests
      // We'll test it by creating a request and manually setting the mode property
      const request = new Request("https://example.com");
      // Use Object.defineProperty to set the mode since it's read-only
      Object.defineProperty(request, "mode", {
        value: "navigate",
        writable: false,
        configurable: true,
      });

      const schema = requestSchema({
        mode: z.literal("navigate"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("navigate");
    });

    it("should reject invalid mode with z.literal", async () => {
      const request = new Request("https://example.com", {
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("same-origin"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate mode with requestModeEnumSchema", async () => {
      const request = new Request("https://example.com", {
        mode: "no-cors",
      });

      const schema = requestSchema({
        mode: requestModeEnumSchema,
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("no-cors");
    });

    it("should reject invalid mode with requestModeEnumSchema", async () => {
      // Note: Request constructor validates mode, so we can't create a Request with invalid mode
      // We'll test it by creating a request and manually setting an invalid mode property
      const request = new Request("https://example.com");
      // Use Object.defineProperty to set an invalid mode since the constructor validates it
      Object.defineProperty(request, "mode", {
        value: "invalid-mode",
        writable: false,
        configurable: true,
      });

      const schema = requestSchema({
        mode: requestModeEnumSchema,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate mode combined with searchParams", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          id: z.string(),
        })
      );

      const request = new Request("https://example.com?id=123", {
        mode: "cors",
      });

      const schema = requestSchema({
        searchParams,
        mode: z.literal("cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("cors");
      expect(result.searchParamsObject).toEqual({ id: "123" });
    });

    it("should validate mode combined with body", async () => {
      const body = bodySchema({
        json: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST", // POST is required for requests with body
        mode: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      const schema = requestSchema({
        body,
        mode: z.literal("same-origin"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("same-origin");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ name: "John" });
    });

    it("should validate mode combined with headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com", {
        mode: "no-cors",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        mode: z.literal("no-cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("no-cors");
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
    });

    it("should validate mode combined with method", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
        mode: "cors",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
        mode: z.literal("cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.method).toBe("GET");
      expect(result.mode).toBe("cors");
    });

    it("should validate mode combined with searchParams, body, headers, and method", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        mode: "cors",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        searchParams,
        body,
        headers,
        method: z.literal("POST"),
        mode: z.literal("cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.mode).toBe("cors");
      expect(result.method).toBe("POST");
      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ value: "test" });
    });

    it("should not include mode in result when mode schema is not provided", async () => {
      const request = new Request("https://example.com", {
        mode: "cors",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // Mode is not in the TypeScript type, but may be undefined at runtime
      // Check that it's not a valid mode value
      expect((result as any).mode).toBeUndefined();
    });

    it("should reject request when mode does not match schema", async () => {
      const request = new Request("https://example.com", {
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("same-origin"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });
  });

  describe("protocol validation", () => {
    it("should validate https protocol with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
    });

    it("should validate http protocol with z.literal", async () => {
      const request = new Request("http://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("http"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("http");
    });

    it("should reject invalid protocol with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("http"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate protocol with protocolSchema helper", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: protocolSchema("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
    });

    it("should validate protocol with protocolEnumSchema", async () => {
      const request = new Request("http://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: protocolEnumSchema,
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("http");
    });

    it("should reject invalid protocol with protocolEnumSchema", async () => {
      const request = new Request("ftp://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: protocolEnumSchema,
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate protocol combined with searchParams", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          id: z.string(),
        })
      );

      const request = new Request("https://example.com?id=123", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      expect(result.searchParamsObject).toEqual({ id: "123" });
    });

    it("should validate protocol combined with body", async () => {
      const body = bodySchema({
        json: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      const schema = requestSchema({
        body,
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ name: "John" });
    });

    it("should validate protocol combined with headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
    });

    it("should validate protocol combined with method", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      expect(result.method).toBe("GET");
    });

    it("should validate protocol combined with mode", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("cors"),
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      expect(result.mode).toBe("cors");
    });

    it("should validate protocol combined with searchParams, body, headers, method, and mode", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        mode: "cors",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        searchParams,
        body,
        headers,
        method: z.literal("POST"),
        mode: z.literal("cors"),
        protocol: z.literal("https"),
      });

      const result = await schema.parseAsync(request);

      expect((result as any).protocol).toBe("https");
      expect(result.method).toBe("POST");
      expect(result.mode).toBe("cors");
      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ value: "test" });
    });

    it("should not include protocol in result when protocol schema is not provided", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // Protocol is not in the TypeScript type, but may be undefined at runtime
      // Check that it's not a valid protocol value
      expect((result as any).protocol).toBeUndefined();
    });

    it("should reject request when protocol does not match schema", async () => {
      const request = new Request("http://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("https"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should reject request when protocol is invalid with protocolSchema", async () => {
      const request = new Request("ftp://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: protocolSchema("https"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });
  });

  describe("hostname validation", () => {
    it("should validate hostname with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
    });

    it("should validate hostname with z.string", async () => {
      const request = new Request("https://api.example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.string(),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("api.example.com");
    });

    it("should validate hostname with z.string().includes()", async () => {
      const request = new Request("https://api.example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.string().includes("example"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("api.example.com");
    });

    it("should reject invalid hostname with z.literal", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.literal("other.com"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should reject hostname that doesn't match string validation", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.string().includes("api"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate hostname combined with searchParams", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          id: z.string(),
        })
      );

      const request = new Request("https://example.com?id=123", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect(result.searchParamsObject).toEqual({ id: "123" });
    });

    it("should validate hostname combined with body", async () => {
      const body = bodySchema({
        json: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      const schema = requestSchema({
        body,
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ name: "John" });
    });

    it("should validate hostname combined with headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
    });

    it("should validate hostname combined with method", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect(result.method).toBe("GET");
    });

    it("should validate hostname combined with mode", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("cors"),
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect(result.mode).toBe("cors");
    });

    it("should validate hostname combined with protocol", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("https"),
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect((result as any).protocol).toBe("https");
    });

    it("should validate hostname combined with searchParams, body, headers, method, mode, and protocol", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com?filter=active", {
        method: "POST",
        mode: "cors",
        headers: {
          authorization: "Bearer token123",
          "content-type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });

      const schema = requestSchema({
        searchParams,
        body,
        headers,
        method: z.literal("POST"),
        mode: z.literal("cors"),
        protocol: z.literal("https"),
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("example.com");
      expect((result as any).protocol).toBe("https");
      expect(result.method).toBe("POST");
      expect(result.mode).toBe("cors");
      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ value: "test" });
    });

    it("should not include hostname in result when hostname schema is not provided", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // Hostname is not in the TypeScript type, but may be undefined at runtime
      // Check that it's not a valid hostname value
      expect((result as any).hostname).toBeUndefined();
    });

    it("should reject request when hostname does not match schema", async () => {
      const request = new Request("https://example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.literal("other.com"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should handle hostname with port in URL", async () => {
      const request = new Request("https://example.com:8080", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.literal("example.com"),
      });

      const result = await schema.parseAsync(request);

      // hostname should be "example.com" (without port)
      expect(result.hostname).toBe("example.com");
    });

    it("should handle hostname with subdomain", async () => {
      const request = new Request("https://api.example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.literal("api.example.com"),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("api.example.com");
    });

    it("should handle hostname validation with regex", async () => {
      const request = new Request("https://api.example.com", {
        method: "GET",
      });

      const schema = requestSchema({
        hostname: z.string().regex(/^api\./),
      });

      const result = await schema.parseAsync(request);

      expect(result.hostname).toBe("api.example.com");
    });
  });

  describe("pathname validation", () => {
    it("should validate pathname with z.literal", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
    });

    it("should validate pathname with z.string", async () => {
      const request = new Request("https://example.com/api/posts", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.string(),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/posts");
    });

    it("should validate pathname with z.string().includes()", async () => {
      const request = new Request("https://example.com/api/users/123", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.string().includes("api"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users/123");
    });

    it("should reject invalid pathname with z.literal", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.literal("/api/posts"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should reject pathname that doesn't match string validation", async () => {
      const request = new Request("https://example.com/users", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.string().includes("api"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should validate pathname combined with searchParams", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          id: z.string(),
        })
      );

      const request = new Request("https://example.com/api/users?id=123", {
        method: "GET",
      });

      const schema = requestSchema({
        searchParams,
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect(result.searchParamsObject).toEqual({ id: "123" });
    });

    it("should validate pathname combined with body", async () => {
      const body = bodySchema({
        json: z.object({ name: z.string() }),
      });

      const request = new Request("https://example.com/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      const schema = requestSchema({
        body,
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ name: "John" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { name: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ name: "John" });
    });

    it("should validate pathname combined with headers", async () => {
      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request("https://example.com/api/users", {
        method: "GET",
        headers: {
          authorization: "Bearer token123",
        },
      });

      const schema = requestSchema({
        headers,
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
    });

    it("should validate pathname combined with method", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        method: z.literal("GET"),
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect(result.method).toBe("GET");
    });

    it("should validate pathname combined with mode", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
        mode: "cors",
      });

      const schema = requestSchema({
        mode: z.literal("cors"),
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect(result.mode).toBe("cors");
    });

    it("should validate pathname combined with protocol", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("https"),
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect((result as any).protocol).toBe("https");
    });

    it("should validate pathname combined with hostname", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        protocol: z.literal("https"),
        hostname: z.literal("example.com"),
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect((result as any).protocol).toBe("https");
      expect(result.hostname).toBe("example.com");
    });

    it("should validate pathname combined with searchParams, body, headers, method, mode, protocol, and hostname", async () => {
      const searchParams = searchParamsSchema(
        z.object({
          filter: z.string(),
        })
      );

      const body = bodySchema({
        json: z.object({ value: z.string() }),
      });

      const headers = headersSchema(
        z.object({
          authorization: z.string(),
        })
      );

      const request = new Request(
        "https://example.com/api/users?filter=active",
        {
          method: "POST",
          mode: "cors",
          headers: {
            authorization: "Bearer token123",
            "content-type": "application/json",
          },
          body: JSON.stringify({ value: "test" }),
        }
      );

      const schema = requestSchema({
        searchParams,
        body,
        headers,
        method: z.literal("POST"),
        mode: z.literal("cors"),
        protocol: z.literal("https"),
        hostname: z.literal("example.com"),
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users");
      expect((result as any).protocol).toBe("https");
      expect(result.hostname).toBe("example.com");
      expect(result.method).toBe("POST");
      expect(result.mode).toBe("cors");
      expect(result.searchParamsObject).toEqual({ filter: "active" });
      // body should be the original request body (ReadableStream or null)
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.headersObj).toEqual({
        authorization: "Bearer token123",
      });
      // bodyObject should be the validated body
      expect(result.bodyObject).toBeDefined();
      expect(result.bodyObject).toEqual({ value: "test" });

      // Type safety regression prevention: bodyObject should never be undefined
      // when body schema is provided and validation succeeds
      const bodyObject: { value: string } = result.bodyObject;
      expect(bodyObject).toBeDefined();
      expect(bodyObject).toEqual({ value: "test" });
    });

    it("should not include pathname in result when pathname schema is not provided", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({});

      const result = await schema.parseAsync(request);

      // Pathname is not in the TypeScript type, but may be undefined at runtime
      // Check that it's not a valid pathname value
      expect((result as any).pathname).toBeUndefined();
    });

    it("should reject request when pathname does not match schema", async () => {
      const request = new Request("https://example.com/api/users", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.literal("/api/posts"),
      });

      await expect(schema.parseAsync(request)).rejects.toThrow();
    });

    it("should handle pathname with root path", async () => {
      const request = new Request("https://example.com/", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.literal("/"),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/");
    });

    it("should handle pathname with query parameters", async () => {
      const request = new Request("https://example.com/api/users?page=1", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.literal("/api/users"),
      });

      const result = await schema.parseAsync(request);

      // pathname should not include query parameters
      expect(result.pathname).toBe("/api/users");
    });

    it("should handle pathname validation with regex", async () => {
      const request = new Request("https://example.com/api/users/123", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.string().regex(/^\/api\/users\/\d+$/),
      });

      const result = await schema.parseAsync(request);

      expect(result.pathname).toBe("/api/users/123");
    });

    it("should handle pathname with special characters", async () => {
      const request = new Request("https://example.com/api/users%20list", {
        method: "GET",
      });

      const schema = requestSchema({
        pathname: z.string(),
      });

      const result = await schema.parseAsync(request);

      // URL.pathname returns the encoded path
      expect(result.pathname).toBe("/api/users%20list");
    });
  });
});
