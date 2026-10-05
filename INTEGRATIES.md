# Ad-platforms en analytics: wat wel, wat (nog) niet, en waarom

Jan vroeg om "mogelijkheid tot integratie met alle ad platformen,
communicatie met advertentieplatformen en analytics" en vroeg zelf goed na
te denken wat hij zou kunnen willen, met geen moment om dat af te stemmen.
Dit document legt vast wat er nu wél staat, wat welbewust niet gebouwd is
zonder overleg, en in welke volgorde de rest logisch zou volgen.

## Wat er nu is

Op elke klant staat een **Koppelingen**-sectie: vier velden (Google Ads,
Meta Ads, LinkedIn Ads, GA4) om de account-/property-ID bij die klant te
noteren. Dat lost het eerste echte probleem op — nu staan die ID's verspreid
over mailtjes en losse notities — zonder dat er ergens een API-call naar een
extern platform gebeurt. Puur een naslagveld.

## Wat welbewust niet gebouwd is, en waarom

Drie dingen die écht "integratie" zouden zijn — live data ophalen bij een
platform, of live iets wegschrijven — zijn **niet** aangeraakt deze sessie:

1. **Er zijn geen credentials.** Elk platform (Google Ads, Meta Marketing
   API, LinkedIn Ads API, GA4 Data API) vraagt een eigen OAuth-app-
   registratie, API-sleutels en toestemming van het platform zelf. Die kan
   alleen Jan aanmaken (het zijn zijn accounts) — er is niets om tegenaan te
   bouwen zonder dat eerst te hebben.
2. **Schrijvende acties naar een ad-platform zijn onomkeerbaar en kunnen
   geld kosten.** Een creative automatisch live zetten als advertentie, een
   budget aanpassen, een campagne activeren — dat is precies het soort actie
   waarbij een fout (verkeerde klant, verkeerd account, een API die anders
   werkt dan verwacht) direct schade doet. Dat hoort nooit zonder
   menselijke bevestiging per actie, en zeker niet als eerste versie,
   ongetest, terwijl er niemand is om het resultaat meteen te controleren.
3. **Vier platformen "in één keer" bouwen zonder prioriteit is een goede
   manier om vier halve, ongeteste integraties te krijgen.** Beter één
   platform écht laten werken dan vier die niemand uitgeprobeerd heeft.

## Een logische volgorde voor hierna — ter beoordeling, niet uitgevoerd

**Fase 1 — gedaan.** Referentievelden per klant (dit zet geen data van het
platform om, haalt niets op).

**Fase 2 — lezen, geen risico.** Per project de campagneprestaties ernaast
tonen: klikken, vertoningen, kosten, uit Google Ads/Meta/LinkedIn's
*reporting*-API's, of GA4-verkeer naar de bestemming die de banner al
gebruikt (de `bestemming`/`clickTag`-URL staat al in elk bannerproject in
`hart-voor-kennis`, dat is al een directe koppeling tussen banner en
GA4-doelpagina). Puur lezen = geen weggeschreven actie, dus veel minder
risico. Vraagt wel: welk platform eerst, en Jans eigen API-toegang per
platform.

**Fase 3 — schrijven, altijd met bevestiging.** Een creative vanuit
wit-deliver rechtstreeks als nieuwe advertentie naar een platform pushen.
Dit zou ik nooit "automatisch" maken — altijd een expliciete
bevestigingsstap per actie, per klant, met een duidelijke samenvatting van
wat er gaat gebeuren vóór het gebeurt.

## Wat ik nodig heb om hieraan te beginnen

Voor Fase 2, per platform dat je eerst wil:
- Een API-/OAuth-app geregistreerd bij dat platform (ontwikkelaarsaccount)
- De scopes/rechten die het reporting-deel nodig heeft (geen schrijfrechten)
- Een testaccount of -campagne om tegen te proberen voor het op een
  live klantaccount wordt losgelaten

Zonder dat is er niets zinnigs te bouwen — elke poging zonder echte
credentials zou ongeteste code zijn die niemand kan verifiëren.
