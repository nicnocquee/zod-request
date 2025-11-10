import { describe, it, expect } from "vitest";
import { z } from "zod";
import * as indexExports from "./index";

describe("index.ts", () => {
  describe("constants exports", () => {
    it("should export ERROR_EXPECTED_REQUEST", () => {
      expect(indexExports.ERROR_EXPECTED_REQUEST).toBe("Expected Request");
    });

    it("should export ERROR_EXPECTED_HEADERS", () => {
      expect(indexExports.ERROR_EXPECTED_HEADERS).toBe("Expected Headers");
    });

    it("should export ERROR_EXPECTED_URL_SEARCH_PARAMS", () => {
      expect(indexExports.ERROR_EXPECTED_URL_SEARCH_PARAMS).toBe(
        "Expected URLSearchParams or string"
      );
    });

    it("should export ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA", () => {
      expect(indexExports.ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA).toBe(
        "Unable to extract base schema from preprocessed {name} schema. This may be a Zod v4 compatibility issue."
      );
    });

    it("should export ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA", () => {
      expect(indexExports.ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA).toBe(
        'Multiple values found for parameter "{key}" but schema expects a single value. Use an array schema (e.g., z.array(z.string())) to accept multiple values.'
      );
    });
  });

  describe("protocol exports", () => {
    it("should export PROTOCOLS", () => {
      expect(indexExports.PROTOCOLS).toEqual(["http", "https"]);
    });

    it("should export protocolSchema function", () => {
      expect(typeof indexExports.protocolSchema).toBe("function");
      const schema = indexExports.protocolSchema("https");
      expect(schema.parse("https")).toBe("https");
    });

    it("should export protocolEnumSchema", () => {
      expect(indexExports.protocolEnumSchema).toBeDefined();
      expect(indexExports.protocolEnumSchema.parse("http")).toBe("http");
      expect(indexExports.protocolEnumSchema.parse("https")).toBe("https");
    });
  });

  describe("http-method exports", () => {
    it("should export HTTP_METHODS", () => {
      expect(indexExports.HTTP_METHODS).toEqual([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "HEAD",
        "OPTIONS",
      ]);
    });

    it("should export httpMethodSchema function", () => {
      expect(typeof indexExports.httpMethodSchema).toBe("function");
      const schema = indexExports.httpMethodSchema("GET");
      expect(schema.parse("GET")).toBe("GET");
    });

    it("should export httpMethodEnumSchema", () => {
      expect(indexExports.httpMethodEnumSchema).toBeDefined();
      expect(indexExports.httpMethodEnumSchema.parse("POST")).toBe("POST");
    });
  });

  describe("request-mode exports", () => {
    it("should export REQUEST_MODES", () => {
      expect(indexExports.REQUEST_MODES).toEqual([
        "same-origin",
        "no-cors",
        "cors",
        "navigate",
      ]);
    });

    it("should export requestModeSchema function", () => {
      expect(typeof indexExports.requestModeSchema).toBe("function");
      const schema = indexExports.requestModeSchema("cors");
      expect(schema.parse("cors")).toBe("cors");
    });

    it("should export requestModeEnumSchema", () => {
      expect(indexExports.requestModeEnumSchema).toBeDefined();
      expect(indexExports.requestModeEnumSchema.parse("same-origin")).toBe(
        "same-origin"
      );
    });
  });

  describe("search-params-schema exports", () => {
    it("should export searchParamsSchema function", () => {
      expect(typeof indexExports.searchParamsSchema).toBe("function");
      const schema = indexExports.searchParamsSchema(
        z.object({
          name: z.string(),
        })
      );
      const params = new URLSearchParams("name=John");
      expect(schema.parse(params)).toEqual({ name: "John" });
    });
  });

  describe("body-schema exports", () => {
    it("should export bodySchema function", () => {
      expect(typeof indexExports.bodySchema).toBe("function");
      const schema = indexExports.bodySchema({
        json: z.object({
          name: z.string(),
        }),
      });
      const request = new Request("https://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });
      return expect(schema.parseAsync(request)).resolves.toEqual({
        body: { name: "John" },
      });
    });
  });

  describe("headers-schema exports", () => {
    it("should export headersSchema function", () => {
      expect(typeof indexExports.headersSchema).toBe("function");
      const schema = indexExports.headersSchema(
        z.object({
          "content-type": z.string(),
        })
      );
      const headers = new Headers({ "content-type": "application/json" });
      expect(schema.parse(headers)).toEqual({
        "content-type": "application/json",
      });
    });
  });

  describe("request-schema exports", () => {
    it("should export requestSchema function", () => {
      expect(typeof indexExports.requestSchema).toBe("function");
      const schema = indexExports.requestSchema({
        searchParams: indexExports.searchParamsSchema(
          z.object({
            name: z.string(),
          })
        ),
      });
      const request = new Request("https://example.com?name=John", {
        method: "GET",
      });
      return expect(schema.parseAsync(request)).resolves.toMatchObject({
        url: expect.any(URL),
        searchParamsObject: { name: "John" },
      });
    });
  });

  describe("integration test - using exports from index", () => {
    it("should work with all exports together", async () => {
      const request = new Request("https://example.com/api/users?page=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer token123",
        },
        body: JSON.stringify({ name: "John", age: 30 }),
      });

      const schema = indexExports.requestSchema({
        searchParams: indexExports.searchParamsSchema(
          z.object({
            page: z.string(),
          })
        ),
        body: indexExports.bodySchema({
          json: z.object({
            name: z.string(),
            age: z.number(),
          }),
        }),
        headers: indexExports.headersSchema(
          z.object({
            authorization: z.string(),
          })
        ),
        method: indexExports.httpMethodSchema("POST"),
        protocol: indexExports.protocolSchema("https"),
        mode: indexExports.requestModeSchema("cors"),
      });

      const result = await schema.parseAsync(request);

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.toString()).toBe("https://example.com/api/users?page=1");
      expect(result.searchParamsObject).toEqual({ page: "1" });
      expect(result.bodyObject).toEqual({ name: "John", age: 30 });
      expect(result.headersObj).toEqual({ authorization: "Bearer token123" });
      expect(result.method).toBe("POST");
      expect(result.protocol).toBe("https");
      expect(result.mode).toBe("cors");
    });
  });
});

