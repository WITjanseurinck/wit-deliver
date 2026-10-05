require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const PORT = process.env.PORT || 3300;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  console.error('SESSION_SECRET ontbreekt in .env — verplicht, genereer er een met:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('Let op: ADMIN_PASSWORD staat niet in .env — aanmelden als owner werkt dan niet.');
}

const store = require('./store');
const mig = store.init();
if (mig.migrated) {
  console.log(`db.json omgezet van versie ${mig.from} naar ${mig.to}; back-up: ${mig.backup}`);
}

const app = express();
// Achter een reverse proxy (Apache/nginx op de VPS) die https afhandelt:
// nodig zodat secure cookies en req.secure kloppen.
app.set('trust proxy', 1);

app.use('/assets', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use(express.urlencoded({ extended: false, limit: '25mb' }));
app.use(
  session({
    secret: SESSION_SECRET,
    name: 'witdeliver.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 12, // 12 uur
    },
  })
);

app.use(adminRoutes);
app.use(publicRoutes);

app.use((req, res) => {
  res.status(404).send('Niet gevonden.');
});

app.listen(PORT, () => {
  console.log(`wit-deliver luistert op http://localhost:${PORT}`);
});
