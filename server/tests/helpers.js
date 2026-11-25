import mongoose from "mongoose";
import request from "supertest";
import { inject } from "vitest";
import { User } from "../src/models/user.models.js";

export async function connectTestDb(dbName) {
  await mongoose.connect(inject("mongoUri"), { dbName });
}

export async function resetDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

let counter = 0;
export async function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    email: `student${counter}@nst.rishihood.edu.in`,
    username: `student${counter}`,
    password: "correct-horse-battery",
    isEmailVerified: true,
    ...overrides,
  });
}

// Logs in through the real endpoint and returns a supertest agent with cookies.
export async function loginAs(app, user, password = "correct-horse-battery") {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ email: user.email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.text}`);
  return agent;
}
