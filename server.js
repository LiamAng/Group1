const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 2000;
const JWT_SECRET = 'anglala';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM staff WHERE username = ?`, [username], (err, teacher) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!teacher) return res.status(401).json({ error: 'User not found' });

    bcrypt.compare(password, teacher.password, (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!match) return res.status(401).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: teacher.teacher_id, role: teacher.role }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, role: teacher.role });
    });
  });
});

function authenticate(role = null) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      if (role && user.role !== role) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };
}

app.get('/students', authenticate(), (req, res) => {
  db.all(`SELECT * FROM students`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/add-student', authenticate('admin'), upload.single('photo'), (req, res) => {
  const { LRN, first_name, last_name, grade_section } = req.body;
  let photoPath = null;
  if (req.file) {
    photoPath = '/uploads/' + req.file.filename;
  }

  db.run(
    `INSERT INTO students (LRN, first_name, last_name, grade_section, photo) VALUES (?, ?, ?, ?, ?)`,
    [LRN, first_name, last_name, grade_section, photoPath],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, LRN, photo: photoPath });
    }
  );
});

app.delete('/delete-student/:lrn', authenticate('admin'), (req, res) => {
  db.run(`DELETE FROM students WHERE LRN = ?`, [req.params.lrn], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/teachers', authenticate('admin'), (req, res) => {
  db.all(`SELECT teacher_id, username, role FROM staff`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/add-teacher', authenticate('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO staff (username, password, role) VALUES (?, ?, ?)`,
      [username, hashedPassword, role],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, teacher_id: this.lastID, username, role });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/delete-teacher/:id', authenticate('admin'), (req, res) => {
  const teacherId = req.params.id;
  
  if (req.user.id == teacherId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  db.run(`DELETE FROM staff WHERE teacher_id = ?`, [teacherId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/violations', authenticate(), (req, res) => {
  db.all(`
    SELECT v.*, s.first_name, s.last_name, st.username as recorded_by
    FROM violations v
    JOIN students s ON v.LRN = s.LRN
    JOIN staff st ON v.teacher_id = st.teacher_id
    ORDER BY v.date DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/violations/student/:lrn', authenticate(), (req, res) => {
  db.all(`
    SELECT v.*, st.username as recorded_by
    FROM violations v
    JOIN staff st ON v.teacher_id = st.teacher_id
    WHERE v.LRN = ?
    ORDER BY v.date DESC
  `, [req.params.lrn], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/add-violation', authenticate(), (req, res) => {
  const { LRN, violation_type, description } = req.body;
  const teacher_id = req.user.id;
  const date = new Date().toISOString();

  db.run(
    `INSERT INTO violations (LRN, teacher_id, violation_type, description, date) VALUES (?, ?, ?, ?, ?)`,
    [LRN, teacher_id, violation_type, description, date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, violation_id: this.lastID });
    }
  );
});

app.get('/reports', authenticate(), (req, res) => {
  const reports = {};

  db.get(`SELECT COUNT(*) as count FROM students`, [], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    reports.totalStudents = result.count;

    db.get(`SELECT COUNT(*) as count FROM violations`, [], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      reports.totalViolations = result.count;

      db.get(`SELECT COUNT(*) as count FROM staff`, [], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        reports.totalTeachers = result.count;

        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        db.get(`SELECT COUNT(*) as count FROM violations WHERE date >= ?`, [firstDayOfMonth], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          reports.violationsThisMonth = result.count;

          db.all(`
            SELECT v.*, s.first_name, s.last_name, st.username as recorded_by
            FROM violations v
            JOIN students s ON v.LRN = s.LRN
            JOIN staff st ON v.teacher_id = st.teacher_id
            ORDER BY v.date DESC
            LIMIT 10
          `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            reports.recentViolations = rows;
            res.json(reports);
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});