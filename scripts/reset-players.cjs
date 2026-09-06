const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("TRUNCATE TABLE lobby_presence, matches, player_skins, players RESTART IDENTITY CASCADE");
    console.log("Players, matches, skins ownership and presence reset");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});