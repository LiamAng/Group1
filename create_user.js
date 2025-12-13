const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./school.db');

var args = process.argv.slice(2);

const username = args[0];
const password = args[1];
const role = args[2] || 'teacher';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;

  db.run(
    `INSERT INTO staff (username, password, role) VALUES (?, ?, ?)`,
    [username, hash, role],
    function(err) {
      if (err) throw err;
      console.log(`User ${username} created with role ${role}`);
      db.close();
    }
  );
});