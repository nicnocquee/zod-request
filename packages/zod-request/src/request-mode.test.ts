import { describe, it, expect } from "vitest";
import {
  REQUEST_MODES,
  requestModeEnumSchema,
  requestModeSchema,
} from "./request-mode";

describe("REQUEST_MODES", () => {
  it("TEST#1: should contain all valid request modes", () => {
    expect(REQUEST_MODES).toEqual([
      "same-origin",
      "no-cors",
      "cors",
      "navigate",
    ]);
  });

  it("TEST#1: should be a readonly array (type-level)", () => {
    // as const makes it readonly at type level, not runtime frozen
    expect(REQUEST_MODES).toBeInstanceOf(Array);
    expect(REQUEST_MODES.length).toBe(4);
  });
});

describe("requestModeEnumSchema", () => {
  it("TEST#1: should parse valid request mode 'same-origin'", () => {
    const result = requestModeEnumSchema.parse("same-origin");
    expect(result).toBe("same-origin");
  });

  it("TEST#1: should parse valid request mode 'no-cors'", () => {
    const result = requestModeEnumSchema.parse("no-cors");
    expect(result).toBe("no-cors");
  });

  it("TEST#1: should parse valid request mode 'cors'", () => {
    const result = requestModeEnumSchema.parse("cors");
    expect(result).toBe("cors");
  });

  it("TEST#1: should parse valid request mode 'navigate'", () => {
    const result = requestModeEnumSchema.parse("navigate");
    expect(result).toBe("navigate");
  });

  it("TEST#1, TEST#2: should throw error for invalid request mode", () => {
    expect(() => {
      requestModeEnumSchema.parse("invalid-mode");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      requestModeEnumSchema.parse("");
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for null", () => {
    expect(() => {
      requestModeEnumSchema.parse(null);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for undefined", () => {
    expect(() => {
      requestModeEnumSchema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for number", () => {
    expect(() => {
      requestModeEnumSchema.parse(123);
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for object", () => {
    expect(() => {
      requestModeEnumSchema.parse({});
    }).toThrow();
  });

  it("TEST#1, TEST#2: should throw error for array", () => {
    expect(() => {
      requestModeEnumSchema.parse([]);
    }).toThrow();
  });

  it("TEST#1: should handle case-sensitive matching", () => {
    expect(() => {
      requestModeEnumSchema.parse("CORS");
    }).toThrow();
  });

  it("TEST#1: should handle partial matches", () => {
    expect(() => {
      requestModeEnumSchema.parse("cors-extra");
    }).toThrow();
  });

  it("TEST#1: should handle whitespace", () => {
    expect(() => {
      requestModeEnumSchema.parse(" cors ");
    }).toThrow();
  });
});

describe("requestModeSchema", () => {
  it("TEST#1: should create literal schema for 'same-origin'", () => {
    const schema = requestModeSchema("same-origin");
    const result = schema.parse("same-origin");
    expect(result).toBe("same-origin");
  });

  it("TEST#1: should create literal schema for 'no-cors'", () => {
    const schema = requestModeSchema("no-cors");
    const result = schema.parse("no-cors");
    expect(result).toBe("no-cors");
  });

  it("TEST#1: should create literal schema for 'cors'", () => {
    const schema = requestModeSchema("cors");
    const result = schema.parse("cors");
    expect(result).toBe("cors");
  });

  it("TEST#1: should create literal schema for 'navigate'", () => {
    const schema = requestModeSchema("navigate");
    const result = schema.parse("navigate");
    expect(result).toBe("navigate");
  });

  it("TEST#1, TEST#2: should throw error when creating schema with invalid mode", () => {
    expect(() => {
      requestModeSchema("invalid-mode" as any);
    }).toThrow('Invalid Request mode: "invalid-mode"');
  });

  it("TEST#1, TEST#2: should throw error with helpful message listing valid modes", () => {
    expect(() => {
      requestModeSchema("invalid" as any);
    }).toThrow(
      'Invalid Request mode: "invalid". Must be one of: same-origin, no-cors, cors, navigate'
    );
  });

  it("TEST#1, TEST#2: should throw error for empty string", () => {
    expect(() => {
      requestModeSchema("" as any);
    }).toThrow(
      'Invalid Request mode: "". Must be one of: same-origin, no-cors, cors, navigate'
    );
  });

  it("TEST#1: should reject other valid modes when using literal schema", () => {
    const schema = requestModeSchema("cors");
    expect(() => {
      schema.parse("same-origin");
    }).toThrow();
  });

  it("TEST#1: should reject other valid modes when using literal schema (no-cors)", () => {
    const schema = requestModeSchema("no-cors");
    expect(() => {
      schema.parse("cors");
    }).toThrow();
  });

  it("TEST#1: should reject invalid values when using literal schema", () => {
    const schema = requestModeSchema("cors");
    expect(() => {
      schema.parse("invalid");
    }).toThrow();
  });

  it("TEST#1: should reject null when using literal schema", () => {
    const schema = requestModeSchema("cors");
    expect(() => {
      schema.parse(null);
    }).toThrow();
  });

  it("TEST#1: should reject undefined when using literal schema", () => {
    const schema = requestModeSchema("cors");
    expect(() => {
      schema.parse(undefined);
    }).toThrow();
  });

  it("TEST#1: should work with zod refinements", () => {
    const schema = requestModeSchema("cors").refine((val) => val === "cors");
    const result = schema.parse("cors");
    expect(result).toBe("cors");
  });

  it("TEST#1: should work with zod transforms", () => {
    const schema = requestModeSchema("cors").transform((val) =>
      val.toUpperCase()
    );
    const result = schema.parse("cors");
    expect(result).toBe("CORS");
  });
});
