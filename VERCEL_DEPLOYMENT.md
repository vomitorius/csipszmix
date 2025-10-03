# Vercel Deployment Útmutató - TipMix AI

Ez az útmutató lépésről lépésre bemutatja, hogyan lehet a TipMix AI alkalmazást Vercel-re telepíteni.

## 📋 Előfeltételek

- GitHub fiók
- Vercel fiók (ingyenes tier is megfelelő)
- Beállított Supabase projekt (lásd [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

## 🚀 Lépések

### 1. Vercel fiók létrehozása / Bejelentkezés

1. Menj a [vercel.com](https://vercel.com) oldalra
2. Kattints a **"Sign Up"** vagy **"Log In"** gombra
3. Jelentkezz be GitHub fiókkal (ajánlott)

### 2. Új projekt létrehozása

1. A Vercel dashboardon kattints az **"Add New..."** → **"Project"** gombra
2. Importáld a GitHub repository-t:
   - Kattints **"Import Git Repository"**
   - Válaszd ki: `vomitorius/csipszmix`
   - Ha nem látod, kattints **"Adjust GitHub App Permissions"** és add meg a hozzáférést

### 3. Projekt beállítása

A projekt import képernyőn állítsd be a következőket:

#### Framework Preset
- **Framework Preset**: `Other` vagy `Nuxt.js` (a `vercel.json` felülírja ezt)

#### Root Directory
- **Root Directory**: Hagyd alapértelmezetten (`./`) - a `vercel.json` kezeli a monorepo struktúrát

#### Build and Output Settings
Ezeket a `vercel.json` automatikusan kezeli, de ellenőrizd:
- **Build Command**: `cd apps/web && npm install && npm run build && cd ../.. && cp -r apps/web/.vercel .vercel`
- **Install Command**: `cd apps/web && npm install`
- **Output Directory**: Hagyd üresen - a Nuxt 3 Vercel preset automatikusan kezeli

**Fontos:** A monorepo struktúra miatt a build parancs végén a `.vercel` könyvtár átmásolása szükséges a repo root-ba, hogy Vercel megtalálja.

### 4. Környezeti változók beállítása

Ez a **legfontosabb lépés**! A deployment csak akkor fog működni, ha az alábbi környezeti változók helyesen vannak beállítva.

1. Görgess le az **"Environment Variables"** szekcióhoz
2. Add hozzá az alábbi változókat (ugyanazok, mint a helyi `.env` fájlban):

#### Kötelező változók:

| Név | Érték | Leírás |
|-----|-------|--------|
| `NUXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase projekt URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anon kulcs |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase service role kulcs |
| `TIPP_API_URL` | `https://odds.tippmix.hu` | TipMix API URL |

#### Opcionális változók:

| Név | Érték | Leírás |
|-----|-------|--------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama URL (production-ben általában nem elérhető) |

**Fontos megjegyzések:**
- A `NUXT_PUBLIC_` prefixszel rendelkező változók a kliensen is láthatók lesznek
- A `SUPABASE_SERVICE_ROLE_KEY` csak a szerver oldalon használt
- Az Ollama általában nem működik production környezetben (csak helyi gépeken)
- Ne commitold soha a `.env` fájlt! (már a `.gitignore`-ban van)

#### Környezeti változók hozzáadásának lépései:

1. Kattints az **"Add New"** gombra minden környezeti változóhoz
2. Írd be a **Name** mezőbe a változó nevét
3. Írd be a **Value** mezőbe az értéket
4. Válaszd ki az environmenteket:
   - ✅ **Production** (mindig)
   - ✅ **Preview** (ajánlott)
   - ✅ **Development** (opcionális)

### 5. Deploy indítása

1. Ellenőrizd, hogy minden környezeti változó helyesen van-e beállítva
2. Kattints a **"Deploy"** gombra
3. Várj 2-5 percet, amíg a deployment elkészül

### 6. Deployment státusz ellenőrzése

A deployment során látnod kell:
- ✅ Building
- ✅ Output: Collecting Build Outputs
- ✅ Deploying

Ha sikeres:
- 🎉 A deployment **"Ready"** státuszú lesz
- Kapsz egy URL-t (pl. `csipszmix.vercel.app`)

### 7. Deployment ellenőrzése

1. Nyisd meg a kapott URL-t a böngészőben
2. Ellenőrizd, hogy az alkalmazás betöltődik
3. Nézd meg a Tippmix események listáját
4. Ellenőrizd, hogy nincsenek-e JavaScript hibák (F12 Console)

## 🐛 Gyakori problémák és megoldások

### ❌ "Build failed" vagy "Command failed with exit code 1"

**Oka:** 
- Hiányzó vagy hibás környezeti változók
- Hibás build parancs
- Node.js verzió inkompatibilitás

**Megoldás:**
1. Ellenőrizd a build logokat a Vercel dashboardon
2. Nézd meg, hogy minden környezeti változó be van-e állítva
3. Ellenőrizd a `vercel.json` fájl tartalmát
4. Próbáld lokálisan: `cd apps/web && npm run build`

### ❌ "Cannot find module" vagy dependency hibák

**Oka:**
- Az `npm install` nem futott le megfelelően
- Rossz root directory beállítás

**Megoldás:**
1. Ellenőrizd a `vercel.json` fájlban az `installCommand` értékét
2. Nézd meg, hogy a `buildCommand` is a `cd apps/web` paranccsal kezdődik-e
3. Próbáld újra deployolni

### ❌ "No Output Directory named 'public' found"

**Oka:**
- Hibás `outputDirectory` beállítás a `vercel.json`-ban (Nuxt 3 SSR alkalmazásoknál nem kell)
- A `.vercelignore` fájl blokkolja a `.vercel/output/` directory-t
- Hiányzó vagy helytelen Vercel preset a `nuxt.config.ts`-ben
- **Monorepo esetén**: A `.vercel/output/` nincs a repo root-ban

**Megoldás:**
1. Ellenőrizd, hogy a `nuxt.config.ts` tartalmazza: `nitro: { preset: 'vercel' }`
2. Ellenőrizd, hogy a `vercel.json` **NEM** tartalmaz `outputDirectory` beállítást
3. Ellenőrizd, hogy a `.vercelignore` fájl **nem** blokkolja a `.vercel` könyvtárat
4. **Monorepo esetén**: Ellenőrizd, hogy a `buildCommand` átmásolja a `.vercel` könyvtárt a repo root-ba: `&& cd ../.. && cp -r apps/web/.vercel .vercel`
5. Próbáld újra deployolni

### ❌ Üres oldal / "Application error"

**Oka:**
- Hibás `outputDirectory` beállítás
- Runtime hiba (pl. hiányzó környezeti változók)

**Megoldás:**
1. Ellenőrizd a Vercel build logokban az output directory-t
2. Nézd meg a Runtime Logs-ot a hibákért
3. Ellenőrizd, hogy a `.vercel/output/` könyvtár létrejött-e a build után
4. Ellenőrizd, hogy a `nuxt.config.ts` tartalmazza a Vercel preset-et

### ❌ "Supabase connection error"

**Oka:**
- Hiányzó vagy hibás Supabase környezeti változók
- Rossz API kulcsok

**Megoldás:**
1. Menj a Vercel projekt Settings → Environment Variables menüpontba
2. Ellenőrizd minden Supabase változót:
   - `NUXT_PUBLIC_SUPABASE_URL`
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Ellenőrizd a Supabase dashboardon, hogy a projekt működik-e
4. Másold ki újra az API kulcsokat és frissítsd a Vercel-en
5. Redeploy-old az alkalmazást

### ❌ "Function Execution Timeout"

**Oka:**
- Az Ollama vagy más külső szolgáltatás nem érhető el
- Lassú API hívások

**Megoldás:**
1. Production-ben az Ollama általában nem elérhető
2. Ellenőrizd, hogy az alkalmazás gracefully kezelje-e a hiányzó Ollama szolgáltatást
3. Használj timeout-okat az API hívásoknál

## 🔄 Újabb változtatások deployolása

Ha frissítesz valamit a kódban:

1. Commit és push GitHub-ra:
   ```bash
   git add .
   git commit -m "Változtatás leírása"
   git push origin master
   ```

2. Vercel automatikusan újra fogja deployolni
3. Várj 2-5 percet
4. Ellenőrizd az új verziót

### Preview deployments

- Minden pull request automatikusan kap egy preview deployment URL-t
- Így tesztelheted a változtatásokat production-re való felkerülés előtt

## 🔒 Biztonsági megjegyzések

- ⚠️ Soha ne commitold a `.env` fájlt a repository-ba
- ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` teljes hozzáférést ad az adatbázishoz - őrizd biztonságosan
- ✅ Használj mindig HTTPS-t production-ben (Vercel ezt automatikusan biztosítja)
- ✅ Állíts be RLS (Row Level Security) szabályokat Supabase-ben

## 📊 Monitoring és logs

### Build Logs megtekintése:
1. Menj a Vercel dashboardra
2. Válaszd ki a projektet
3. Kattints egy deployment-re
4. Nézd meg a **"Building"** szekciót

### Runtime Logs megtekintése:
1. Menj a Vercel dashboardra
2. Válaszd ki a projektet
3. Kattints a **"Logs"** fülre (vagy **"Runtime Logs"**)
4. Itt látod a szerver oldali hibákat és logokat

### Analytics:
- Vercel ingyenes analytics-et biztosít
- Láthatod a látogatószámot, teljesítményt, stb.
- A **"Analytics"** fülön érhető el

## 🌐 Custom domain beállítása (opcionális)

Ha saját domain-t szeretnél használni:

1. Menj a Vercel projekt Settings → Domains menüpontba
2. Add hozzá a domain-t
3. Állítsd be a DNS rekordokat a domain szolgáltatónál
4. Várj néhány percet a propagációra

## ✅ Deployment checklist

Használd ezt a checklistet deployment előtt:

- [ ] Supabase projekt létrehozva és beállítva
- [ ] Supabase extensions engedélyezve (`vector`, `pg_trgm`)
- [ ] Supabase SQL sémák futtatva (`schema.sql`, `policies.sql`, `storage.sql`)
- [ ] Supabase API kulcsok kimásolva
- [ ] Vercel projekt létrehozva
- [ ] Repository importálva Vercel-be
- [ ] `vercel.json` fájl létezik a repo root-ban
- [ ] Minden környezeti változó beállítva Vercel-en:
  - [ ] `NUXT_PUBLIC_SUPABASE_URL`
  - [ ] `NUXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `TIPP_API_URL`
- [ ] Deploy gomb megnyomva
- [ ] Build sikeresen lefutott
- [ ] Deployment URL működik
- [ ] Nincs JavaScript hiba a konzolon
- [ ] Supabase kapcsolat működik

## 📚 További források

- [Nuxt 3 Deployment dokumentáció](https://nuxt.com/docs/getting-started/deployment)
- [Vercel Nuxt dokumentáció](https://vercel.com/guides/deploying-nuxtjs-with-vercel)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase dokumentáció](https://supabase.com/docs)

## 💡 Tippek

- Használd a Preview Deployments-t tesztelésre
- Állíts be branch protection-t GitHub-on
- Használj külön Supabase projektet production és development környezethez
- Monitorozd a Vercel logs-ot problémák esetén

---

**Ha továbbra sem sikerül a deployment, ellenőrizd:**
1. ✅ Minden környezeti változó helyesen van beállítva
2. ✅ A `vercel.json` fájl létezik a repo root-ban
3. ✅ A build lokálisan is lefut (`cd apps/web && npm run build`)
4. ✅ Nincs merge conflict vagy build hiba a kódban
5. ✅ A Supabase projekt elérhető és működik

Ha ezek után sem működik, nyiss egy GitHub Issue-t a részletes build logokkal! 🐛
