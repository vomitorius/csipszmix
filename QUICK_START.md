# TipMix AI - Quick Start Guide 🚀

Gyors útmutató a TipMix AI alkalmazás helyi futtatásához és Supabase backend beállításához.

## 📋 Előfeltételek

- Node.js 18+ vagy 20+
- npm vagy yarn
- Supabase fiók (ingyenes: https://supabase.com)
- (Opcionális) Ollama a helyi AI modellekhez

## ⚡ Gyors telepítés (5 perc)

### 1. Repo klónozása és függőségek

```bash
git clone https://github.com/vomitorius/csipszmix.git
cd csipszmix/apps/web
npm install
```

### 2. Környezeti változók

```bash
cp .env.example .env
```

Szerkeszd a `.env` fájlt (egyelőre üresen is működik mock adatokkal):

```env
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TIPP_API_URL=https://odds.tippmix.hu
OLLAMA_URL=http://localhost:11434
```

### 3. Alkalmazás indítása

```bash
npm run dev
```

Nyisd meg: **http://localhost:3000** 🎉

> **Megjegyzés:** Az alkalmazás mock adatokkal is fut Supabase nélkül!

---

## 🗄️ Supabase beüzemelés (10 perc)

Ha szeretnéd a teljes funkcionalitást (adatbázis, vector search, stb.), kövesd ezeket a lépéseket:

### 1. Supabase projekt létrehozása

1. Menj a https://app.supabase.com oldalra
2. Jelentkezz be / Regisztrálj
3. Kattints **"New Project"**
4. Add meg:
   - **Name**: `csipszmix`
   - **Database Password**: Erős jelszó (mentsd el!)
   - **Region**: `Central EU (Frankfurt)`
5. Várj 1-2 percet

### 2. Extensions engedélyezése

1. Menj **Database → Extensions**
2. Engedélyezd:
   - ✅ `vector` (pgvector)
   - ✅ `pg_trgm`

### 3. Adatbázis séma létrehozása

1. Menj **SQL Editor**
2. Kattints **"New query"**
3. Másold be a `sql/schema.sql` fájl tartalmát
4. Kattints **"Run"** vagy `Ctrl+Enter`
5. ✅ Ellenőrizd, hogy létrejöttek a táblák (events, sources, chunks, facts, predictions, tickets)

Ismételd meg a `sql/policies.sql` fájllal (RLS szabályok).

### 4. Storage buckets

1. Menj **Storage**
2. Kattints **"Create bucket"**
3. Hozd létre:
   - `raw-html` (public: NO)
   - `raw-json` (public: NO)
4. Futtasd le a `sql/storage.sql` fájlt a SQL Editor-ban

### 5. API kulcsok

1. Menj **Project Settings → API**
2. Másold ki:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...` ⚠️ TITKOS!

### 6. Környezeti változók frissítése

Írd be a `.env` fájlba a kulcsokat:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 7. Újraindítás

```bash
npm run dev
```

Most már Supabase-zel is működik! 🎊

---

## 📝 Részletes dokumentáció

Minden részletre kiterjedő információ:
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Teljes Supabase setup + hibaelhárítás
- **[README.md](./README.md)** - Projekt áttekintés, architektúra, roadmap
- **[csipszmix_spec.md](./csipszmix_spec.md)** - Teljes műszaki specifikáció

---

## 🧪 Tesztelés

### API endpoint tesztelése

```bash
# Események lekérdezése
curl http://localhost:3000/api/events | jq

# Egy esemény lekérdezése
curl http://localhost:3000/api/events/evt_001 | jq
```

### Build tesztelése

```bash
npm run build
npm run preview
```

---

## 🐛 Gyakori problémák

### "Cannot find module" hiba

```bash
rm -rf node_modules .nuxt
npm install
```

### Port már használatban (3000)

```bash
PORT=3001 npm run dev
```

### Supabase connection error

- Ellenőrizd a `.env` fájlban a kulcsokat
- Nézd meg a Supabase dashboard-on a projekt státuszát
- Ellenőrizd, hogy a táblák létrejöttek-e

---

## 📚 További lépések

### M1 (Jelenlegi) - Alap UI ✅
- Nuxt 3 projekt
- Mock események
- Alapvető UI

### M2 (Következő) - Scraping 🚧
- Valós Tippmix API scraping
- HTML→Markdown
- Fact extraction

### M3 (Jövő) - AI Predikció 🔮
- RAG-alapú Q&A
- Predikciós logika
- Szelvénygenerálás

---

## 🤝 Támogatás

- **Issues**: https://github.com/vomitorius/csipszmix/issues
- **Dokumentáció**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- **Spec**: [csipszmix_spec.md](./csipszmix_spec.md)

---

**Happy coding! ⚽🎯**
