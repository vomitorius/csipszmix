# TipMix AI ⚽

AI-alapú futball mérkőzés előrejelző és tippszorzó rendszer Tippmix eseményekhez.

> **Figyelem:** Ez az alkalmazás szórakoztató és elemző célokra készült. Nem garantál nyereséget, és nem helyettesíti a szakmai tanácsadást.

## 🎯 Projekt áttekintés

A TipMix AI egy nyílt forráskódú alkalmazás, amely:
- Lekérdezi a **Tippmix futball eseményeket** és odds-okat
- Automatikusan felkutatja a releváns webes forrásokat (hírek, statisztikák)
- **AI/LLM alapú elemzést** végez (sérülések, formák, előzmények)
- **Predikciót** generál a meccsek kimenetelére
- **Tippszelvény variációkat** javasol költségkeretre optimalizálva

## 🏗️ Technológiák

- **Frontend**: Nuxt 3, Vue 3, TailwindCSS
- **Backend**: Nuxt Nitro API routes, TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/LLM**: Ollama (helyi futtatás), Llama 3.1, Qwen 2.5
- **Scraping**: Playwright, Crawl4AI (későbbi fázisokban)

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
OLLAMA_URL=http://localhost:11434
```

### 5. Fejlesztői szerver indítása

```bash
npm run dev
```

Nyisd meg a böngészőben: **http://localhost:3000**

## 📚 Fontos fájlok és dokumentációk

- **[csipszmix_spec.md](./csipszmix_spec.md)** - Teljes műszaki specifikáció
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Lépésről lépésre Supabase setup
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

## 🗺️ Roadmap

### ✅ M1: Tippmix API integráció + alap UI (Jelenlegi)
- [x] Nuxt 3 projekt inicializálás
- [x] TailwindCSS, Pinia, Supabase setup
- [x] Tippmix API wrapper (mock adatokkal)
- [x] Események lista UI
- [x] Event részletek oldal
- [x] TypeScript típusok
- [x] Supabase SQL sémák és dokumentáció

### 🚧 M2: Scraping + Fact Extraction (Következő)
- [ ] Playwright integráció
- [ ] Crawl4AI HTML→Markdown normalizálás
- [ ] RSS/Atom feed parser
- [ ] Chunk-olás és embeddings generálás
- [ ] Faktum kinyerés (sérülések, formák, eltiltások)
- [ ] Vector search implementálás

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

**Készítette:** TipMix AI Contributors  
**Verzió:** M1 (Alpha)  
**Utolsó frissítés:** 2025-01
