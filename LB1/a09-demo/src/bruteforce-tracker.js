// ============================================================
// bruteforce-tracker.js
//
// Verfolgt fehlgeschlagene Login-Versuche pro IP.
// In Produktion: Redis verwenden (persistent, skalierbar)
// Für Demo: In-Memory Map (verliert Daten bei Neustart)
// ============================================================

const { security } = require('./logger');

// Map: IP → { count, firstAttempt, lastAttempt }
const failedAttempts = new Map();

// Schwellenwert: ab 5 Fehlversuchen → Alert
const ALERT_THRESHOLD = 5;

// Fenster: Zähler wird nach 15 Minuten zurückgesetzt
const WINDOW_MS = 15 * 60 * 1000;

const tracker = {
  /**
   * Einen fehlgeschlagenen Versuch registrieren
   * @returns {number} Aktueller Fehlversuch-Zähler
   */
  recordFailure(ip) {
    const now = Date.now();
    const existing = failedAttempts.get(ip);

    // Wenn erster Versuch oder Zeitfenster abgelaufen
    if (!existing || (now - existing.firstAttempt) > WINDOW_MS) {
      failedAttempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return 1;
    }

    // Zähler erhöhen
    const updated = {
      ...existing,
      count: existing.count + 1,
      lastAttempt: now
    };
    failedAttempts.set(ip, updated);

    // Brute-Force-Schwellenwert überschritten?
    if (updated.count === ALERT_THRESHOLD) {
      // 🚨 Security-Alert auslösen!
      security.bruteForceAlert(ip, updated.count);
    }

    return updated.count;
  },

  /**
   * Zähler nach erfolgreichem Login zurücksetzen
   */
  clearFailures(ip) {
    failedAttempts.delete(ip);
  },

  /**
   * Ist eine IP temporär gesperrt? (nach 10 Fehlversuchen)
   */
  isBlocked(ip) {
    const entry = failedAttempts.get(ip);
    if (!entry) return false;
    
    const expired = (Date.now() - entry.firstAttempt) > WINDOW_MS;
    if (expired) {
      failedAttempts.delete(ip);
      return false;
    }
    
    return entry.count >= 10; // Ab 10 Versuchen: geblockt
  },

  /**
   * Aktuellen Status abrufen (für Demo/Debugging)
   */
  getStatus(ip) {
    return failedAttempts.get(ip) || null;
  }
};

module.exports = tracker;