# Magyar Totó AI ⚽

AI-alapú heti magyar totó mérkőzés előrejelző és tipposzlop generátor rendszer.

> **Figyelem:** Ez az alkalmazás szórakoztató és elemző célokra készült. Nem garantál nyereséget. 18+ Felelősséggel játssz!

## 🎯 Projekt áttekintés

A Magyar Totó AI egy nyílt forráskódú alkalmazás, amely:
- Betölti a **heti Magyar Totó szelvényt** (13+1 mérkőzés)
- Automatikusan felkutatja a releváns webes forrásokat (hírek, statisztikák)
- **AI/LLM alapú elemzést** végez (sérülések, formák, előzmények)
- **Predikciót** generál minden mérkőzés kimenetelére (1/X/2)
- **Tipposzlop variációkat** javasol költségkeret alapján

## ✨ Főbb funkciók

- ✅ **Heti Totó szelvény**: Automatikus betöltés (13+1 meccs)
- ✅ **AI Predikciók**: Ensemble stratégia többszintű elemzéssel
- ✅ **Meccs részletek**: Teljes elemzés forrásokkal, tényekkel
- ✅ **Variációk**: Költségkeret-alapú tipposzlop generálás
- ✅ **Egyszerű UX**: Fókuszált, tiszta felhasználói élmény
- ✅ **Felelős játék**: Figyelmeztetések és segélyvonalak

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
- npm
- Supabase fiók (ingyenes tier is elegendő)
- OpenAI vagy más LLM API kulcs (vagy Ollama helyi futtatáshoz)

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

**Gyors lépések:**
1. Hozz létre egy Supabase projektet
2. Engedélyezd a `vector` extension-t
3. Futtasd le a `sql/schema.sql` fájlt
4. **Futtasd le a `sql/migration_toto.sql` fájlt** (Magyar Totó támogatás)
5. Futtasd le a `sql/policies.sql` fájlt

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

## 🚢 Production Deployment

Az alkalmazás Vercel-re történő telepítéséhez:

### Gyors deployment checklist:
1. ✅ Supabase projekt beállítva (beleértve a migration_toto.sql futtatását)
2. ✅ Vercel projekt létrehozva és repo importálva
3. ✅ Környezeti változók beállítva Vercel-en
4. ✅ Weekly automation (GitHub Actions) beállítva
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

## 🎮 Használat

### Főoldal
- Heti 13+1 mérkőzés listája
- AI predikciók minden meccshez
- Javasolt tipposzlop

### Meccs részletek
- Kattints bármely meccsre a részletekhez
- AI predikció indoklással
- Kinyert tények (sérülések, forma, stb.)
- Források linkekkel

### Variációk
- Költségkeret megadása
- Automatikus variációk generálása
- Stratégia és fedezettség megtekintése

## 🤖 AI & Automation

### Automatikus heti frissítés
- GitHub Actions minden hétfőn 6:00-kor
- Heti szelvény betöltése
- Források felkutatása és crawl-olása
- Tények kinyerése
- Predikciók generálása

### Cost Estimates (OpenAI)
- **Heti futás**: ~$1-2 per hét
- **Per meccs**: ~$0.05-0.15
- **14 meccs**: ~$0.70-2.10

**Költség csökkentés:**
- Groq vagy Together.ai (ingyenes tiers)
- Ollama (helyi, ingyenes)
- Cache results
- Limit max_sources parameter

## 📦 Fejlesztési fázisok

### ✅ M1-M3: Tippmix rendszer (Befejezve)
- [x] Nuxt 3 projekt, TailwindCSS, Supabase
- [x] Tippmix API integráció
- [x] Web scraping (Playwright, robots.txt)
- [x] LLM integráció (OpenAI, Groq, Ollama)
- [x] Embeddings és RAG
- [x] Tény kinyerés
- [x] AI predikciók (ensemble)
- [x] Variációk generálás
- [x] Admin dashboard

### ✅ M4: Magyar Totó refactor (Jelenlegi)
- [x] Magyar Totó adatstruktúra (toto_rounds, matches)
- [x] Heti szelvény rendszer (13+1 meccs)
- [x] Új API endpoints (/api/rounds, /api/matches)
- [x] Főoldal újratervezés
- [x] Meccs részletek oldal
- [x] Variációk oldal
- [x] Admin eltávolítása
- [x] Navigáció egyszerűsítés
- [x] GitHub Actions weekly automation

### 🔮 Jövőbeli továbbfejlesztések
- [ ] Szerencsejáték Zrt. API integráció (ha elérhető)
- [ ] Eredmények követése
- [ ] Statisztikák és elemzések
- [ ] Felhasználói fiókok
- [ ] Teljesítmény tracking

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
