import { z, ZodError } from "zod";
import { Logger } from "@/utils/logger";

const logger = new Logger("Config:Env");

// Optional-at-build schema: don't crash builds if secrets are missing
const optionalSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

// Strict schema for runtime-only checks
const strictSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

type OptionalEnv = z.infer<typeof optionalSchema>;
type StrictEnv = z.infer<typeof strictSchema>;

// Non-throwing parse used at module import time
function parseOptional(): OptionalEnv {
  try {
    logger.info("Validating environment variables");
    const env = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    };
    const parsed = optionalSchema.parse(env);
    logger.info("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof ZodError) {
      const missingVars = error.issues.map((err) => err.path.join("."));
      logger.error("Invalid environment variables", undefined, { missingVars });
      // Do NOT throw at import/build time; return best-effort values
      return { OPENAI_API_KEY: undefined, TAVILY_API_KEY: undefined };
    }
    // On unexpected errors, still avoid crashing the build
    return { OPENAI_API_KEY: undefined, TAVILY_API_KEY: undefined };
  }
}

// Export a permissive env object for build-time import safety
export const env: OptionalEnv = parseOptional();

// Export a helper for runtime code paths that must enforce presence
export function getStrictEnv(): StrictEnv {
  try {
    const strict = strictSchema.parse({
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    });
    return strict;
  } catch (error) {
    if (error instanceof ZodError) {
      const missingVars = error.issues.map((err) => err.path.join("."));
      logger.error("Invalid environment variables", undefined, { missingVars });
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(", ")}. Please check your .env file`
      );
    }
    throw error;
  }
}
