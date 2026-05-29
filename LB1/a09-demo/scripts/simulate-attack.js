// ============================================================
// simulate-attack.js
//
// Simuliert einen Brute-Force-Angriff gegen den Login.
// Zeigt in der Demo:
//   - Gegen UNSICHERE Version: nichts sichtbar, kein Log
//   - Gegen SICHERE Version: Logs erscheinen, Alert wird ausgelöst
//
// Ausführen: node scripts/simulate-attack.js [port]
// ============================================================

const http = require('http');

const PORT = process.argv[2] || 3000;
const TARGET = `http://localhost:${PORT}/login`;

// Liste von Passwörtern, die ein Angreifer ausprobieren würde
const passwords = [
  'password', '123456', 'admin', 'letmein', 'qwerty',
  'password123', 'admin123', 'test', '12345678', 'abc123',
  'welcome', 'monkey', 'dragon', 'master', 'hello'
];

console.log(`\n🔴 BRUTE-FORCE-SIMULATION GESTARTET`);
console.log(`   Ziel: ${TARGET}`);
console.log(`   Versuche: ${passwords.length}\n`);

async function tryLogin(password, index) {
  return new Promise((resolve) => {
    const postData = `username=admin&password=${encodeURIComponent(password)}`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (AttackBot/1.0)'
      }
    };

    const req = http.request(TARGET, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        const icon = status === 200 ? '✅' : status === 429 ? '🚫' : '❌';
        console.log(`  ${icon} Versuch ${index + 1}: password="${password}" → Status ${status}`);
        resolve(status);
      });
    });

    req.on('error', (err) => {
      console.log(`  ⚠️  Versuch ${index + 1}: Verbindungsfehler – ${err.message}`);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

async function runAttack() {
  for (let i = 0; i < passwords.length; i++) {
    await tryLogin(passwords[i], i);
    // 200ms Pause zwischen Versuchen (realistisch für automatisierte Tools)
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n✔️  Simulation beendet.');
  console.log('   → Unsichere Version: Nichts im Log zu sehen!');
  console.log('   → Sichere Version: Security-Logs und Alerts in ./logs/\n');
}

runAttack();