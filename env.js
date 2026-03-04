import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.string().optional().default("8080"),
  API_KEY: z.string().min(8),
  ADMIN_KEY: z.string().min(8),
  TENANT_ID: z.string().min(1).default("demo")
});

export const env = EnvSchema.parse(process.env);
