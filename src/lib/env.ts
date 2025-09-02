import { z } from "zod";

const serverEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().email().optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Don't throw during build if missing; API routes will validate on use.
    const fallback: ServerEnv = {
      RESEND_API_KEY: (process.env.RESEND_API_KEY as string) || "",
      EMAIL_FROM: process.env.EMAIL_FROM,
      MONGODB_URI: (process.env.MONGODB_URI as string) || "",
      MONGODB_DB: process.env.MONGODB_DB,
    } as ServerEnv;
    return fallback;
  }
  return parsed.data;
}

export const clientDefaults = {
  DEFAULT_FROM: process.env.NEXT_PUBLIC_DEFAULT_FROM || "no-reply@example.com",
};


