import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api-docs/openapi.yaml handler reads doc/openapi.yaml from disk at
  // request time. Nothing imports that file, so Next's dependency tracing would
  // not bundle it into the serverless function and the route would 500 in
  // production while working fine locally.
  outputFileTracingIncludes: {
    "/api-docs/openapi.yaml": ["./doc/openapi.yaml"],
  },
};

export default nextConfig;
