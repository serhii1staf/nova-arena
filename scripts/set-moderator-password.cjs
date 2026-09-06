const { randomBytes, scryptSync } = require("node:crypto");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: ".env.local" });

async function main() {
  const password = process.env.MODERATOR_PASSWORD;
  if (!password) throw new Error("Run scripts\\set-moderator-password.ps1 from PowerShell");
  if (password.length < 8) throw new Error("Password must contain at least 8 characters");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    await pool.query("UPDATE players SET password_hash = $1, role = 'moderator' WHERE lower(name) = lower($2)", [`${salt}:${hash}`, "kairozun"]);
    console.log("Moderator password configured");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});