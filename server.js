require('dotenv').config();
const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'dashboard.json');
const JWT_SECRET = process.env.JWT_SECRET;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// ---------- Авторизація ----------
 
// Логін: перевіряє логін/пароль, повертає JWT-токен
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Потрібні username і password' });
  }
 
  const validUsername = username === process.env.USERNAME;
  const validPassword = validUsername
    ? await bcrypt.compare(password, process.env.PASSWORD_HASH)
    : false;
 
  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: 'Невірний логін або пароль' });
  }
 
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '48h' });
  res.json({ token });
});
 
// Middleware: перевіряє JWT-токен у заголовку Authorization: Bearer <token>
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
 
  if (!token) {
    return res.status(401).json({ error: 'Токен відсутній' });
  }
 
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Токен недійсний або прострочений' });
    }
    req.user = user;
    next();
  });
}


// Отримати всі машини
app.get('/api/trips', async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  res.json(JSON.parse(raw));
});

// Додати  машину (endpoint для зовнішніх систем)
app.post('/api/trip',authenticateToken, async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const trips = JSON.parse(raw);
  trips.push(req.body);
  await fs.writeFile(DATA_FILE, JSON.stringify(trips, null, 2));
  res.json({ result: 'success' });
});

// Оновити конкретну машину (endpoint для зовнішніх систем)
app.post('/api/trip/update/:id', authenticateToken, async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const trips = JSON.parse(raw);

  const index = trips.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  trips[index] = {
    ...trips[index],
    ...(req.body || {}),
    vehicle: {
      ...trips[index].vehicle,
      ...(req.body.vehicle || {})
    }
  };

  await fs.writeFile(DATA_FILE, JSON.stringify(trips, null, 2));
  res.json(trips[index]);
});



// Додати всі машини (endpoint для зовнішніх систем)
app.post('/api/trip/batch', authenticateToken, async (req, res) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(req.body || [], null, 2));
  res.json({ result: 'success' });
});

//  Видалити конкретну машину (endpoint для зовнішніх систем)
app.post('/api/trip/remove/:id', authenticateToken, async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const trips = JSON.parse(raw);

  const index = trips.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  trips.splice(index, 1);
  await fs.writeFile(DATA_FILE, JSON.stringify(trips, null, 2));
  res.json({ result: 'success', id: req.params.id });
});

app.listen(PORT, () => console.log(`Server is running`));