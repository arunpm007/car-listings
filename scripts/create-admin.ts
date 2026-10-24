// Creates (or promotes) the FIRST admin login. Public sign-up is off; after this, admins invite
// each other from Settings → Admins.
//   pnpm admin:create you@example.com 'a-long-password'
// For the live project, keep its keys in .env.production.local (git-ignored) and run:
//   ENV_FILE=.env.production.local pnpm admin:create you@example.com 'a-long-password'
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: process.env.ENV_FILE ?? ".env.local" });

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: pnpm admin:create <email> <password>");
  process.exit(1);
}
if (password.length < 12 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
  console.error("Use a password of at least 12 characters, with letters and numbers.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error(`Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in ${process.env.ENV_FILE ?? ".env.local"}`);
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

async function findUserId(address: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === address.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

let userId = await findUserId(email);
if (userId) {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
  console.log(`Updated password for existing user ${email}`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created user ${email}`);
}

const { error } = await supabase.from("admins").upsert({ user_id: userId });
if (error) throw error;
console.log(`${email} is an admin. Sign in at /admin; the first sign-in asks them to set up two-step login.`);
console.log("For everyone after the first admin, use Settings → Admins → Invite instead.");
