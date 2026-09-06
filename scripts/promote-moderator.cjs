const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query("UPDATE players SET role = $1 WHERE lower(name) = lower($2) RETURNING id, name, role", ["moderator", "kairozun"]);
    console.log(JSON.stringify(result.rows));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});