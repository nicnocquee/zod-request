import { requestSchema, headersSchema } from "@nicnocquee/zod-request";
import { NextResponse } from "next/server";
import z from "zod";

const healthRequestSchema = requestSchema({
  headers: headersSchema(
    z.object({
      // In production, you should read the API key from an environment variable
      "x-api-key": z.string().refine((val) => val === "1234567890", {
        message: "Invalid API key",
      }),
    })
  ),
});

export const GET = async (request: Request) => {
  try {
    const validated = await healthRequestSchema.parseAsync(request);
    console.log(validated.headersObj["x-api-key"]);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map((issue) => issue.message) },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
};
