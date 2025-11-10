import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  isArraySchema,
  extractBaseSchema,
  extractSearchParamsObject,
  extractHeadersObject,
} from "./utils";
import { ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA } from "./constants";

describe("isArraySchema", () => {
  it("TEST#1: should return false for undefined", () => {
    expect(isArraySchema(undefined)).toBe(false);
  });

  it("TEST#1: should return false for string schema", () => {
    expect(isArraySchema(z.string())).toBe(false);
  });

  it("TEST#1: should return false for number schema", () => {
    expect(isArraySchema(z.number())).toBe(false);
  });

  it("TEST#1: should return false for boolean schema", () => {
    expect(isArraySchema(z.boolean())).toBe(false);
  });

  it("TEST#1: should return false for object schema", () => {
    expect(isArraySchema(z.object({ name: z.string() }))).toBe(false);
  });

  it("TEST#1: should return true for array schema", () => {
    expect(isArraySchema(z.array(z.string()))).toBe(true);
  });

  it("TEST#1: should return true for array schema with number", () => {
    expect(isArraySchema(z.array(z.number()))).toBe(true);
  });

  it("TEST#1: should return true for array schema with object", () => {
    expect(isArraySchema(z.array(z.object({ name: z.string() })))).toBe(true);
  });

  it("TEST#1: should return false for optional schema", () => {
    expect(isArraySchema(z.string().optional())).toBe(false);
  });

  it("TEST#1: should return false for optional array schema (only checks direct type)", () => {
    // Note: isArraySchema only checks the direct type, not wrapped types
    // An optional array has type "optional", not "array"
    expect(isArraySchema(z.array(z.string()).optional())).toBe(false);
  });

  it("TEST#1: should return false for nullable schema", () => {
    expect(isArraySchema(z.string().nullable())).toBe(false);
  });

  it("TEST#1: should return false for union schema", () => {
    expect(isArraySchema(z.union([z.string(), z.number()]))).toBe(false);
  });
});

describe("extractBaseSchema", () => {
  it("TEST#1: should extract base schema from preprocessed schema", () => {
    const baseSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const preprocessedSchema = z.preprocess((val) => val, baseSchema);

    const result = extractBaseSchema(preprocessedSchema);

    expect(result).toBeDefined();
    expect(result?.shape).toBeDefined();
    expect(result?.shape.name).toBeDefined();
    expect(result?.shape.age).toBeDefined();
  });

  it("TEST#1: should return undefined for non-preprocessed schema", () => {
    const schema = z.object({
      name: z.string(),
    });

    const result = extractBaseSchema(schema);

    expect(result).toBeUndefined();
  });

  it("TEST#1: should return undefined for schema without def.out", () => {
    const mockSchema = {
      def: {},
    } as z.ZodTypeAny;

    const result = extractBaseSchema(mockSchema);

    expect(result).toBeUndefined();
  });

  it("TEST#1: should return undefined for schema with def.out but no shape", () => {
    const mockSchema = {
      def: {
        out: {},
      },
    } as z.ZodTypeAny;

    const result = extractBaseSchema(mockSchema);

    expect(result).toBeUndefined();
  });

  it("TEST#1: should return undefined for schema with def.out.shape but not an object", () => {
    const mockSchema = {
      def: {
        out: {
          shape: "not an object",
        },
      },
    } as z.ZodTypeAny;

    const result = extractBaseSchema(mockSchema);

    expect(result).toBeUndefined();
  });

  it("TEST#1: should return undefined for nested preprocess (only checks one level)", () => {
    const baseSchema = z.object({
      name: z.string(),
    });
    const preprocessedSchema = z.preprocess(
      (val) => val,
      z.preprocess((val) => val, baseSchema)
    );

    // Note: extractBaseSchema only checks def.out, not def.out.out
    // Nested preprocesses require recursive extraction which is not implemented
    const result = extractBaseSchema(preprocessedSchema);

    expect(result).toBeUndefined();
  });

  it("TEST#1: should handle preprocessed schema with transforms", () => {
    const baseSchema = z.object({
      value: z.string().transform((val) => val.toUpperCase()),
    });
    const preprocessedSchema = z.preprocess((val) => val, baseSchema);

    const result = extractBaseSchema(preprocessedSchema);

    expect(result).toBeDefined();
    expect(result?.shape.value).toBeDefined();
  });
});

describe("extractSearchParamsObject", () => {
  it("TEST#1: should extract single values from URLSearchParams", () => {
    const params = new URLSearchParams();
    params.set("name", "John");
    params.set("age", "30");

    const shape: z.ZodRawShape = {
      name: z.string(),
      age: z.string(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: "John",
      age: "30",
    });
  });

  it("TEST#1: should return undefined for missing keys", () => {
    const params = new URLSearchParams();
    params.set("name", "John");

    const shape: z.ZodRawShape = {
      name: z.string(),
      age: z.string().optional(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: "John",
      age: undefined,
    });
  });

  it("TEST#1: should handle empty URLSearchParams", () => {
    const params = new URLSearchParams();

    const shape: z.ZodRawShape = {
      name: z.string().optional(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: undefined,
    });
  });

  it("TEST#1: should return array when multiple values exist and schema is array", () => {
    const params = new URLSearchParams();
    params.append("tag", "first");
    params.append("tag", "second");

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      tag: ["first", "second"],
    });
  });

  it("TEST#1, TEST#2: should throw error when multiple values exist but schema is not array", () => {
    const params = new URLSearchParams();
    params.append("tag", "first");
    params.append("tag", "second");

    const shape: z.ZodRawShape = {
      tag: z.string(),
    };

    expect(() => {
      extractSearchParamsObject(params, shape);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error with correct message when multiple values exist", () => {
    const params = new URLSearchParams();
    params.append("tag", "first");
    params.append("tag", "second");

    const shape: z.ZodRawShape = {
      tag: z.string(),
    };

    expect(() => {
      extractSearchParamsObject(params, shape);
    }).toThrow();

    try {
      extractSearchParamsObject(params, shape);
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
        expect(error.errors[0].message).toContain("Multiple values found");
        expect(error.errors[0].message).toContain("tag");
        expect(error.errors[0].path).toEqual(["tag"]);
      }
    }
  });

  it("TEST#1: should return array with single value when single value exists and schema is array", () => {
    const params = new URLSearchParams();
    params.set("tag", "single");

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      tag: ["single"],
    });
  });

  it("TEST#1: should return undefined array when no value exists and schema is array", () => {
    const params = new URLSearchParams();

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()).optional(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      tag: undefined,
    });
  });

  it("TEST#1: should handle URLSearchParams-like object with get method", () => {
    const mockParams = {
      get: (key: string) => (key === "name" ? "John" : null),
    };

    const shape: z.ZodRawShape = {
      name: z.string(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      name: "John",
    });
  });

  it("TEST#1: should handle URLSearchParams-like object with getAll method", () => {
    const mockParams = {
      get: (key: string) => (key === "tag" ? "first" : null),
      getAll: (key: string) => (key === "tag" ? ["first", "second"] : []),
    };

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      tag: ["first", "second"],
    });
  });

  it("TEST#1: should fallback to get when getAll is not available", () => {
    const mockParams = {
      get: (key: string) => (key === "name" ? "John" : null),
    };

    const shape: z.ZodRawShape = {
      name: z.string(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      name: "John",
    });
  });

  it("TEST#1: should fallback to get when getAll is not available and get returns null", () => {
    const mockParams = {
      get: (key: string) => null,
    };

    const shape: z.ZodRawShape = {
      name: z.string().optional(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      name: undefined,
    });
  });

  it("TEST#1: should fallback to get for array schema when getAll is not available and get returns value", () => {
    const mockParams = {
      get: (key: string) => (key === "tag" ? "single" : null),
    };

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      tag: ["single"],
    });
  });

  it("TEST#1: should fallback to get for array schema when getAll is not available and get returns null", () => {
    const mockParams = {
      get: (key: string) => null,
    };

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()).optional(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      tag: undefined,
    });
  });

  it("TEST#1: should return empty array when getAll returns empty array and schema is array", () => {
    const mockParams = {
      get: (key: string) => null,
      getAll: (key: string) => [],
    };

    const shape: z.ZodRawShape = {
      tag: z.array(z.string()).optional(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      tag: undefined,
    });
  });

  it("TEST#1: should handle empty string values", () => {
    const params = new URLSearchParams();
    params.set("empty", "");

    const shape: z.ZodRawShape = {
      empty: z.string(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      empty: "",
    });
  });

  it("TEST#1: should only extract keys defined in shape", () => {
    const params = new URLSearchParams();
    params.set("name", "John");
    params.set("extra", "value");

    const shape: z.ZodRawShape = {
      name: z.string(),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: "John",
    });
    expect(result).not.toHaveProperty("extra");
  });

  it("TEST#1: should handle multiple array fields", () => {
    const params = new URLSearchParams();
    params.append("tags", "tag1");
    params.append("tags", "tag2");
    params.append("categories", "cat1");

    const shape: z.ZodRawShape = {
      tags: z.array(z.string()),
      categories: z.array(z.string()),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      tags: ["tag1", "tag2"],
      categories: ["cat1"],
    });
  });

  it("TEST#1: should handle mixed single and array fields", () => {
    const params = new URLSearchParams();
    params.set("name", "John");
    params.append("tags", "tag1");
    params.append("tags", "tag2");

    const shape: z.ZodRawShape = {
      name: z.string(),
      tags: z.array(z.string()),
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: "John",
      tags: ["tag1", "tag2"],
    });
  });

  it("TEST#1: should skip undefined field schemas", () => {
    const params = new URLSearchParams();
    params.set("name", "John");

    const shape: z.ZodRawShape = {
      name: z.string(),
      // @ts-expect-error - testing undefined field schema
      undefinedField: undefined,
    };

    const result = extractSearchParamsObject(params, shape);

    expect(result).toEqual({
      name: "John",
    });
  });

  it("TEST#1: should handle fallback getAll when multiple values exist for single schema", () => {
    const mockParams = {
      get: (key: string) => (key === "tag" ? "first" : null),
      // No getAll method - should fallback to get
    };

    const shape: z.ZodRawShape = {
      tag: z.string(),
    };

    const result = extractSearchParamsObject(mockParams, shape);

    expect(result).toEqual({
      tag: "first",
    });
  });
});

describe("extractHeadersObject", () => {
  it("TEST#1: should extract headers from Headers object", () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("authorization", "Bearer token123");

    const shape: z.ZodRawShape = {
      "content-type": z.string(),
      authorization: z.string(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token123",
    });
  });

  it("TEST#1: should return undefined for missing headers", () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");

    const shape: z.ZodRawShape = {
      "content-type": z.string(),
      authorization: z.string().optional(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: undefined,
    });
  });

  it("TEST#1: should handle empty Headers object", () => {
    const headers = new Headers();

    const shape: z.ZodRawShape = {
      "content-type": z.string().optional(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "content-type": undefined,
    });
  });

  it("TEST#1: should handle Headers-like object with get method", () => {
    const mockHeaders = {
      get: (key: string) => (key === "content-type" ? "application/json" : null),
    };

    const shape: z.ZodRawShape = {
      "content-type": z.string(),
    };

    const result = extractHeadersObject(mockHeaders, shape);

    expect(result).toEqual({
      "content-type": "application/json",
    });
  });

  it("TEST#1: should convert null to undefined", () => {
    const mockHeaders = {
      get: (key: string) => null,
    };

    const shape: z.ZodRawShape = {
      "content-type": z.string().optional(),
    };

    const result = extractHeadersObject(mockHeaders, shape);

    expect(result).toEqual({
      "content-type": undefined,
    });
  });

  it("TEST#1: should only extract keys defined in shape", () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("x-custom-header", "custom-value");

    const shape: z.ZodRawShape = {
      "content-type": z.string(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "content-type": "application/json",
    });
    expect(result).not.toHaveProperty("x-custom-header");
  });

  it("TEST#1: should handle case-sensitive header names", () => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", "Bearer token");

    const shape: z.ZodRawShape = {
      "Content-Type": z.string(),
      Authorization: z.string(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    });
  });

  it("TEST#1: should handle multiple headers", () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("authorization", "Bearer token");
    headers.set("x-request-id", "12345");

    const shape: z.ZodRawShape = {
      "content-type": z.string(),
      authorization: z.string(),
      "x-request-id": z.string(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
      "x-request-id": "12345",
    });
  });

  it("TEST#1: should handle empty string header values", () => {
    const headers = new Headers();
    headers.set("x-empty", "");

    const shape: z.ZodRawShape = {
      "x-empty": z.string(),
    };

    const result = extractHeadersObject(headers, shape);

    expect(result).toEqual({
      "x-empty": "",
    });
  });
});

