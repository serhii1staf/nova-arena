const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: ".env.local" });

const statements = [
  `CREATE TABLE IF NOT EXISTS players (
    id serial PRIMARY KEY,
    name text NOT NULL,
    external_id text,
    skin_id text NOT NULL DEFAULT 'nova',
    coins integer NOT NULL DEFAULT 500,
    xp integer NOT NULL DEFAULT 0,
    level integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS players_name_idx ON players(name)",
  `CREATE TABLE IF NOT EXISTS skins (
    id text PRIMARY KEY,
    name text NOT NULL,
    rarity text NOT NULL DEFAULT 'common',
    price integer NOT NULL DEFAULT 0,
    "primary" text NOT NULL,
    secondary text NOT NULL,
    accent text NOT NULL,
    visor text NOT NULL,
    hat text NOT NULL DEFAULT 'none'
  )`,
  `CREATE TABLE IF NOT EXISTS player_skins (
    player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    skin_id text NOT NULL REFERENCES skins(id) ON DELETE CASCADE,
    unlocked_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, skin_id)
  )`,
  `CREATE TABLE IF NOT EXISTS matches (
    id serial PRIMARY KEY,
    player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    map text NOT NULL DEFAULT 'castle',
    mode text NOT NULL DEFAULT 'deathmatch',
    kills integer NOT NULL DEFAULT 0,
    deaths integer NOT NULL DEFAULT 0,
    headshots integer NOT NULL DEFAULT 0,
    score integer NOT NULL DEFAULT 0,
    accuracy real NOT NULL DEFAULT 0,
    duration_sec integer NOT NULL DEFAULT 0,
    won boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE INDEX IF NOT EXISTS matches_player_idx ON matches(player_id)",
  "CREATE INDEX IF NOT EXISTS matches_score_idx ON matches(score)",
  `CREATE TABLE IF NOT EXISTS lobby_presence (
    player_id integer PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    room text NOT NULL DEFAULT 'main',
    name text NOT NULL,
    skin_id text NOT NULL,
    x real NOT NULL DEFAULT 0,
    y real NOT NULL DEFAULT 0,
    z real NOT NULL DEFAULT 0,
    ry real NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE INDEX IF NOT EXISTS lobby_presence_room_updated_idx ON lobby_presence(room, updated_at)",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) await client.query(statement);
    await client.query("COMMIT");
    console.log("Database schema applied");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});