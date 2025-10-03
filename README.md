# Tipp AI ⚽

AI-alapú futball mérkőzés előrejelző és tippszorzó rendszer Tippmix eseményekhez.

> **Figyelem:** Ez az alkalmazás szórakoztató és elemző célokra készült. Nem garantál nyereséget, és nem helyettesíti a szakmai tanácsadást.

## 🎯 Projekt áttekintés

A Tipp AI egy nyílt forráskódú alkalmazás, amely:
- Lekérdezi a **Tippmix futball eseményeket** és odds-okat
- Automatikusan felkutatja a releváns webes forrásokat (hírek, statisztikák)
- **AI/LLM alapú elemzést** végez (sérülések, formák, előzmények)
- **Predikciót** generál a meccsek kimenetelére
- **Tippszelvény variációkat** javasol költségkeretre optimalizálva

## 🏗️ Technológiák

- **Frontend**: Nuxt 3, Vue 3, TailwindCSS
- **Backend**: Nuxt Nitro API routes, TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/LLM**: OpenAI (GPT-4o-mini), Groq, Together.ai, vagy Ollama (helyi futtatás)
- **Scraping**: Playwright, @mozilla/readability, turndown
- **Embeddings**: OpenAI text-embedding-3-small (384 dimensions)

## 📁 Repo struktúra

```
csipszmix/
├── apps/web/              # Nuxt 3 alkalmazás
│   ├── pages/            # Vue oldalak
│   ├── components/       # Vue komponensek
│   ├── composables/      # Vue composables
│   ├── server/           # Nitro API routes és utils
│   └── public/           # Statikus fájlok
├── sql/                  # Supabase SQL sémák
│   ├── schema.sql        # Tábla definíciók
│   ├── policies.sql      # RLS szabályok
│   └── storage.sql       # Storage policies
├── csipszmix_spec.md     # Részletes specifikáció
├── SUPABASE_SETUP.md     # Supabase beüzemelési útmutató
└── LICENSE               # MIT licenc

```

## 🚀 Gyors kezdés

### Előfeltételek

- Node.js 18+ vagy 20+
- npm vagy yarn
- Supabase fiók (ingyenes tier is elegendő)
- (Opcionális) Ollama telepítve a helyi gépen

### 1. Repo klónozása

```bash
git clone https://github.com/vomitorius/csipszmix.git
cd csipszmix
```

### 2. Függőségek telepítése

```bash
cd apps/web
npm install
```

### 3. Supabase beüzemelése

Kövesd a részletes útmutatót: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

Gyors checklist:
1. Hozz létre egy Supabase projektet
2. Engedélyezd a `vector` extension-t
3. Futtasd le a `sql/schema.sql` fájlt
4. Futtasd le a `sql/policies.sql` fájlt
5. Hozd létre a storage bucket-eket

### 4. Környezeti változók

Másold a `.env.example` fájlt és töltsd ki:

```bash
cp .env.example .env
```

Szerkeszd a `.env` fájlt:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
TIPP_API_URL=https://odds.tippmix.hu

# LLM Provider (M2 features)
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# Optional: Alternative providers
# GROQ_API_KEY=gsk_...
# TOGETHER_API_KEY=...
# OLLAMA_URL=http://localhost:11434
```

### 6. LLM API Setup (M2 Features)

For M2 features (web scraping, fact extraction, RAG), you need an LLM API key:

**Option 1: OpenAI (Recommended)**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`
4. Cost: ~$0.15/1M tokens for gpt-4o-mini, ~$0.02/1M for embeddings

**Option 2: Groq (Free, Fast)**
1. Go to https://console.groq.com/keys
2. Create a free API key
3. Add to `.env`: `GROQ_API_KEY=gsk-...` and `LLM_PROVIDER=groq`
4. Free tier with rate limits

**Option 3: Together.ai (Free tier)**
1. Go to https://api.together.xyz/
2. Sign up and get API key
3. Add to `.env`: `TOGETHER_API_KEY=...` and `LLM_PROVIDER=together`

**Option 4: Ollama (Local, Free)**
1. Install Ollama from https://ollama.ai/
2. Run `ollama pull llama3.1:8b`
3. Add to `.env`: `LLM_PROVIDER=ollama` and `OLLAMA_URL=http://localhost:11434`
```

### 5. Fejlesztői szerver indítása

```bash
npm run dev
```

Nyisd meg a böngészőben: **http://localhost:3000**

## 🚢 Deployment (Production)

Az alkalmazás Vercel-re való telepítéséhez kövesd a részletes útmutatót:

👉 **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Vercel deployment lépésről lépésre

### Gyors deployment checklist:
1. ✅ Supabase projekt beállítva
2. ✅ Vercel projekt létrehozva és repo importálva
3. ✅ Környezeti változók beállítva Vercel-en
4. ✅ `vercel.json` fájl a repo root-ban (már benne van)
5. ✅ Deploy gomb megnyomva

## 📚 Fontos fájlok és dokumentációk

- **[csipszmix_spec.md](./csipszmix_spec.md)** - Teljes műszaki specifikáció
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Lépésről lépésre Supabase setup
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Vercel deployment útmutató
- **[apps/web/README.md](./apps/web/README.md)** - Nuxt app specifikus dokumentáció

## 🔧 Elérhető parancsok

```bash
# Fejlesztői szerver (hot reload)
npm run dev

# Production build
npm run build

# Production preview
npm run preview

# TypeScript type checking
npm run typecheck

# Linting (ha konfigurálva van)
npm run lint
```

## 🤖 M2 Features: AI-Powered Analysis

### Using the Crawl & Analyze Features

1. **Navigate to Admin Panel**: Go to `/admin/crawl` or click "Admin" in the navigation
2. **Select an Event**: Click on any event from the list
3. **Start Crawl**: Click "Start Crawl" to discover and fetch sources
4. **Analyze Facts**: Once crawling is complete, click "Analyze Facts" to extract structured information
5. **View Results**: Sources and facts will be displayed on the event detail page

### API Endpoints

**Crawl Sources**
```bash
POST /api/crawl
{
  "event_id": "evt_001",
  "force": false,
  "max_sources": 10
}
```

**Analyze and Extract Facts**
```bash
POST /api/analyze
{
  "event_id": "evt_001",
  "force": false
}
```

**Get Sources and Facts**
```bash
GET /api/sources/:event_id
```

### Cost Estimates

Based on OpenAI pricing (as of 2024):
- **Crawling 10 sources**: ~$0.02 - $0.05
  - Embeddings: ~20,000 tokens × $0.02/1M = $0.0004
- **Fact Extraction**: ~$0.01 - $0.03
  - Chat: ~5,000 tokens × $0.15/1M = $0.00075
- **Per Event Total**: ~$0.03 - $0.08

**Tips to reduce costs:**
- Use Groq or Together.ai (free tiers available)
- Use Ollama for local, free inference
- Cache results (don't use `force: true` unnecessarily)
- Limit `max_sources` parameter

## 🗺️ Roadmap

### ✅ M1: Tippmix API integráció + alap UI (Jelenlegi)
- [x] Nuxt 3 projekt inicializálás
- [x] TailwindCSS, Pinia, Supabase setup
- [x] Tippmix API wrapper (mock adatokkal)
- [x] Események lista UI
- [x] Event részletek oldal
- [x] TypeScript típusok
- [x] Supabase SQL sémák és dokumentáció

### ✅ M2: Scraping + Fact Extraction (Befejezve)
- [x] Playwright integráció
- [x] HTML→Markdown normalizálás (@mozilla/readability, turndown)
- [x] Multi-provider LLM támogatás (OpenAI, Groq, Together.ai, Ollama)
- [x] Automatikus source discovery (DuckDuckGo keresés)
- [x] Web scraping robots.txt ellenőrzéssel
- [x] Chunk-olás és embeddings generálás
- [x] Faktum kinyerés (sérülések, formák, eltiltások, taktikai változások)
- [x] Vector search implementálás (pgvector)
- [x] RAG-alapú Q&A rendszer
- [x] Admin UI crawl kontrolokkal
- [x] Event details bővítés források és tények megjelenítésével
- [x] API endpoints (/api/crawl, /api/analyze, /api/sources)

### 🔮 M3: Predikció + Variációk (Jövőbeli)
- [ ] RAG-alapú Q&A a meccsekről
- [ ] Predikciós logika (odds + hírek)
- [ ] Szelvénygenerálás
- [ ] Variációk költségkeretre
- [ ] CSV/JSON export
- [ ] PDF generálás

## 🤝 Közreműködés

A közreműködések üdvözöltek! Kérjük:
1. Fork-old a repo-t
2. Hozz létre egy feature branch-et (`git checkout -b feature/amazing-feature`)
3. Commit-old a változásokat (`git commit -m 'Add amazing feature'`)
4. Push-old a branch-et (`git push origin feature/amazing-feature`)
5. Nyiss egy Pull Request-et

## 📄 Licenc

Ez a projekt az MIT licenc alatt van kiadva - lásd a [LICENSE](./LICENSE) fájlt a részletekért.

## ⚠️ Jogi figyelmeztetés

- Ez a szoftver **nem garantál** találatot vagy nyereséget
- A kimenetek hipotetikus becslések, **szórakoztató/elemző célra**
- A scraping és odds felhasználás csak **jogszerű keretek** között történhet
- Tartsd tiszteletben a forrásoldal `robots.txt` fájlját
- Ne használd kereskedelmi célra a Tippmix védjegyét vagy adatait

## 🔗 Hasznos linkek

- [Nuxt 3 Dokumentáció](https://nuxt.com/docs)
- [Supabase Dokumentáció](https://supabase.com/docs)
- [pgvector Guide](https://supabase.com/docs/guides/ai)
- [Ollama](https://ollama.ai/)
- [TailwindCSS](https://tailwindcss.com/)

## 💬 Támogatás

Ha kérdésed van, nyiss egy GitHub Issue-t vagy nézd meg a [csipszmix_spec.md](./csipszmix_spec.md) fájlt további részletekért.

---

**Készítette:** Tipp AI Contributors  
**Verzió:** M1 (Alpha)  
**Utolsó frissítés:** 2025-01
