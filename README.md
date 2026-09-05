# Nova Arena — яркий мультяшный 3D-шутер

Web · Desktop · Mini-app. Next.js 16 (App Router) + React Three Fiber + Rapier (WASM-физика) + PostgreSQL (Drizzle ORM).

## Что внутри

| Модуль | Описание |
|---|---|
| `/` | Главное меню: позывной, выбор качества графики, вход в лобби / бой |
| `/lobby` | **Космическое лобби** (яркие пастельные цвета): парящие острова, планеты, портал в арену, гардероб скинов, 3D-лидерборд, джамп-пад, presence других игроков |
| `/arena` | **Арена «Замок»**: стены, башни, центральная цитадель с рампами, укрытия, аптечки. FPS-контроллер, hitscan-стрельба, хедшоты, боты с ИИ (патруль → line-of-sight → бой), 5-минутный deathmatch |
| `/leaderboard` | SSR-таблица лидеров (агрегация по матчам) |
| `src/game/` | Вся игровая логика (движок), не зависит от страниц — переносится в Tauri/Electron как есть |

### API (готово к вынесению в отдельный сервис)
- `POST /api/players` — создать/получить профиль; `PATCH` — сменить скин
- `GET /api/skins`, `POST /api/skins/buy` — каталог и покупка (транзакция `FOR UPDATE`)
- `POST /api/matches` — результат матча → XP, монеты, уровень
- `GET /api/leaderboard`
- `POST /api/lobby/presence` — heartbeat: upsert позиции + список игроков комнаты одним запросом (`DELETE` — выход)
- `GET /api/health`

## Оптимизация и производительность
- **Адаптивный DPR** (`PerformanceMonitor`): при просадке FPS снижается разрешение рендера, при запасе — повышается.
- **Пресеты качества** (low/medium/high): тени, размер shadow map, число ботов, бюджет частиц, антиалиасинг, число звёзд.
- **Инстансинг**: стены, зубцы, ящики, укрытия, рампы — по одному draw call на тип. Эффекты (трассеры, частицы) — 2 InstancedMesh с кольцевыми буферами, **ноль аллокаций в рантайме**.
- **Кэш материалов и геометрий** (`materials.ts`): одинаковые цвета → один материал; персонажи делят геометрии.
- **Cel-shading** (`MeshToonMaterial` + 4-ступенчатый gradient map) — дёшево и мультяшно.
- **Физика Rapier (Rust → WASM)**: фиксированный шаг 60 Гц с интерполяцией; hitscan через один физический raycast; LOS ботов — не чаще 6 раз/с со сдвигом фаз.
- **Ввод без ререндеров**: модуль `input.ts` читается прямо в `useFrame`; HUD обновляется только по событиям (zustand).
- **Процедурный звук** (Web Audio): выстрелы, попадания, шаги, музыка лобби/арены — без единого аудиофайла.
- Тач-управление (джойстик + зона обзора) для телефонов и мини-приложений; fallback drag-look, если pointer lock недоступен (iframe).

## Запуск
```bash
cp .env.example .env         # укажите DATABASE_URL
npm install
npx drizzle-kit push         # создать таблицы
npm run dev
```

## Деплой
- **GitHub**: `git init && git add . && git commit -m "init" && gh repo create nova-arena --push`. CI в `.github/workflows/ci.yml` (typecheck + build с Postgres).
- **Vercel / Railway / Fly**: задать `DATABASE_URL` (Neon, Supabase, Railway PG). Сборка стандартная `next build`.
- **Desktop (Tauri v2)**: `npm i -D @tauri-apps/cli && npx tauri init` → `devUrl: http://localhost:3000`, `frontendDist` — статический экспорт или удалённый URL. Игровой код в `src/game` не зависит от Node — WebGL/WASM работают в WebView без изменений. Для Electron аналогично.
- **Мини-приложение (Telegram/VK)**: открывается как обычный web-URL; тач-контролы уже есть; `viewport` настроен под мобильные.

## Roadmap мультиплеера (архитектура заложена)
1. **Сейчас**: presence-лобби через HTTP heartbeat (2 с) с upsert по PK и индексом `(room, updated_at)` — горизонтально масштабируется за балансировщиком, поддерживает комнаты (`room`).
2. **Шаг 2**: WebSocket-шард (Colyseus / uWebSockets / Cloudflare Durable Objects) для лобби — тот же контракт `{playerId, x, y, z, ry}`; клиент уже интерполирует позиции (`RemotePlayers`).
3. **Шаг 3**: авторитетный сервер боя — Rapier работает и на Node (`@dimforge/rapier3d`), поэтому `world.ts`/`Player.tsx` логику можно переиспользовать для серверной симуляции + client-side prediction; `players.external_id` готов для привязки к OAuth/Telegram-auth.

## Управление
WASD — движение · Мышь — обзор · ЛКМ — огонь · Space — прыжок · Shift — бег · R — перезарядка · E — взаимодействие · Esc — пауза/курсор
