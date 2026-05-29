// ============================================================
// logger.js – Professionelles Security Logging mit Winston
//
// Dieses Modul zentralisiert das gesamte Logging der Anwendung.
// Warum Winston?
//   - Strukturiertes JSON-Logging (maschinenlesbar für SIEMs)
//   - Mehrere Transport-Ziele gleichzeitig (Console + Datei)
//   - Log-Levels: error > warn > info > debug
//   - Automatische Log-Rotation (kein 100GB-Log-File)
//
// Quellen:
//   https://github.com/winstonjs/winston
//   https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
// ============================================================

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Log-Verzeichnis sicherstellen
const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -------------------------------------------------------
// FORMATIERUNG
// -------------------------------------------------------

// Format für die Konsole (bunt, menschenlesbar)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length 
      ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')
      : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

// Format für Dateien (JSON, maschinenlesbar für SIEMs wie Splunk, ELK)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// -------------------------------------------------------
// TRANSPORTS (Ziele für Logs)
// -------------------------------------------------------

const transports = [
  // 1. Konsole – für Entwicklung und Live-Demo
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }),

  // 2. Alle Logs in Datei (rotiert täglich, max 14 Tage aufbehalten)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    level: 'info',
    format: fileFormat
  }),

  // 3. Nur Security-relevante Events (warn + error) in eigene Datei
  //    → Diese Datei wäre das Input für ein SIEM / Alerting-System
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '90d',   // Security-Logs länger aufbewahren (Compliance!)
    level: 'warn',
    format: fileFormat
  })
];

// -------------------------------------------------------
// LOGGER ERSTELLEN
// -------------------------------------------------------
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports
});

// -------------------------------------------------------
// SECURITY-SPEZIFISCHE LOGGING-FUNKTIONEN
// Strukturierte Events mit einheitlichen Feldern
// (Event-ID, IP, User-Agent – wichtig für Forensik)
// -------------------------------------------------------

const security = {
  /**
   * Fehlgeschlagener Login-Versuch
   * @param {string} username - Eingegebener Benutzername (kann falsch sein)
   * @param {string} ip - IP-Adresse des Anfragers
   * @param {string} reason - Grund: 'user_not_found' | 'wrong_password'
   * @param {string} userAgent - Browser/Client-Information
   */
  loginFailed(username, ip, reason, userAgent) {
    // WICHTIG nach OWASP Logging Cheat Sheet:
    // - Wann? (timestamp ist automatisch dabei)
    // - Was? (event_type)
    // - Wer? (username, ip)
    // - Warum gescheitert? (reason)
    // - Wie? (user_agent für Forensik)
    logger.warn('LOGIN_FAILED', {
      event_type:  'AUTH_FAILURE',
      event_id:    'SEC-001',
      username:    username,
      ip:          ip,
      reason:      reason,
      user_agent:  userAgent,
      // NICHT LOGGEN: das eingegebene Passwort! Das wäre ein Security-Leak
    });
  },

  /**
   * Erfolgreicher Login
   */
  loginSuccess(username, userId, role, ip, userAgent) {
    logger.info('LOGIN_SUCCESS', {
      event_type:  'AUTH_SUCCESS',
      event_id:    'SEC-002',
      username:    username,
      user_id:     userId,
      role:        role,
      ip:          ip,
      user_agent:  userAgent,
    });
  },

  /**
   * Rate-Limit ausgelöst (zu viele Versuche)
   */
  rateLimitTriggered(ip, path, userAgent) {
    logger.warn('RATE_LIMIT_TRIGGERED', {
      event_type:  'RATE_LIMIT_EXCEEDED',
      event_id:    'SEC-003',
      ip:          ip,
      path:        path,
      user_agent:  userAgent,
      // 🚨 In Produktion: Hier Pagerduty/Slack/E-Mail Alert auslösen!
    });
  },

  /**
   * Unautorisierten Zugriff protokollieren
   */
  unauthorizedAccess(ip, path, userAgent) {
    logger.warn('UNAUTHORIZED_ACCESS', {
      event_type:  'UNAUTHORIZED',
      event_id:    'SEC-004',
      ip:          ip,
      path:        path,
      user_agent:  userAgent,
    });
  },

  /**
   * Server-Fehler (intern, nicht zum User)
   */
  serverError(err, context) {
    logger.error('SERVER_ERROR', {
      event_type:  'INTERNAL_ERROR',
      event_id:    'SEC-005',
      message:     err.message,
      stack:       err.stack,
      context:     context
    });
  },

  /**
   * Brute-Force-Angriff erkannt (viele Fehler von einer IP)
   * Diese Funktion würde in Produktion einen ALERT senden
   */
  bruteForceAlert(ip, failCount) {
    logger.error('BRUTE_FORCE_DETECTED', {
      event_type:  'BRUTE_FORCE_ATTACK',
      event_id:    'SEC-006',
      ip:          ip,
      fail_count:  failCount,
      severity:    'CRITICAL',
      action:      'IP should be blocked immediately',
      // 🚨 Hier würde man:
      // 1. Email an Security-Team senden
      // 2. Slack/Teams-Notification
      // 3. IP in Firewall sperren
      // 4. SIEM-Ticket erstellen
      alert_sent:  false  // In Produktion: true nach Alert
    });
  }
};

module.exports = { logger, security };