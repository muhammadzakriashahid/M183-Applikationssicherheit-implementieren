// ============================================================
// server-secure.js  –  A09 LÖSUNG (für Demo)
//
// VERBESSERUNGEN:
// 1. ✅ Request-Logging Middleware (alle Anfragen)
// 2. ✅ Login-Versuche (Erfolg UND Misserfolg) geloggt
// 3. ✅ Rate-Limiting (max. 10 Versuche / 15 Min)
// 4. ✅ Brute-Force-Erkennung mit Alert
// 5. ✅ Keine sensiblen Daten in Logs (kein Passwort!)
// 6. ✅ Strukturierte Security-Events (maschinenlesbar)
// 7. ✅ Logs in Datei + Konsole
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { logger, security } = require('./logger');
const tracker = require('./bruteforce-tracker');
const { findUser } = require('./data/users');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -------------------------------------------------------
// ✅ FIX 1: Request-Logging Middleware
// Jede eingehende Anfrage wird geloggt
// -------------------------------------------------------
app.use((req, res, next) => {
  const start = Date.now();

  // Wenn Antwort gesendet wird: Dauer und Status loggen
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP_REQUEST', {
      method:     req.method,
      path:       req.path,
      status:     res.statusCode,
      ip:         req.ip,
      duration_ms: duration,
      user_agent: req.headers['user-agent']
    });
  });

  next();
});

// -------------------------------------------------------
// ✅ FIX 2: Rate-Limiting
// Max. 10 Login-Versuche alle 15 Minuten pro IP
// Schützt vor automatisierten Brute-Force-Angriffen
// Quelle: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
// -------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 Minuten
  max: 10,                    // Max. 10 Versuche
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' },

  // ✅ Rate-Limit-Ereignis loggen
  handler: (req, res, next, options) => {
    security.rateLimitTriggered(req.ip, req.path, req.headers['user-agent']);
    res.status(429).send(renderLogin(
      '⚠️ Zu viele Login-Versuche. Ihr Zugang ist für 15 Minuten gesperrt.',
      null,
      true
    ));
  }
});

// Template-Funktion
function renderLogin(error = null, success = null, isSecure = true) {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Login – ${isSecure ? 'SICHER' : 'UNSICHER'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #1a1a2e; padding: 2rem; border-radius: 12px; width: 380px; border: 1px solid #2a2a4a; }
        .badge-secure { background: #052e16; color: #86efac; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px; border: 1px solid #14532d; }
        h2 { margin-bottom: 1.5rem; font-size: 1.4rem; color: #a78bfa; }
        label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #9ca3af; }
        input { width: 100%; padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid #374151; background: #0f0f1a; color: #fff; font-size: 0.95rem; margin-bottom: 1rem; }
        button { width: 100%; padding: 0.7rem; background: #7c3aed; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
        .error { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 0.6rem 0.8rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
        .success { background: #052e16; border: 1px solid #14532d; color: #86efac; padding: 0.6rem 0.8rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
        .log-hint { font-size: 0.78rem; color: #4b5563; margin-top: 1rem; text-align: center; border-top: 1px solid #1f2937; padding-top: 0.75rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔒 Admin Portal <span class="badge-secure">SICHER</span></h2>
        ${error ? `<div class="error">${error}</div>` : ''}
        ${success ? `<div class="success">${success}</div>` : ''}
        <form method="POST" action="/login">
          <label>Benutzername</label>
          <input type="text" name="username" autocomplete="off" required>
          <label>Passwort</label>
          <input type="password" name="password" required>
          <button type="submit">Einloggen</button>
        </form>
        <p class="log-hint">💡 Alle Login-Versuche werden geloggt und überwacht.</p>
      </div>
    </body>
    </html>
  `;
}

// GET /
app.get('/', (req, res) => {
  res.send(renderLogin());
});

// POST /login mit Rate-Limiting
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  // ✅ FIX 3: Brute-Force-Erkennung prüfen
  if (tracker.isBlocked(ip)) {
    security.unauthorizedAccess(ip, '/login', userAgent);
    return res.status(403).send(renderLogin(
      '🚫 Ihr Zugang wurde temporär gesperrt. Kontaktieren Sie den Administrator.'
    ));
  }

  // ✅ FIX 4: Login-Versuch loggen (BEVOR wir die DB abfragen)
  logger.info('LOGIN_ATTEMPT', { 
    username, 
    ip, 
    // WICHTIG: Passwort wird NIEMALS geloggt!
    user_agent: userAgent 
  });

  const user = findUser(username);

  if (!user) {
    // ✅ FIX 5: Fehlgeschlagenen Login loggen
    const failCount = tracker.recordFailure(ip);
    security.loginFailed(username, ip, 'user_not_found', userAgent);
    
    // ✅ Nach OWASP: Gleiche Fehlermeldung für "User nicht gefunden" 
    // und "Falsches Passwort" → verhindert Username-Enumeration
    return res.status(401).send(renderLogin(
      `Ungültige Zugangsdaten. (Versuch ${failCount}/10)`
    ));
  }

  try {
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      // ✅ FIX 6: Falsches Passwort loggen
      const failCount = tracker.recordFailure(ip);
      security.loginFailed(username, ip, 'wrong_password', userAgent);
      
      return res.status(401).send(renderLogin(
        `Ungültige Zugangsdaten. (Versuch ${failCount}/10)`
      ));
    }

    // ✅ FIX 7: Erfolgreichen Login loggen
    tracker.clearFailures(ip);
    security.loginSuccess(username, user.id, user.role, ip, userAgent);
    
    return res.send(renderLogin(
      null, 
      `✅ Willkommen, ${user.username}! Rolle: ${user.role}`
    ));

  } catch (err) {
    // ✅ FIX 8: Fehler strukturiert loggen
    security.serverError(err, { path: '/login', username });
    return res.status(500).send(renderLogin('Ein interner Fehler ist aufgetreten.'));
  }
});

// Dashboard mit Auth-Check
app.get('/dashboard', (req, res) => {
  // In Produktion: Session/JWT prüfen
  // Für Demo: unautorisierten Zugriff loggen
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // ✅ FIX 9: Unauthorisierten Zugriff loggen
    security.unauthorizedAccess(req.ip, '/dashboard', req.headers['user-agent']);
    return res.status(401).send('<h2 style="font-family:sans-serif;padding:2rem;color:#f87171">401 – Kein Zugriff. Bitte einloggen.</h2>');
  }

  res.send('<h1 style="font-family:sans-serif;padding:2rem;color:#7c3aed">Admin Dashboard – Zugriff protokolliert!</h1>');
});

const PORT = 3001; // Anderer Port als unsichere Version
app.listen(PORT, () => {
  // ✅ FIX 10: Startup-Event loggen
  logger.info('SERVER_STARTED', {
    event_type: 'APPLICATION_START',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version
  });
});