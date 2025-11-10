import { describe, it, expect } from "vitest";
import { z } from "zod";
import { headersSchema } from "./headers-schema";

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
