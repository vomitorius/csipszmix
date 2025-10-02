# Supabase Beüzemelési Útmutató - TipMix AI

Ez a dokumentum lépésről lépésre bemutatja, hogyan kell beüzemelni a Supabase backend-et a TipMix AI alkalmazáshoz.

## 1. Projekt létrehozása Supabase-ben

1. Látogass el a [Supabase Dashboard](https://app.supabase.com)-ra
2. Kattints a **"New Project"** gombra
3. Válaszd ki a szervezetet (Organization)
4. Add meg a projekt részleteit:
   - **Name**: `csipszmix` vagy `tipmix-ai`
   - **Database Password**: Erős jelszó (mentsd el biztonságos helyre!)
   - **Region**: Válassz egy közeli régiót (pl. `Central EU` Frankfurt)
   - **Pricing Plan**: Kezdéshez a **Free tier** elegendő
5. Kattints a **"Create new project"** gombra
6. Várj 1-2 percet, amíg a projekt felépül

## 2. Bővítmények (Extensions) engedélyezése

A Vector kereséshez és teljes szöveges kereséshez szükség van néhány PostgreSQL bővítményre.

### Lépések:

1. Menj a **Database** → **Extensions** menüpontba
2. Keresd meg és engedélyezd a következő bővítményeket:
   - **`vector`** (pgvector) - AI embeddings tárolásához
   - **`pg_trgm`** - Teljes szöveges kereséshez
3. Kattints mindegyiknél az **"Enable"** gombra

**Alternatíva SQL Editor-ből:**
1. Menj a **SQL Editor** menüpontba
2. Futtasd le az alábbi SQL parancsokat:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## 3. Adatbázis séma létrehozása

### Módszer 1: SQL fájlok futtatása

1. Menj a **SQL Editor** menüpontba
2. Kattints a **"New query"** gombra
3. Másold be a `sql/schema.sql` fájl tartalmát
4. Kattints a **"Run"** gombra (vagy `Ctrl+Enter`)
5. Ellenőrizd, hogy minden tábla létrejött:
   - `events`
   - `sources`
   - `chunks`
   - `facts`
   - `predictions`
   - `tickets`
   - `ticket_variants`

6. Ismételd meg ugyanezt a `sql/policies.sql` fájllal (RLS szabályok)

### Módszer 2: Table Editor használata

Ha manuálisan szeretnéd létrehozni a táblákat:

1. Menj a **Table Editor** menüpontba
2. Minden táblára külön:
   - Kattints **"Create a new table"**
   - Add meg a tábla nevét és oszlopokat
   - Ne felejtsd el a foreign key kapcsolatokat

*(Az SQL módszer gyorsabb és hibamentesebb!)*

## 4. Row Level Security (RLS) beállítása

Az RLS szabályok már benne vannak a `sql/policies.sql` fájlban, de ha kézzel szeretnéd ellenőrizni:

1. Menj a **Authentication** → **Policies** menüpontba
2. Válaszd ki az egyes táblákat
3. Ellenőrizd, hogy az RLS engedélyezve van (zöld kapcsoló)
4. Nézd át a létrehozott policy-kat:
   - **SELECT**: Mindenki olvashat (public read)
   - **INSERT/UPDATE/DELETE**: Service role kulccsal végezhető

## 5. Storage Buckets létrehozása

A nyers HTML és JSON fájlok tárolásához storage bucket-eket kell létrehozni.

### Lépések:

1. Menj a **Storage** menüpontba
2. Kattints **"Create a new bucket"**
3. Hozd létre az első bucket-et:
   - **Name**: `raw-html`
   - **Public**: ❌ (NEM publikus)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `text/html`
4. Kattints **"Create bucket"**
5. Ismételd meg a második bucket-tel:
   - **Name**: `raw-json`
   - **Public**: ❌ (NEM publikus)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `application/json`

### Storage Policies

Futtasd le a `sql/storage.sql` fájlt a **SQL Editor**-ban a storage policy-k létrehozásához.

## 6. API kulcsok megszerzése

Az alkalmazás futtatásához szükség van a Supabase API kulcsokra.

### Lépések:

1. Menj a **Project Settings** → **API** menüpontba
2. Másold ki a következő értékeket:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon (public) key**: `eyJhbG...` (hosszú token)
   - **service_role key**: `eyJhbG...` (TITKOS! Csak szerver oldalon használd!)

### ⚠️ FONTOS BIZTONSÁGI FIGYELMEZTETÉS:

- Az **anon key** a kliensben használható (publikus)
- A **service_role key** SOHA ne kerüljön a kliensbe!
- A service_role key megkerüli az RLS szabályokat
- Tartsd biztonságos helyen (környezeti változó, titkos menedzsment)

## 7. Környezeti változók beállítása

### Helyi fejlesztéshez (Development)

Hozz létre egy `.env` fájlt az `apps/web/` könyvtárban:

```bash
# Másold a .env.example fájlt és töltsd ki a valós értékekkel
cp apps/web/.env.example apps/web/.env
```

Szerkeszd a `.env` fájlt:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
TIPP_API_URL=https://odds.tippmix.hu
OLLAMA_URL=http://localhost:11434
```

### Production/Deploy környezethez

Ha Vercel-re, Netlify-ra vagy más platformra telepíted:

1. Menj a hosting platform environment variables beállításaihoz
2. Add hozzá ugyanazokat a változókat, mint a `.env` fájlban
3. Ne commitold a `.env` fájlt Git-be! (már a `.gitignore`-ban van)

## 8. Indexek ellenőrzése

Az indexek automatikusan létrejönnek a `schema.sql` futtatásakor. Ellenőrzéshez:

1. Menj a **Database** → **Indexes** menüpontba
2. Nézd át, hogy az alábbi indexek léteznek-e:
   - `idx_events_start_time`
   - `idx_events_status`
   - `idx_chunks_embedding` (HNSW vector index)
   - Teljes szöveges keresési indexek (GIN)

### Vector index teljesítmény

A `chunks.embedding` mezőn HNSW (Hierarchical Navigable Small World) indexet használunk:
- `m = 16`: Kapcsolatok száma (jó egyensúly sebesség és pontosság között)
- `ef_construction = 64`: Index építési paraméter

Ha később finomhangolni szeretnéd a teljesítményt, módosíthatod az indexet:

```sql
DROP INDEX IF EXISTS idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding ON chunks 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128); -- Jobb pontosság, lassabb keresés
```

## 9. Kapcsolat tesztelése

### SQL Editor-ből:

```sql
-- Tesztadat beszúrása
INSERT INTO events (id, league, home, away, start_time, odds_home, odds_draw, odds_away)
VALUES (
  'test_001',
  'Test League',
  'Test Home',
  'Test Away',
  NOW() + INTERVAL '1 day',
  2.50,
  3.20,
  2.80
);

-- Lekérdezés
SELECT * FROM events WHERE id = 'test_001';

-- Törlés
DELETE FROM events WHERE id = 'test_001';
```

### Nuxt alkalmazásból:

```bash
cd apps/web
npm run dev
```

Látogasd meg: `http://localhost:3000/api/events`

Ha minden jól megy, látnod kell a mock eseményeket JSON formátumban.

## 10. Edge Functions (Opcionális - jövőbeli használatra)

Az automatikus crawling-hez később Supabase Edge Function-öket fogsz használni.

### Előkészület:

1. Telepítsd a Supabase CLI-t:
```bash
npm install -g supabase
```

2. Jelentkezz be:
```bash
supabase login
```

3. Inicializáld a project-et:
```bash
supabase init
```

Az Edge Functions implementálása az M2 mérföldkőben lesz.

## 11. Monitoring és Logs

A Supabase Dashboard-on monitorozhatod az adatbázis teljesítményét:

1. **Database** → **Logs**: SQL lekérdezések naplói
2. **Database** → **Roles**: Felhasználók és jogosultságok
3. **Storage** → **Usage**: Storage használat
4. **Project Settings** → **Usage**: Kvóta és korlátok

### Free Tier korlátok:

- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 5 GB/hónap
- Realtime connections: 200

## 12. Backup és Helyreállítás

### Automatikus backup (Paid plans):

A fizetős csomagokban automatikus napi backup-ok vannak.

### Manuális export:

1. Menj a **Database** → **Backups** menüpontba
2. Vagy használd a `pg_dump` parancsot:

```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

## 13. Hibaelhárítás

### "relation does not exist" hiba:

- Ellenőrizd, hogy lefuttattad-e a `schema.sql` fájlt
- Nézd meg a **Table Editor**-ban, hogy létrejöttek-e a táblák

### "JWT expired" vagy auth hiba:

- Ellenőrizd, hogy jó API kulcsokat használsz
- Nézd meg, hogy a környezeti változók helyesen vannak-e beállítva

### Vector keresés nem működik:

- Ellenőrizd, hogy a `vector` extension engedélyezve van-e
- Nézd meg, hogy az embedding dimenzió (384) megegyezik-e a modellednél

### Storage upload hiba:

- Ellenőrizd, hogy létrehoztad-e a bucket-eket
- Nézd meg a storage policy-kat
- Ellenőrizd a fájl méretét és MIME type-ot

## 14. További források

- [Supabase Dokumentáció](https://supabase.com/docs)
- [pgvector Guide](https://supabase.com/docs/guides/ai)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage)

---

## Összefoglalás - Gyors checklist

- [ ] 1. Supabase projekt létrehozva
- [ ] 2. `vector` és `pg_trgm` extension engedélyezve
- [ ] 3. `schema.sql` futtatva (táblák létrehozva)
- [ ] 4. `policies.sql` futtatva (RLS szabályok)
- [ ] 5. Storage bucket-ek létrehozva (`raw-html`, `raw-json`)
- [ ] 6. `storage.sql` futtatva (storage policy-k)
- [ ] 7. API kulcsok kimásolva és biztonságosan tárolva
- [ ] 8. `.env` fájl létrehozva és kitöltve
- [ ] 9. Kapcsolat tesztelve (SQL és API)
- [ ] 10. Indexek ellenőrizve

**Gratulálunk! A Supabase backend sikeresen beüzemelt! 🎉**
