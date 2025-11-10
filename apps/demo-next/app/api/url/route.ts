import { NextResponse } from "next/server";
import { z } from "zod";
import { requestSchema, bodySchema } from "@nicnocquee/zod-request";

const postRequestSchema = requestSchema({
  body: bodySchema({
    json: z.object({
      url: z.url("URL is required"),
    }),
  }),
});

export const POST = async (request: Request) => {
  try {
    const {
      bodyObject: { url },
    } = await postRequestSchema.parseAsync(request);
    const result = await fetchShortUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
};

const fetchShortUrl = async (url: string) => {
  const response = await fetch(
    `https://aisenseapi.com/services/v1/url_shortener/${url}`
  );
  if (!response.ok) {
    return { success: false, error: response.statusText };
  }
  const data = await response.json();
  const urlShortenerSchema = z
    .object({
      short_url: z.string(),
      expire_timestamp: z.number(),
    })
    .transform((data) => ({
      shortUrl: data.short_url,
      expireTimestamp: data.expire_timestamp,
    }));
  const validated = urlShortenerSchema.parse(data);

  return { success: true, data: validated };
};
