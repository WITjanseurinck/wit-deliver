# wit-deliver

Interne tool van WIT om opgeleverde pagina's (banners, reviews, …) aan
klanten te tonen met echte toegangscontrole — niet "wie de link heeft",
maar per klant en per persoon. Losstaand van elke specifieke campagne of
klant: één tool, meerdere klanten, meerdere projecten per klant, meerdere
personen per project.

## Model

```
Klant
 └─ Project (hoort bij precies één klant)
     ├─ html            de opgeleverde pagina, zoals ze gebouwd is
     └─ personen         wie mag deze ene pagina zien
```

- Een **klant** ziet nooit iets van een andere klant: er is geen gedeeld pad,
  geen gedeelde lijst, geen manier om van het ene project naar het andere te
  bladeren zonder expliciete toegang.
- Een **project** is de eenheid waarop je toegang geeft. Iemand kan toegang
  hebben tot meerdere projecten (ook bij dezelfde klant), maar nooit "alles
  van klant X" automatisch — elk project moet apart worden toegekend.
- Een **persoon** logt in met een gebruikersnaam/wachtwoord die alleen WIT
  uitgeeft (via het beheerscherm). Geen publieke registratie.
- **Geen spoor van de bouwer van deze software** op wat een klant te zien
  krijgt — het inlogscherm en de projectoverzichten tonen alleen "WIT".

## Lokaal draaien

```
npm install
cp .env.example .env   # vul SESSION_SECRET en ADMIN_PASSWORD in
npm start
```

- Beheer: `http://localhost:3300/admin` (inloggen met `ADMIN_USER`/`ADMIN_PASSWORD` uit `.env`)
- Klantaanmelding: `http://localhost:3300/login`

## Werking in het kort

1. Log in op `/admin`.
2. Maak een **klant** aan.
3. Maak binnen die klant een **project** aan, en plaats meteen (of later) de
   opgeleverde HTML-pagina (het bestand dat `tools/artifact.cjs` of
   vergelijkbaar al produceert — gewoon uploaden, niets aan te passen).
4. Maak binnen dat project een **account** aan voor elke persoon die het mag
   zien. Het wachtwoord wordt automatisch gegenereerd en precies één keer
   getoond — geef het door buiten dit scherm om (telefoon, beveiligd
   kanaal), nooit per mail als het gevoelig ligt.
5. Die persoon logt in op `/login` met dat account en ziet alleen de
   project(en) waar die toegang toe heeft.

Toegang intrekken = op de projectpagina "toegang intrekken" bij die persoon.
Het account blijft bestaan (kan nog steeds inloggen voor andere projecten
waar het wel toegang toe heeft) — pas bij "verwijderen" verdwijnt het account
helemaal.

## Opslag

Platte JSON (`data/db.json`), geen databaseserver nodig. Prima voor het
aantal klanten/projecten/personen waar dit voor bedoeld is. Geen
gelijktijdige meerdere Node-processen op dezelfde `data/`-map (zie
`src/store.js`) — draai dit dus als één proces (bv. onder pm2 met
`instances: 1`, zie `DEPLOY.md`).

## Deployment

Zie `DEPLOY.md` voor hoe dit op de wit.agency-VPS als eigen, continu
draaiend proces komt te staan (achter een reverse-proxy-subdomein).
