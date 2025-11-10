import { describe, it, expect } from "vitest";
import {
  HTTP_METHODS,
  httpMethodEnumSchema,
  httpMethodSchema,
} from "./http-method";

describe("HTTP_METHODS", () => {
  it("TEST#1: should contain all valid HTTP methods", () => {
    expect(HTTP_METHODS).toEqual([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);
  });

  it("TEST#1: should be a readonly array (type-level)", () => {
    // as const makes it readonly at type level, not runtime frozen
    expect(HTTP_METHODS).toBeInstanceOf(Array);
    expect(HTTP_METHODS.length).toBe(7);
  });
});

describe("httpMethodEnumSchema", () => {
  it("TEST#1: should parse valid HTTP method 'GET'", () => {
    const result = httpMethodEnumSchema.parse("GET");
    expect(result).toBe("GET");
  });

  it("TEST#1: should parse valid HTTP method 'POST'", () => {
    const result = httpMethodEnumSchema.parse("POST");
    expect(result).toBe("POST");
  });

  it("TEST#1: should parse valid HTTP method 'PUT'", () => {
    const result = httpMethodEnumSchema.parse("PUT");
    expect(result).toBe("PUT");
  });

  it("TEST#1: should parse valid HTTP method 'PATCH'", () => {
    const result = httpMethodEnumSchema.parse("PATCH");
    expect(result).toBe("PATCH");
  });

  it("TEST#1: should parse valid HTTP method 'DELETE'", () => {
    const result = httpMethodEnumSchema.parse("DELETE");
    expect(result).toBe("DELETE");
  });

  it("TEST#1: should parse valid HTTP method 'HEAD'", () => {
    const result = httpMethodEnumSchema.parse("HEAD");
    expect(result).toBe("HEAD");
  });

  it("TEST#1: should parse valid HTTP method 'OPTIONS'", () => {
    const result = httpMethodEnumSchema.parse("OPTIONS");
    expect(result).toBe("OPTIONS");
  });

  it("TEST#1, TEST#2: should throw error for invalid HTTP method", () => {
    expect(() => {
      httpMethodEnumSchema.parse("INVALID");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      httpMethodEnumSchema.parse("");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for null", () => {
    expect(() => {
      httpMethodEnumSchema.parse(null);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for undefined", () => {
    expect(() => {
      httpMethodEnumSchema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for number", () => {
    expect(() => {
      httpMethodEnumSchema.parse(123);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for object", () => {
    expect(() => {
      httpMethodEnumSchema.parse({});
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for array", () => {
    expect(() => {
      httpMethodEnumSchema.parse([]);
    }).toThrow();
  });

  it("TEST#1: should handle case-sensitive matching", () => {
    expect(() => {
      httpMethodEnumSchema.parse("get");
    }).toThrow();
  });

  it("TEST#1: should handle partial matches", () => {
    expect(() => {
      httpMethodEnumSchema.parse("GET-EXTRA");
    }).toThrow();
  });

  it("TEST#1: should handle whitespace", () => {
    expect(() => {
      httpMethodEnumSchema.parse(" GET ");
    }).toThrow();
  });
});

describe("httpMethodSchema", () => {
  it("TEST#1: should create literal schema for 'GET'", () => {
    const schema = httpMethodSchema("GET");
    const result = schema.parse("GET");
    expect(result).toBe("GET");
  });

  it("TEST#1: should create literal schema for 'POST'", () => {
    const schema = httpMethodSchema("POST");
    const result = schema.parse("POST");
    expect(result).toBe("POST");
  });

  it("TEST#1: should create literal schema for 'PUT'", () => {
    const schema = httpMethodSchema("PUT");
    const result = schema.parse("PUT");
    expect(result).toBe("PUT");
  });

  it("TEST#1: should create literal schema for 'PATCH'", () => {
    const schema = httpMethodSchema("PATCH");
    const result = schema.parse("PATCH");
    expect(result).toBe("PATCH");
  });

  it("TEST#1: should create literal schema for 'DELETE'", () => {
    const schema = httpMethodSchema("DELETE");
    const result = schema.parse("DELETE");
    expect(result).toBe("DELETE");
  });

  it("TEST#1: should create literal schema for 'HEAD'", () => {
    const schema = httpMethodSchema("HEAD");
    const result = schema.parse("HEAD");
    expect(result).toBe("HEAD");
  });

  it("TEST#1: should create literal schema for 'OPTIONS'", () => {
    const schema = httpMethodSchema("OPTIONS");
    const result = schema.parse("OPTIONS");
    expect(result).toBe("OPTIONS");
  });

  it("TEST#1, TEST#2: should throw error when creating schema with invalid method", () => {
    expect(() => {
      httpMethodSchema("INVALID" as any);
    }).toThrow('Invalid HTTP method: "INVALID"');
  });

  it("TEST#1, TEST#2: should throw error with helpful message listing valid methods", () => {
    expect(() => {
      httpMethodSchema("invalid" as any);
    }).toThrow(
      'Invalid HTTP method: "invalid". Must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'
    );
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      httpMethodSchema("" as any);
    }).toThrow(
      'Invalid HTTP method: "". Must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'
    );
  });

  it("TEST#1: should reject other valid methods when using literal schema", () => {
    const schema = httpMethodSchema("GET");
    expect(() => {
      schema.parse("POST");
    }).toThrow();
  });

  it("TEST#1: should reject other valid methods when using literal schema (POST)", () => {
    const schema = httpMethodSchema("POST");
    expect(() => {
      schema.parse("GET");
    }).toThrow();
  });

  it("TEST#1: should reject invalid values when using literal schema", () => {
    const schema = httpMethodSchema("GET");
    expect(() => {
      schema.parse("invalid");
    }).toThrow();
  });

  it("TEST#1: should reject null when using literal schema", () => {
    const schema = httpMethodSchema("GET");
    expect(() => {
      schema.parse(null);
    }).toThrow();
  });

  it("TEST#1: should reject undefined when using literal schema", () => {
    const schema = httpMethodSchema("GET");
    expect(() => {
      schema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1: should work with zod refinements", () => {
    const schema = httpMethodSchema("GET").refine((val) => val === "GET");
    const result = schema.parse("GET");
    expect(result).toBe("GET");
  });

  it("TEST#1: should work with zod transforms", () => {
    const schema = httpMethodSchema("GET").transform((val) => val.toLowerCase());
    const result = schema.parse("GET");
    expect(result).toBe("get");
  });
});

