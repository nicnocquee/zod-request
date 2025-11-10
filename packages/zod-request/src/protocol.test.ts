import { describe, it, expect } from "vitest";
import {
  PROTOCOLS,
  protocolEnumSchema,
  protocolSchema,
} from "./protocol";

describe("PROTOCOLS", () => {
  it("TEST#1: should contain all valid protocols", () => {
    expect(PROTOCOLS).toEqual(["http", "https"]);
  });

  it("TEST#1: should be a readonly array (type-level)", () => {
    // as const makes it readonly at type level, not runtime frozen
    expect(PROTOCOLS).toBeInstanceOf(Array);
    expect(PROTOCOLS.length).toBe(2);
  });
});

describe("protocolEnumSchema", () => {
  it("TEST#1: should parse valid protocol 'http'", () => {
    const result = protocolEnumSchema.parse("http");
    expect(result).toBe("http");
  });

  it("TEST#1: should parse valid protocol 'https'", () => {
    const result = protocolEnumSchema.parse("https");
    expect(result).toBe("https");
  });

  it("TEST#1, TEST#2: should throw error for invalid protocol", () => {
    expect(() => {
      protocolEnumSchema.parse("ftp");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      protocolEnumSchema.parse("");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for null", () => {
    expect(() => {
      protocolEnumSchema.parse(null);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for undefined", () => {
    expect(() => {
      protocolEnumSchema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for number", () => {
    expect(() => {
      protocolEnumSchema.parse(123);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for object", () => {
    expect(() => {
      protocolEnumSchema.parse({});
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for array", () => {
    expect(() => {
      protocolEnumSchema.parse([]);
    }).toThrow();
  });

  it("TEST#1: should handle case-sensitive matching", () => {
    expect(() => {
      protocolEnumSchema.parse("HTTP");
    }).toThrow();
  });

  it("TEST#1: should handle partial matches", () => {
    expect(() => {
      protocolEnumSchema.parse("http://");
    }).toThrow();
  });

  it("TEST#1: should handle whitespace", () => {
    expect(() => {
      protocolEnumSchema.parse(" http ");
    }).toThrow();
  });
});

describe("protocolSchema", () => {
  it("TEST#1: should create literal schema for 'http'", () => {
    const schema = protocolSchema("http");
    const result = schema.parse("http");
    expect(result).toBe("http");
  });

  it("TEST#1: should create literal schema for 'https'", () => {
    const schema = protocolSchema("https");
    const result = schema.parse("https");
    expect(result).toBe("https");
  });

  it("TEST#1, TEST#2: should throw error when creating schema with invalid protocol", () => {
    expect(() => {
      protocolSchema("ftp" as any);
    }).toThrow('Invalid protocol: "ftp"');
  });

  it("TEST#1, TEST#2: should throw error with helpful message listing valid protocols", () => {
    expect(() => {
      protocolSchema("invalid" as any);
    }).toThrow('Invalid protocol: "invalid". Must be one of: http, https');
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      protocolSchema("" as any);
    }).toThrow('Invalid protocol: "". Must be one of: http, https');
  });

  it("TEST#1: should reject other valid protocols when using literal schema", () => {
    const schema = protocolSchema("http");
    expect(() => {
      schema.parse("https");
    }).toThrow();
  });

  it("TEST#1: should reject other valid protocols when using literal schema (https)", () => {
    const schema = protocolSchema("https");
    expect(() => {
      schema.parse("http");
    }).toThrow();
  });

  it("TEST#1: should reject invalid values when using literal schema", () => {
    const schema = protocolSchema("http");
    expect(() => {
      schema.parse("ftp");
    }).toThrow();
  });

  it("TEST#1: should reject null when using literal schema", () => {
    const schema = protocolSchema("http");
    expect(() => {
      schema.parse(null);
    }).toThrow();
  });

  it("TEST#1: should reject undefined when using literal schema", () => {
    const schema = protocolSchema("http");
    expect(() => {
      schema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1: should work with zod refinements", () => {
    const schema = protocolSchema("http").refine((val) => val === "http");
    const result = schema.parse("http");
    expect(result).toBe("http");
  });

  it("TEST#1: should work with zod transforms", () => {
    const schema = protocolSchema("http").transform((val) => val.toUpperCase());
    const result = schema.parse("http");
    expect(result).toBe("HTTP");
  });
});

