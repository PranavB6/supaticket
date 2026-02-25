import { z } from "zod";

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().min(1),
    TEST_DATABASE_URL: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
    const parsed = EnvSchema.safeParse(env);

    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
            path: i.path.join(".") || "(root)",
            message: i.message
        }));

        throw new Error(`Invalid environment configuration: ${JSON.stringify(issues)}`);
    }

    return parsed.data;
}
