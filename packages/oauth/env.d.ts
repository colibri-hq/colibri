import { createAuthorizationServer } from "./src";

declare module "fastify" {
  interface FastifyInstance {
    oauth: ReturnType<typeof createAuthorizationServer>;
  }
}

export default {};
