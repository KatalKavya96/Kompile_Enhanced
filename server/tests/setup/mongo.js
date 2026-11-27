import { MongoMemoryServer } from "mongodb-memory-server";

// One in-memory MongoDB for the whole run. Set MONGOMS_SYSTEM_BINARY to use a
// local mongod instead of downloading one.
let server;

export async function setup({ provide }) {
  server = await MongoMemoryServer.create();
  provide("mongoUri", server.getUri());
}

export async function teardown() {
  await server?.stop();
}
