import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

function tursoApiDevPlugin(): Plugin {
  return {
    name: "turso-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/turso", (req, res) => {
        const chunks: Buffer[] = [];

        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          void (async () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8");
              const request = req as typeof req & { body?: unknown };
              request.body = body ? JSON.parse(body) : undefined;

              const response = res as typeof res & {
                status: (statusCode: number) => typeof res;
              };
              response.status = (statusCode: number) => {
                res.statusCode = statusCode;
                return res;
              };

              const module = (await import("./api/turso.js")) as {
                default: (
                  request: typeof request,
                  response: typeof response,
                ) => Promise<void>;
              };

              await module.default(request, response);
            } catch (error) {
              console.error(error);
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    error instanceof Error ? error.message : "Unknown error.",
                }),
              );
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), tursoApiDevPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
