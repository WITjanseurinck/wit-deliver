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
cp .env.example .env   # vul SESSION_SECRET en ADMIN_PASSWORD in; data komt dan in ./data
npm start
```

- Eén aanmeldscherm voor iedereen: `http://localhost:3300/login`
- Owner: inloggen met `ADMIN_USER`/`ADMIN_PASSWORD` uit `.env`, daarna naar `/admin`

## Rollen

| Rol | Wie | Kan |
|---|---|---|
| **Owner** | WIT (gegevens in `.env`) | alles beheren: klanten, projecten, pagina's, accounts, wachtwoorden; ziet alle feedback |
| **Client** | persoon van de klant | eigen projecten bekijken, opmerkingen plaatsen, **goedkeuren of wijzigingen vragen** |
| **Reviewer** | meelezer (ook extern) | eigen projecten bekijken en opmerkingen plaatsen, **niet beslissen** |

Wachtwoorden: nieuwe accounts krijgen een startwachtwoord en kiezen bij de eerste
aanmelding een eigen (min. 10 tekens). Aanmelden wordt afgeremd na 8 mislukte
pogingen per kwartier. Opgeleverde pagina's draaien in een sandbox
(`/inhoud/:id`) en zijn alleen zichtbaar voor wie toegang heeft. Een nieuwe
pagina plaatsen zet de status terug op "in review".

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

Platte JSON (`db.json` in `DATA_DIR`, in productie `/data`), geen
databaseserver nodig. Prima voor het aantal klanten/projecten/personen waar dit
voor bedoeld is. Het bestand heeft een `schemaVersion` en wordt bij het
opstarten automatisch omgezet (met back-up) als de structuur is gewijzigd, zie
`DEPLOY.md`. Geen gelijktijdige meerdere Node-processen op dezelfde map: draai
dit als één instance.

## Deployment

Productie: <https://deliver.wit.agency>, gedeployd met Coolify op de
wit.agency-VPS. Instellingen, omgevingsvariabelen, het persistente volume en
het updaten staan in `DEPLOY.md`. Deze repo bevat bewust geen eigen
deploy-scripts of workflows.
