# TipMix AI – Futball mérkőzés előrejelző és tippszorzó rendszer (Nuxt 3 + Supabase)

> **Cél**: egy olyan nyílt forráskódú alkalmazás, amely a napi/ heti **Tippmix eseményeket** hivatalos API-ból lekérdezi (meccsek, oddsok), majd a csapatokhoz kapcsolódó nyílt webes forrásokat automatikusan felkutatja, szövegesen elemzi (hírek, sérülések, formák, hiányzók), és ezek alapján releváns kimenetelt (1/X/2) és kombinációkat generál a Tippmix szelvényre. A rendszer ingyenesen elérhető (vagy helyben futtatható) AI modelleket preferál.

---

## 1) Fő követelmények

- **Input**: Tippmix események lekérdezése API-ból ([referencia](https://prog.hu/tudastar/212954/futball-odds-ok-lehuzasa-dinamikus-weboldalrol)).
- **Feldolgozás**:
  - Eseménylista: meccs, kezdési idő, oddsok,
  - Crawler/scraper felkutatja a releváns cikkeket, kluboldalakat, hírforrásokat (HU/EN),
  - NLP pipeline: tisztítás → nyelvfelismerés → összegzés → entitás- és állításkinyerés (sérülések, eltiltások, forma),
  - RAG-alapú kérdés–válasz: „Mely információk befolyásolják leginkább a mérkőzés kimenetelét?”
  - Predikció (1/X/2) + magyarázat (feature importance, hivatkozások).
- **Output**:
  - Tippmix szelvény javaslat (meccsek oddsokkal és AI predikcióval),
  - Variáció-generálás költségkeretre (pl. adott budget alapján több kombináció),
  - Átlátható indoklás és forráshivatkozások (URL, cím, dátum),
  - Export: CSV/JSON; opcionálisan PDF.
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
  - **Embedding**: `nomic-embed-text` vagy `bge-small-en-v1.5`
  - **Reranker**: `bge-reranker-base`
- **DB**: Supabase Postgres + pgvector + RLS.
- **Tároló**: Supabase Storage (HTML snapshotok, raw JSON, PDF-ek).
- **Infra**: Vercel/Netlify (Nuxt) + Supabase; lokális dev Dockerrel.

---

## 4) Adatmodell (Supabase / Postgres)

- **events** (Tippmix események API-ból: id, liga, home, away, oddsok, kezdés)
- **sources** (scraping output: url, title, date, nyers tartalom)
- **chunks** (feldolgozott szöveg + embedding)
- **facts** (kinyert entitások: sérülések, formák, eltiltások, edzőváltás)
- **predictions** (AI által javasolt kimenetel + valószínűségeloszlás)
- **tickets** (tippszelvények és variációk)

(A korábbi Totó-specifikus táblák helyett az események a Tippmix API-ból jönnek, de a struktúra hasonló marad: `events`, `sources`, `facts`, `predictions`, `tickets`).

---

## 5) Adatfolyam & pipeline

1. **API lekérés**: Tippmix események (home, away, oddsok, kezdés időpont).
2. **Source discovery**: kulcsszavak: csapatnevek, edzők, kulcsjátékosok.
3. **Fetching & rendering**: Playwright headless.
4. **Crawl4AI normalize**: HTML→Markdown tisztítás.
5. **Chunking + embeddings**: 512–1024 token darabolás, `pgvector` mentés.
6. **Fact extraction**: LLM prompt sablonokkal kulcsállítások kinyerése.
7. **RAG QA**: kérdések per meccs ("Ki hiányzik?", "Forma utolsó 5 meccs?", stb.).
8. **Prediction**: odds + hírek → valószínűségi predikció.
9. **Variants**: költségkeret (HUF), fedezeti variációk.
10. **Review & publish**: UI-n megjelenítés, export.

---

## 6) Predikciós logika (MVP)

- Oddsok API-ból (alap valószínűségi baseline).
- Hírekből extrahált információk: sérülések, formák, eltiltások.
- Kombináció: odds súlyozott módosítása faktumok alapján.
- Kimenet: `{ outcome: '1'|'X'|'2', probs: {1: p1, X: px, 2: p2}, rationale, top_sources }`.

---

## 7) Variáció-generálás költségkeretre

- Bizonytalansági sorrend (entropy, odds különbség).
- Legbizonytalanabb meccseknél több kimenet fedezése.
- Budget → max variáns darabszám.

---

## 8) Nuxt 3 mappa-struktúra (javaslat)

```
root
├─ pages/
│  ├─ index.vue              # Tippmix események listája
│  ├─ events/[id].vue        # esemény részletek + predikció
│  └─ tickets/
│     └─ [id].vue            # variációk megjelenítése
├─ server/api/
│  ├─ events.get.ts          # Tippmix API lekérés proxy
│  ├─ crawl.post.ts          # crawl adott eseményhez
│  ├─ predict.post.ts        # predikció generálás
│  ├─ variants.post.ts       # variációk
│  └─ export.get.ts          # CSV/JSON export
```

---

## 9) Supabase – előkészítés & beállítás

1. Projekt létrehozás Supabase-ben.
2. `vector` extension engedélyezése.
3. Táblák létrehozása: `events`, `sources`, `chunks`, `facts`, `predictions`, `tickets`.
4. RLS engedélyezése.
5. Storage bucket: `raw-html/`, `raw-json/`.
6. pgvector index a `chunks.embedding` mezőn.
7. Edge function: `fetch-and-index` (időzített crawl).
8. Service role kulcs backendben.
9. Környezeti változók:
```
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TIPP_API_URL=https://...
OLLAMA_URL=http://localhost:11434
```

---

## 10) Jog, etika, minőség

- Források idézése (URL, dátum).
- Odds API felhasználási feltételeinek betartása.
- Diszklémer: nem szerencsejáték tanács, szórakoztató cél.

---

## 11) Ütemezés

- **M1**: Tippmix API integráció + alap UI.
- **M2**: scraping + fact extraction.
- **M3**: predikció + variációk.

---

## 12) Licenc, repo struktúra

- MIT licenc.
- Repo:
```
/README.md
/apps/web (Nuxt)
/sql (schema.sql, policies.sql)
/scripts (seed, backfill)
```

---

## 13) Diszklémer

Ez a szoftver **nem** garantál találatot vagy nyereséget. A kimenetek hipotetikus becslések, szórakoztató/elemző célra. A scraping és odds felhasználás csak jogszerű keretek között történhet.

