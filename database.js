const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./school.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      LRN TEXT PRIMARY KEY CHECK (length(LRN) = 12 AND LRN GLOB '[0-9]*'),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      grade_section TEXT,
      photo TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('teacher', 'admin'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS violations (
      violation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      LRN TEXT,
      teacher_id INTEGER,
      violation_type TEXT,      description TEXT,
      date TEXT,      FOREIGN KEY(LRN) REFERENCES students(LRN),
      FOREIGN KEY(teacher_id) REFERENCES staff(teacher_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scan_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      LRN TEXT,
      time_in TEXT,
      time_out TEXT,
      device TEXT,
      FOREIGN KEY(LRN) REFERENCES students(LRN)
    )
  `);
});

module.exports = db;