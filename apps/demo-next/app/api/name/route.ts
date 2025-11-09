import { NextResponse } from "next/server";
import { z } from "zod";
import { requestSchema, searchParamsSchema } from "@nicnocquee/zod-request";

const getRequestSchema = requestSchema({
  searchParams: searchParamsSchema(
    z.object({
      name: z
        .string("Name is required")
        .min(1, "Name is required")
        .max(100, "Name is too long"),
    })
  ),
});

export const GET = async (request: Request) => {
  try {
    const validated = await getRequestSchema.parseAsync(request);
    const name = validated.searchParamsObject.name;
    const processedName = await processName(name);
    return NextResponse.json({ success: true, data: processedName });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
};

/**
 * Process the name.
 * @param {name} name - The name to process.
 * @returns The processed name.
 */
const processName = async (name: string) => {
  console.log(name);
  return name.toUpperCase();
};
