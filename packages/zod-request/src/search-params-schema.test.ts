import { describe, it, expect } from "vitest";
import { z } from "zod";
import { searchParamsSchema } from "./search-params-schema";

describe("searchParamsSchema", () => {
  it("TEST#1: should parse valid search params", () => {
    const schema = z.object({
      name: z.string(),
      age: z.string(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("name", "John");
    searchParams.set("age", "30");

    const result = searchParamsSchema(schema).parse(searchParams);

    // Test the properties of the search params directly to make sure the type is correct.
    expect(result.name).toBe("John");
    expect(result.age).toBe("30");
    expect(result).toEqual({
      name: "John",
      age: "30",
    });
  });

  it("TEST#1: should handle missing search params as undefined", () => {
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

  it("TEST#1, TEST#2: should throw error when input is not URLSearchParams or string", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(123);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("TEST#1: should validate schema constraints", () => {
    const schema = z.object({
      age: z.string().transform((val) => Number(val)),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("age", "30");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ age: 30 });
  });

  it("TEST#1: should handle empty search params", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const searchParams = new URLSearchParams();

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ name: undefined });
  });

  it("TEST#1: should only extract keys defined in schema", () => {
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

  it("TEST#1: should handle empty string input", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const result = searchParamsSchema(schema).parse("");

    expect(result).toEqual({ name: undefined });
  });

  it("TEST#1: should handle string with query prefix", () => {
    const schema = z.object({
      name: z.string(),
      age: z.string(),
    });

    const result = searchParamsSchema(schema).parse("?name=John&age=30");

    expect(result).toEqual({ name: "John", age: "30" });
  });

  it("TEST#1: should handle string with only query prefix", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const result = searchParamsSchema(schema).parse("?");

    expect(result).toEqual({ name: undefined });
  });

  it("TEST#1: should handle URL-encoded special characters", () => {
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

  it("TEST#1, TEST#2: should throw error when multiple values exist but schema is not array", () => {
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

  it("TEST#1: should return array when multiple values exist and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()),
    });

    const searchParams = new URLSearchParams();
    searchParams.append("tag", "first");
    searchParams.append("tag", "second");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: ["first", "second"] });
  });

  it("TEST#1: should return array with single value when single value exists and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("tag", "single");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: ["single"] });
  });

  it("TEST#1: should return undefined array when no value exists and schema is array", () => {
    const schema = z.object({
      tag: z.array(z.string()).optional(),
    });

    const searchParams = new URLSearchParams();

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ tag: undefined });
  });

  it("TEST#1: should handle object with get method (URLSearchParams-like)", () => {
    const schema = z.object({
      name: z.string(),
    });

    const mockParams = {
      get: (key: string) => (key === "name" ? "John" : null),
    };

    const result = searchParamsSchema(schema).parse(mockParams);

    expect(result).toEqual({ name: "John" });
  });

  it("TEST#1, TEST#2: should throw error for null input", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(null);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("TEST#1, TEST#2: should throw error for undefined input", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse(undefined);
    }).toThrow("Expected URLSearchParams or string");
  });

  it("TEST#1: should handle empty string values", () => {
    const schema = z.object({
      empty: z.string(),
      optional: z.string().optional(),
    });

    const searchParams = new URLSearchParams();
    searchParams.set("empty", "");

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ empty: "", optional: undefined });
  });

  it("TEST#1: should handle very long query strings", () => {
    const schema = z.object({
      long: z.string(),
    });

    const longValue = "a".repeat(10000);
    const searchParams = new URLSearchParams();
    searchParams.set("long", longValue);

    const result = searchParamsSchema(schema).parse(searchParams);

    expect(result).toEqual({ long: longValue });
  });

  it("TEST#1, TEST#2: should handle object without get method", () => {
    const schema = z.object({
      name: z.string(),
    });

    const schemaWithPreprocess = searchParamsSchema(schema);

    expect(() => {
      schemaWithPreprocess.parse({ name: "John" });
    }).toThrow("Expected URLSearchParams or string");
  });
});
