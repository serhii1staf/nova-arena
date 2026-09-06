import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

/** Профили игроков (в будущем — привязка к auth-провайдеру через externalId). */
export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull().default("player"),
    passwordHash: text("password_hash"),
    avatarId: text("avatar_id").notNull().default("pilot-blue"),
    externalId: text("external_id"),
    skinId: text("skin_id").notNull().default("nova"),
    coins: integer("coins").notNull().default(500),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("players_name_idx").on(t.name)],
);

/** Каталог скинов (сидируется из src/game/skins.ts). */
export const skins = pgTable("skins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rarity: text("rarity").notNull().default("common"),
  price: integer("price").notNull().default(0),
  primary: text("primary").notNull(),
  secondary: text("secondary").notNull(),
  accent: text("accent").notNull(),
  visor: text("visor").notNull(),
  hat: text("hat").notNull().default("none"),
});

/** Разблокированные скины игрока. */
export const playerSkins = pgTable(
  "player_skins",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    skinId: text("skin_id")
      .notNull()
      .references(() => skins.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.skinId] })],
);

/** Результаты матчей — основа лидерборда и прогрессии. */
export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    map: text("map").notNull().default("castle"),
    mode: text("mode").notNull().default("deathmatch"),
    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    headshots: integer("headshots").notNull().default(0),
    score: integer("score").notNull().default(0),
    accuracy: real("accuracy").notNull().default(0),
    durationSec: integer("duration_sec").notNull().default(0),
    won: boolean("won").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matches_player_idx").on(t.playerId), index("matches_score_idx").on(t.score)],
);

/**
 * Presence лобби: лёгкий heartbeat (upsert по playerId).
 * Под высокой нагрузкой заменяется на Redis/WebSocket-сервер, но контракт API остаётся тем же.
 */
export const lobbyPresence = pgTable(
  "lobby_presence",
  {
    playerId: integer("player_id")
      .primaryKey()
      .references(() => players.id, { onDelete: "cascade" }),
    room: text("room").notNull().default("main"),
    name: text("name").notNull(),
    skinId: text("skin_id").notNull(),
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    z: real("z").notNull().default(0),
    ry: real("ry").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lobby_presence_room_updated_idx").on(t.room, t.updatedAt)],
);

export type Player = typeof players.$inferSelect;
export type Skin = typeof skins.$inferSelect;
export type Match = typeof matches.$inferSelect;
