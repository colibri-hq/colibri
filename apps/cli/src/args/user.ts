import { Args } from "@oclif/core";
import { z } from "zod";

export const userIdentifier = Args.custom<{ email: string } | { id: number }>({
  name: "user",
  async parse(input) {
    const schema = z
    .string()
    .email({
      message: "Invalid email address",
    })
    .or(z.coerce.number().int().positive().gt(0));
    const result = schema.safeParse(input);

    if (!result.success) {
      const error = result.error.issues.shift()!;

      throw new Error(`Invalid user identifier: ${error.message}`);
    }

    return Number.isNaN(Number(result.data))
      ? { email: result.data.toString() }
      : { id: Number(result.data) };
  },
  required: true,
});
