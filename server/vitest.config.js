import { defineConfig } from "vitest/config";

// Two projects so unit tests run anywhere, and integration tests (which start
// an in-memory MongoDB) can be run on their own:
//   npm test                      -> both
//   npm run test:unit             -> unit only
//   npm run test:integration      -> integration only
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.js"],
          setupFiles: ["./tests/setup/env.js"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.js"],
          setupFiles: ["./tests/setup/env.js"],
          globalSetup: ["./tests/setup/mongo.js"],
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 120000,
        },
      },
    ],
  },
});
