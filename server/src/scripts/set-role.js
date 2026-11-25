// Grant or remove the admin role. Roles can't be set through the API.
//   node src/scripts/set-role.js someone@nst.rishihood.edu.in admin
//   node src/scripts/set-role.js someone@nst.rishihood.edu.in student
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "student"].includes(role)) {
  console.error("Usage: node src/scripts/set-role.js <email> <admin|student>");
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URL);
const res = await User.updateOne({ email: email.toLowerCase() }, { $set: { role } });
console.log(res.matchedCount ? `Set ${email} to ${role}` : `No user with email ${email}`);
await mongoose.disconnect();
