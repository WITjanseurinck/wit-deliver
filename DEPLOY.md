# wit-deliver deployen met Coolify

`wit-deliver` draait in productie op <https://deliver.wit.agency>, als
applicatie in Coolify op de wit.agency-VPS. Er zijn bewust geen eigen
deploy-scripts of workflows in deze repo: Coolify bouwt en start de app zelf.

## Instelling in Coolify

- **Bron**: deze GitHub-repo, branch `main`.
- **Build pack**: Nixpacks (de standaard). Het herkent `package.json`, voert
  `npm install` uit en start met `npm start` (`node src/server.js`).
  Node ≥18 is vereist.
- **Poort**: `3300` (Ports Exposes). Coolify zet er de reverse proxy en het
  https-certificaat voor `deliver.wit.agency` voor.
- **Instances**: precies **één**. `db.json` is een bestand dat één proces
  tegelijk beschrijft; schaal dit dus niet op en draai geen tweede replica op
  hetzelfde volume.
- **Persistent storage**: een volume met mount-pad `/data`. Hierin staat alles
  wat echt verloren kan gaan.

### Omgevingsvariabelen (Coolify → Environment Variables)

| Variabele | Waarde |
|---|---|
| `SESSION_SECRET` | lange willekeurige string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Verplicht; de app start niet zonder. |
| `ADMIN_USER` | gebruikersnaam van de Owner |
| `ADMIN_PASSWORD` | sterk, uniek wachtwoord van de Owner |
| `DATA_DIR` | `/data` (moet samenvallen met het mount-pad van het volume) |
| `NODE_ENV` | `production` (zet de sessiecookie op `secure`) |
| `PORT` | `3300` |

Wijzig je `ADMIN_PASSWORD`, herstart dan de applicatie in Coolify. Zet geen
`.env`-bestand in de repo; `.env.example` is enkel een overzicht.

## Updaten

1. Merge naar `main`.
2. Klik in Coolify op **Deploy** (of laat auto-deploy aanstaan, zoals jij het
   hebt ingesteld).

De data in `/data` blijft staan: het volume wordt bij een nieuwe deploy
hergebruikt.

## Wijzigingen aan de structuur van `db.json`

Het bestand heeft een `schemaVersion` (nu `2`). Bij het opstarten:

- is `db.json` van een oudere versie, dan maakt de app eerst een back-up ernaast
  (`/data/db.json.v<versie>.<tijdstip>.bak`) en zet daarna om en schrijft weg;
- is het al de huidige versie, dan gebeurt er niets;
- is het van een **nieuwere** versie dan de code (bv. na een rollback), dan
  weigert de app te starten in plaats van data te beschadigen.

De omzetting staat in `src/store.js` (`MIGRATIONS`). Wie de structuur
aanpast, verhoogt `SCHEMA_VERSION`, voegt een stap toe die alleen aanvult en
test die met een kopie van een echte `db.json`.

Versie 1 → 2 (rollen, feedback): bestaande personen worden **Client**, krijgen
`mustChange: false` (ze behouden hun wachtwoord), projecten krijgen status
`open`, en er komt een lege lijst `comments`.

Terugdraaien naar de oude versie van de code kan alleen als je ook de
`.bak`-kopie terugzet als `db.json`.

## Controleren na een deploy

- `https://deliver.wit.agency/login` toont het aanmeldscherm in WIT-huisstijl.
- Bekijk in Coolify de logs: bij de eerste start na de update staat er
  `db.json omgezet van versie 1 naar 2; back-up: …`.
- Meld je aan als Owner (naar `/admin`) en controleer dat klanten, projecten
  en accounts er nog zijn.
- Meld je met een bestaand klantaccount aan: dat werkt met het oude wachtwoord
  en ziet alleen de eigen projecten.

## Onderhoud

- **Back-up**: maak in Coolify (of via de VPS) een periodieke kopie van het
  volume `/data`. `db.json` bevat alle klanten, projecten, pagina's,
  opmerkingen en wachtwoord-hashes.
- **Wachtwoord Owner vergeten of gelekt**: pas `ADMIN_PASSWORD` aan in Coolify
  en herstart.
- **Wachtwoord van een persoon**: Owner → project → "nieuw wachtwoord". Die
  persoon kiest bij de volgende aanmelding een eigen wachtwoord.
