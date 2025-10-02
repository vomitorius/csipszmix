# TotoMatch AI – Heti magyar totó tippelő rendszer (Nuxt 3 + Supabase)

> **Cél**: egy olyan nyílt forráskódú alkalmazás, amely a heti magyar totó szelvényen szereplő mérkőzések csapataihoz kapcsolódó nyílt webes forrásokat automatikusan felkutatja, szövegesen elemzi (hírek, sérülések, formák, hiányzók), majd ezek alapján javasolt kimeneteleket (1/X/2) és variációkat generál egy megadott keretösszegre. A rendszer ingyenesen elérhető (vagy helyben futtatható) AI modelleket preferál.

---

## 1) Fő követelmények

- **Input**: adott heti magyar totó szelvény (meccslista – csapatnevek, dátumok, bajnokságok).
- **Feldolgozás**:
  - Crawler/scraper felkutatja a releváns cikkeket, kluboldalakat, hírforrásokat (HU/EN),
  - NLP pipeline: tisztítás → nyelvfelismerés → összegzés → entitás- és állításkinyerés (sérülések, eltiltások, forma),
  - RAG-alapú kérdés–válasz: „Mely információk befolyásolják leginkább a mérkőzés kimenetelét?”
  - Predikció (1/X/2) + magyarázat (feature importance, hivatkozások).
- **Output**:
  - Alap tipposzlop (13/14 meccsre),
  - Variáció-generálás költségkeretre (pl. n darab szelvény, fedezeti stratégia),
  - Átlátható indoklás és forráshivatkozások (URL, cím, dátum),
  - Export: CSV/JSON; opcionálisan PDF.
- **Nem-cél**: sportfogadási biztos nyereség; valós idejű eredménykövetés.
- **Jog & etika**: robots.txt tiszteletben tartása, források megjelölése, szerzői jogok betartása.

---

## 2) Architektúra áttekintés

```
[Nuxt 3 UI] ──calls──> [Nuxt Nitro API routes]
                     │
                     ├──> [Job Queue] ──> [Crawler/Extractor Workers] ──> [Normalizer]
                     │                                                  │
                     │                                                  └──> [Embeddings + Vector DB]
                     │                                                            │
                     └──<────────────────────────────────────────── [RAG/LLM Inference]
                                                                │         │
                                                                │         └──> [Predictor + Variants]
                                                                │
                                                        [Supabase (Postgres + Storage)]
```

**Fő komponensek**
- **Nuxt 3 (SSR)**: UI + Admin + Nitro API.
- **Crawler/Extractor**: Playwright + Crawl4AI (vagy Cheerio+JSDOM), RSS/Atom fallback.
- **NLP/RAG**: Ollama (helyi) + open-source modellek; embeddings a DB-ben.
- **Vector réteg**: Supabase pgvector bővítmény.
- **Scheduler**: Supabase Edge Functions + Cron, vagy GitHub Actions.

---

## 3) Technológiák

- **Frontend**: Nuxt 3, Vue 3, TailwindCSS, Pinia.
- **Backend**: Nuxt Nitro server routes, TypeScript.
- **Scraping**: Playwright (dinamikus), Crawl4AI (LLM-ready tisztítás), RSS/Feedparser.
- **NLP/LLM** (ingyenes/nyílt):
  - **Ollama** helyben: `llama3.1:8b`, `qwen2.5:7b`, `mistral:7b`
  - **Embedding**: `nomic-embed-text` vagy `bge-small-en-v1.5` (van magyar támogatásuk általános szinten)
  - **Reranker**: `bge-reranker-base`
- **DB**: Supabase Postgres + pgvector + RLS.
- **Tároló**: Supabase Storage (HTML snapshotok, raw JSON, PDF-ek).
- **Infra**: Vercel/Netlify (Nuxt) + Supabase; lokális dev Dockerrel.

---

## 4) Adatmodell (Supabase / Postgres)

```sql
-- Extensions
create extension if not exists vector; -- pgvector

-- Teams & Leagues
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  created_at timestamptz default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  league_id uuid references public.leagues(id),
  country text,
  created_at timestamptz default now()
);

-- Weekly slip (Toto rounds)
create table public.toto_rounds (
  id uuid primary key default gen_random_uuid(),
  round_label text not null,            -- pl. "2025/40. hét"
  week_start date not null,
  week_end date not null,
  source_url text,                      -- hivatalos forrás
  created_at timestamptz default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.toto_rounds(id) on delete cascade,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  league_id uuid references public.leagues(id),
  kickoff timestamptz,
  order_no int,                         -- szelvény sorrend
  created_at timestamptz default now()
);

-- Raw sources (scraping outputs)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  url text not null,
  title text,
  lang text,
  published_at timestamptz,
  fetched_at timestamptz default now(),
  html_storage_path text,               -- Supabase Storage path
  raw_json jsonb
);

-- Clean text chunks + embeddings
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  content text not null,
  embedding vector(768),                -- igazítsd a modellhez
  token_count int,
  created_at timestamptz default now()
);

-- Extracted facts
create table public.facts (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id),
  player_name text,
  fact_type text,                       -- 'injury' | 'suspension' | 'form' | 'transfer' | 'tactic' | 'odds_hint'
  polarity int,                         -- -1..+1 (hatás iránya)
  confidence real,
  source_id uuid references public.sources(id),
  created_at timestamptz default now()
);

-- Model runs (traceability)
create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  run_type text,                        -- 'ingest' | 'summarize' | 'qa' | 'predict'
  model_name text,
  prompt text,
  output jsonb,
  created_at timestamptz default now()
);

-- Predictions
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  outcome text check (outcome in ('1','X','2')),
  probs jsonb,                          -- {"1":0.45,"X":0.28,"2":0.27}
  rationale text,
  top_sources jsonb,                    -- [{url, title, score}]
  created_at timestamptz default now()
);

-- Ticket (tipposzlop) + Variants
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.toto_rounds(id) on delete cascade,
  label text,                           -- "Alap tipp" vagy "Variáns #1"
  budget_huf int,
  strategy text,                        -- pl. "cover-top-2-uncertain"
  created_at timestamptz default now()
);

create table public.ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  pick text check (pick in ('1','X','2'))
);

-- Simple user (optional admin)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,                  -- Supabase auth uid
  role text default 'user',
  created_at timestamptz default now()
);
```

**Indexek és optimalizáció**: `matches(round_id, order_no)`, `chunks(match_id)`, `facts(match_id, fact_type)`, `predictions(match_id)`.

---

## 5) Adatfolyam & pipeline

1. **Round import**: a heti szelvény felvétele (manuálisan vagy scraping a hivatalos oldalról).
2. **Source discovery**: kulcsszavak: csapatnevek, edzők, kulcsjátékosok, "injury", "suspension", magyar megfelelőik ("sérülés", "eltiltás"), adott liga.
3. **Fetching & rendering**: Playwright headless, időzítés/ráta-korlátok.
4. **Crawl4AI normalize**: HTML→Markdown tisztítás, metainfók kiemelése.
5. **Chunking + embeddings**: 512–1024 token darabolás, `pgvector` mentés.
6. **Fact extraction**: LLM prompt sablonokkal kulcsállítások kinyerése (játékos, státusz, forrás).
7. **RAG QA**: kérdések per meccs ("Ki hiányzik?", "Forma utolsó 5 meccs?", stb.).
8. **Prediction**: heurisztika + LLM ítélet + (opcionális) egyszerű logreg/LightGBM featuresettel.
9. **Variants**: költségkeret (HUF), bizonytalansági sorrend → fedezeti variációk generálása.
10. **Review & publish**: UI-n megjelenítés, export.

---

## 6) Predikciós logika (MVP)

- **Feature-ek** (ha elérhető):
  - Sérülések/eltiltások száma és kulcspozíció (± súlyok),
  - Utolsó 5 mérkőzés forma (W/D/L), gólkülönbség (nyers scrapingből),
  - Hazai/idegenbeli teljesítmény említések a forrásokban,
  - Edzőváltás jelzése az utóbbi 4 hétben,
  - Piaci oddsok **csak meta-jelzésként** (ha nyíltan elérhető összehasonlító cikkekből, nem kötelező).
- **LLM-ensemble**: több modell rövid indoklása → Majority/Weighted vote.
- **Kimenet**: `{ outcome: '1'|'X'|'2', probs: {1: p1, X: px, 2: p2}, rationale, top_sources }`.
- **Magyarázhatóság**: forrás idézetek röviden, URL + dátum.

---

## 7) Variáció-generálás költségkeretre

- **Bemenet**: alap kimeneti valószínűségek per meccs + egyéni kockázati profil.
- **Heurisztikák**:
  - Rendezés bizonytalanság szerint (entropy vagy margin = |p_top - p_2nd|),
  - Top-k fedezet a legbizonytalanabb meccseken,
  - Budget → max variáns darabszám és kombinációs tér korlátozása,
  - Opcionálisan: differenciált súlyozás (derbi → szélesebb fedezet).
- **Output**: `tickets` + `ticket_lines` táblák feltöltése; CSV export.

---

## 8) Nuxt 3 mappa-struktúra (javaslat)

```
root
├─ app.vue
├─ pages/
│  ├─ index.vue              # heti körök listája
│  ├─ rounds/[id].vue        # meccslista + predikciók + variánsok
│  └─ admin/
│     ├─ import.vue          # szelvény import
│     └─ jobs.vue            # crawl / pipeline állapot
├─ server/
│  ├─ api/
│  │  ├─ rounds.post.ts      # kör létrehozás
│  │  ├─ matches.get.ts      # meccsek lekérés
│  │  ├─ crawl.post.ts       # crawl indítás adott meccsre/körre
│  │  ├─ predict.post.ts     # predikció indítás
│  │  ├─ variants.post.ts    # variációk generálása
│  │  └─ export.get.ts       # CSV/JSON export
│  └─ utils/
│     ├─ supabase.ts         # server kliens
│     ├─ ollama.ts           # LLM hívások
│     ├─ embeddings.ts       # beágyazások
│     ├─ crawl.ts            # Playwright + Crawl4AI
│     └─ rag.ts              # retriever + reranker + QA
├─ composables/
├─ components/
├─ plugins/
├─ .env.example
└─ package.json
```

---

## 9) Példa API folyamatok (pszeudó/TypeScript)

**/server/utils/ollama.ts**
```ts
export async function chatLLM(messages: {role:'system'|'user'|'assistant', content:string}[], model='llama3.1:8b') {
  const res = await fetch(process.env.OLLAMA_URL + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false })
  });
  if (!res.ok) throw new Error('LLM error');
  const data = await res.json();
  return data.message?.content as string;
}
```

**Predikció prompt (részlet)**
```text
Feladat: Döntsd el a mérkőzés várható kimenetelét (1, X vagy 2) a megadott tények alapján.
Add meg a valószínűségi becslést és rövid indoklást. Jelezd, ha az evidenciák ellentmondásosak.

[TÉNYEK - kivonatolt]
- Sérülések/hiányzók: ...
- Forma utolsó 5: ...
- Hazai/idegenbeli említések: ...
- Egyéb releváns: ...
```

**/server/utils/embeddings.ts**
```ts
export async function embedTexts(texts: string[], model='nomic-embed-text') {
  const res = await fetch(process.env.OLLAMA_URL + '/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts })
  });
  if (!res.ok) throw new Error('Embedding error');
  const data = await res.json();
  return data.data.map((d:any)=> d.embedding);
}
```

**/server/utils/crawl.ts** (vázlat)
```ts
import { chromium } from 'playwright';

export async function fetchPage(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const html = await page.content();
  await browser.close();
  return html;
}
```

---

## 10) Supabase – előkészítés & beállítás

1. **Projekt létrehozás**: app.supabase.com → New Project.
2. **Adatbázis bővítmények**: `vector` engedélyezése (Database → Extensions → `vector`).
3. **Táblák létrehozása**: futtasd a fenti SQL sémát (SQL Editor).
4. **RLS (Row Level Security)**:
   - Engedélyezd RLS-t a táblákon (különösen, ha publikus UI lesz).
   - Írj egyszerű read-only policy-ket:
```sql
alter table public.predictions enable row level security;
create policy "predictions read" on public.predictions
  for select using (true);
-- Admin only insert/update lehet Supabase Auth role alapon.
```
5. **Storage bucketek**:
   - `raw-html/` – letöltött oldal snapshotok,
   - `raw-json/` – extractor outputok,
   - verziózás opcionális.
6. **pgvector index**:
```sql
create index on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```
7. **Edge Functions (opcionális)**:
   - `fetch-and-index` – URL fetch → normalize → chunk → embed → DB,
   - időzített futtatás: Project Settings → Scheduled jobs (Cron: pl. óránként).
8. **Service role kulcs**: szerveroldalon (Nuxt Nitro) használd a **service_role** kulcsot csak backendben; kliensoldalra **anon** kulcs.
9. **Environment változók** (`.env`):
```
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OLLAMA_URL=http://localhost:11434
EMBED_MODEL=nomic-embed-text
CHAT_MODEL=llama3.1:8b
```
10. **Seed adatok**: ligák/csapatok feltöltése (alap hazai csapatnevek + alternatív írásmódok).

---

## 11) RAG lekérdezés Supabase pgvectorral (példa)

```sql
-- Legrelevánsabb 8 szövegdarab adott kérdés embeddingje alapján
with query as (
  select '[EMBED_VECTOR]'::vector as q
)
select c.id, c.content, 1 - (c.embedding <=> q.q) as score
from public.chunks c, query q
order by c.embedding <=> q.q
limit 8;
```

A `[EMBED_VECTOR]`-t a `embedTexts([kérdés])` kimenetével helyettesítsd.

---

## 12) Jog, etika, minőség

- **Források**: hírek és klubközlemények hivatkozása (URL + dátum), relevancia pontszámmal.
- **robots.txt** és T&C tiszteletben tartása; lassítás (rate limit), cache.
- **Transzparens magyarázat**: minden predikcióhoz rövid indoklás.
- **Diszklémer**: nem pénzügyi/szerencsejáték tanács; szórakoztató cél.
- **Nyelv**: magyar elsődlegesen, angol források feldolgozhatók.

---

## 13) Tesztelés & mérőszámok

- **Egységteszt**: extractor, prompt-sablonok, variáns-generátor.
- **Integrációs**: end-to-end meccs → predikció.
- **Offline backtest**: múltbeli körök → találati arány, Brier score.
- **Monitorozás**: job futások ideje, scrape sikerarány, tokenköltség (ha lenne), 429 arány.

---

## 14) Ütemezés (MVP → iteráció)

- **M1 (1–2 hét)**: DB séma, manuális round import, kézi URL-adatok, alap RAG + egyszerű predikció, 1 tipposzlop.
- **M2 (2–3 hét)**: automata crawl + normalizálás, facts extraction, UI magyarázatokkal, variációk.
- **M3 (2 hét)**: backtest, jobb heurisztikák, reranker, exportok, edge schedule.

---

## 15) Licenc, repo struktúra

- **Licenc**: MIT.
- **Repo**:
```
/README.md
/apps/web (Nuxt)
/packages/shared (promptok, típusok)
/scripts (seed, backfill)
/sql (schema.sql, policies.sql)
```

---

## 16) Gyors indítás – Dev környezet

```bash
# Nuxt scaffold
npx nuxi init toto-match-ai && cd toto-match-ai
pnpm i

# Supabase kliens
pnpm i @supabase/supabase-js

# Playwright + tipikus függőségek
pnpm i -D playwright
pnpm i cheerio jsdom feedparser cross-fetch

# Ollama helyben
# https://ollama.com/download  majd:
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama pull bge-reranker-base

# .env kitöltése
cp .env.example .env

# Nuxt dev
pnpm dev
```

---

## 17) Prompt-sablonok (rövid)

**Fact extraction (HU)**
```
Listázd a cikkből a futballmérkőzéshez kapcsolódó TÉNYEKET JSON-ban:
- sérülések/hiányzók (név, poszt, várható hiány dátuma),
- eltiltások,
- forma (utolsó 5 meccs összegzése, ha szerepel),
- taktikai infók (formáció, kulcsváltozás),
- dátum és forráscím.
```

**Prediction (HU)**
```
A megadott tények alapján adj 1/X/2 tippet valószínűség-becsléssel és 2-3 mondatos indoklással.
Adj vissza JSON-t: { outcome, probs:{"1":..,"X":..,"2":..}, rationale }.
```

---

## 18) Variáció-generálás – példa stratégia

- **cover-top2-uncertain**: a 4–5 legbizonytalanabb meccsnél két kimenetet fedünk le; a többit egy kimenettel hagyjuk.
- **balanced-budget**: budget → max N szelvény; entropy küszöb szerint fedés.
- **underdog-sprinkle**: 1–2 magas oddszú kimenetet beemelünk, ha a bizonytalanság magas, magyarázattal.

---

## 19) Kockázati és jogi nyilatkozat

Ez a szoftver **nem** garantál találatot vagy nyereséget. A kimenetek hipotetikus becslések, szórakoztató/elemző célra. A scraping csak jogszerűen, a források feltételeinek megfelelően történjen.

