import { z, ZodError } from "zod";
import { Logger } from "@/utils/logger";

const logger = new Logger("Config:Env");

// Schema for environment variables
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  TAVILY_API_KEY: z.string().optional(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    logger.info("Validating environment variables");
    const env = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    };
    const parsed = envSchema.parse(env);
    logger.info("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof ZodError) {
      const missingVars = error.issues.map((err) => err.path.join("."));
      logger.error("Invalid environment variables", undefined, { missingVars });
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file`
      );
    }
    throw error;
  }
};

export const env = validateEnv();
