// src/data/users.js
// Simulierte "Datenbank" mit gehashten Passwörtern
// In Produktion: echte DB (PostgreSQL, MongoDB etc.)
const bcrypt = require('bcryptjs');

// Passwörter wurden mit bcrypt.hashSync('passwort', 10) generiert
const users = [
  {
    id: 1,
    username: 'admin',
    // Passwort: "admin123"
    password: bcrypt.hashSync('admin123', 10),
    role: 'administrator'
  },
  {
    id: 2, 
    username: 'alice',
    // Passwort: "alice2024"
    password: bcrypt.hashSync('alice2024', 10),
    role: 'user'
  }
];

function findUser(username) {
  return users.find(u => u.username === username) || null;
}

module.exports = { findUser };