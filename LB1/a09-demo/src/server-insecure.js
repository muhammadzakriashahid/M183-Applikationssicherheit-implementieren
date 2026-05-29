// ============================================================
// server-insecure.js  –  A09 SCHWACHSTELLE (für Demo)
// 
// PROBLEME IN DIESER DATEI:
// 1. Kein Logging bei Login-Fehlern
// 2. Kein Logging bei Erfolg (wer hat sich wann eingeloggt?)
// 3. Kein Rate-Limiting (Brute-Force möglich)
// 4. Fehler werden "stumm" behandelt
// 5. Keine Anfrage-IDs für Tracing
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { findUser } = require('./data/users');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ❌ FEHLER 1: Kein Logging-Middleware
// Wir wissen nicht, wer wann welche Route aufruft

// Einfache Template-Funktion (kein echtes Templating nötig für Demo)
function renderLogin(error = null, success = null) {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Login – UNSICHER</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #1a1a2e; padding: 2rem; border-radius: 12px; width: 360px; border: 1px solid #2a2a4a; }
        .badge { background: #7f1d1d; color: #fca5a5; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px; }
        h2 { margin-bottom: 1.5rem; font-size: 1.4rem; color: #f87171; }
        label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #9ca3af; }
        input { width: 100%; padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid #374151; background: #0f0f1a; color: #fff; font-size: 0.95rem; margin-bottom: 1rem; }
        button { width: 100%; padding: 0.7rem; background: #7c3aed; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
        .error { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 0.6rem 0.8rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
        .success { background: #052e16; border: 1px solid #14532d; color: #86efac; padding: 0.6rem 0.8rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔓 Admin Portal <span class="badge">UNSICHER</span></h2>
        ${error ? `<div class="error">${error}</div>` : ''}
        ${success ? `<div class="success">${success}</div>` : ''}
        <form method="POST" action="/login">
          <label>Benutzername</label>
          <input type="text" name="username" autocomplete="off" required>
          <label>Passwort</label>
          <input type="password" name="password" required>
          <button type="submit">Einloggen</button>
        </form>
      </div>
    </body>
    </html>
  `;
}

// GET / – Login-Seite anzeigen
app.get('/', (req, res) => {
  res.send(renderLogin());
});

// POST /login – Login verarbeiten
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // ❌ FEHLER 2: Kein Logging des Login-Versuchs
  // Wir wissen nicht: Wer versucht sich einzuloggen? Von welcher IP?

  const user = findUser(username);

  if (!user) {
    // ❌ FEHLER 3: Kein Logging des fehlgeschlagenen Logins
    // Ein Angreifer kann unbegrenzt verschiedene Benutzernamen ausprobieren
    return res.status(401).send(renderLogin('Ungültige Zugangsdaten'));
  }

  try {
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      // ❌ FEHLER 4: Kein Logging bei falschem Passwort
      // Brute-Force ist komplett unsichtbar!
      return res.status(401).send(renderLogin('Ungültige Zugangsdaten'));
    }

    // ❌ FEHLER 5: Kein Logging des erfolgreichen Logins
    // Wir wissen nie, wer sich eingeloggt hat!
    return res.send(renderLogin(null, `Willkommen, ${user.username}! (Rolle: ${user.role})`));

  } catch (err) {
    // ❌ FEHLER 6: Fehler werden nicht geloggt
    console.error(err); // nur zur Konsole, kein strukturiertes Logging
    return res.status(500).send(renderLogin('Interner Fehler'));
  }
});

// Dashboard (nach Login)
app.get('/dashboard', (req, res) => {
  // ❌ FEHLER 7: Kein Auth-Check – jeder kann /dashboard aufrufen!
  // ❌ FEHLER 8: Kein Logging dieses Zugriffs
  res.send(`
    <h1 style="font-family:sans-serif;padding:2rem;color:#7c3aed">Admin Dashboard</h1>
    <p style="font-family:sans-serif;padding:0 2rem">Geheime Daten hier... (kein Logging, kein Auth-Check!)</p>
  `);
});

const PORT = 3000;
app.listen(PORT, () => {
  // Kein strukturiertes Startup-Log
  console.log(`Server läuft auf Port ${PORT}`);
});