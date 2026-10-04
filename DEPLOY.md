# wit-deliver op de wit.agency-VPS zetten

Voor een Claude-sessie (of mens) met SSH-toegang tot de wit.agency-server —
deze cloudsessie heeft dat niet.

## Doel

`wit-deliver` als eigen, continu draaiend Node-proces op de VPS zetten, apart
van de bestaande wit.agency-site, bereikbaar op een eigen (sub)domein, bv.
`https://deliver.wit.agency` (kies zelf een naam die niets verraadt over wat
erachter zit — niet per se nodig om "deliver" te gebruiken).

## Vereisten op de server

- Node.js ≥18 (`node -v`). Zo niet: installeer via nvm of de
  pakketbeheerder van de distributie — vraag niet zomaar een systeem-Node te
  vervangen als er al andere Node-sites op draaien.
- Een procesbeheerder die het proces na een crash of reboot herstart. Twee
  opties:
  - **pm2** (`npm install -g pm2`) — eenvoudigst als er nog geen
    procesbeheer is.
  - **systemd** — als dat al de standaard is voor andere diensten op deze
    server, sluit daarbij aan (voorbeeld-unit onderaan).
- Apache (vermoedelijk, zie `DEPLOY-toegang.md` in de `hart-voor-kennis`-repo)
  met `mod_proxy` en `mod_proxy_http` ingeschakeld, voor de reverse proxy.
  Bij nginx: zie de nginx-variant onderaan.

## Stappen

1. **Code naar de server.**
   ```
   git clone https://github.com/witjanseurinck/wit-deliver.git /opt/wit-deliver
   cd /opt/wit-deliver
   npm install --omit=dev
   ```
   (Geen SSH/git-toegang op de server? `scp -r` de map, exclusief
   `node_modules` en `.env`, en draai `npm install` daar.)

2. **`.env` aanmaken** — nooit committen, zet 'm alleen op de server:
   ```
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Plak die waarde bij `SESSION_SECRET`. Vul `ADMIN_USER` en een sterk,
   uniek `ADMIN_PASSWORD` in. Zet `NODE_ENV=production`. Laat `PORT` op
   `3300` tenzij die al in gebruik is.
   ```
   chmod 600 .env
   ```

3. **Dataplek.** Standaard komt `data/db.json` naast de code
   (`/opt/wit-deliver/data/`). Dat overleeft een `git pull`, maar niet een
   `rm -rf` van de hele map — overweeg `DATA_DIR=/var/lib/wit-deliver` in
   `.env` te zetten en die map vooraf aan te maken
   (`mkdir -p /var/lib/wit-deliver`) als je code en data strikt gescheiden
   wil houden.

4. **Proces starten.**

   Met pm2:
   ```
   pm2 start src/server.js --name wit-deliver
   pm2 save
   pm2 startup   # volg de instructie die dit commando zelf toont
   ```

   Met systemd — zet dit in `/etc/systemd/system/wit-deliver.service`:
   ```
   [Unit]
   Description=wit-deliver
   After=network.target

   [Service]
   WorkingDirectory=/opt/wit-deliver
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   User=www-data
   EnvironmentFile=/opt/wit-deliver/.env

   [Install]
   WantedBy=multi-user.target
   ```
   dan:
   ```
   systemctl daemon-reload
   systemctl enable --now wit-deliver
   ```

5. **Reverse proxy.** Apache-voorbeeld (eigen vhost-bestand of toevoegen aan
   een bestaand ssl-vhost voor het gekozen subdomein):
   ```
   <VirtualHost *:443>
     ServerName deliver.wit.agency
     ProxyPreserveHost On
     ProxyPass / http://127.0.0.1:3300/
     ProxyPassReverse / http://127.0.0.1:3300/
     # certificaat zoals de rest van wit.agency al doet (Let's Encrypt?)
   </VirtualHost>
   ```
   nginx-equivalent:
   ```
   server {
     listen 443 ssl;
     server_name deliver.wit.agency;
     location / {
       proxy_pass http://127.0.0.1:3300;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
   Zorg voor een geldig certificaat op het subdomein (Let's Encrypt, zoals de
   rest van wit.agency vermoedelijk al gebruikt) — zonder https staan
   wachtwoorden in platte tekst over de lijn.

6. **Controleer.**
   - `https://deliver.wit.agency/admin/login` → beheerslogin.
   - Maak een testklant + testproject, plaats een simpele HTML-pagina, maak
     een account aan, log in een incognitovenster in als dat account, en
     controleer dat je **alleen** dat project ziet.
   - Controleer ook dat `https://deliver.wit.agency/` zonder in te loggen
     naar `/login` stuurt, en dat er geen enkele vermelding van Claude,
     Anthropic of de broncode van deze tool zichtbaar is.

## Onderhoud

- **Code bijwerken**: `git pull && npm install --omit=dev` in
  `/opt/wit-deliver`, dan `pm2 restart wit-deliver` (of
  `systemctl restart wit-deliver`). De data in `data/db.json` blijft staan.
- **Back-up**: `data/db.json` is het enige dat echt verloren kan gaan (bevat
  alle klanten, projecten, pagina's en wachtwoord-hashes). Een periodieke
  kopie (bv. dagelijkse cron naar een andere map of externe opslag) is
  voldoende; het is platte JSON, makkelijk te doorzoeken en terug te zetten.
- **Wachtwoord admin vergeten/gelekt**: pas `ADMIN_PASSWORD` in `.env` aan en
  herstart het proces.
