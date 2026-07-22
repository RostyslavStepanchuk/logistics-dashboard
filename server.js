const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'dashboard.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Отримати всі машини
app.get('/api/cars', async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  res.json(JSON.parse(raw));
});

// Оновити конкретну машину (endpoint для зовнішніх систем)
app.post('/api/cars/:id', async (req, res) => {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const cars = JSON.parse(raw);

  const index = cars.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Car not found' });
  }

  cars[index] = { ...cars[index], ...req.body };
  await fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2));

  res.json(cars[index]);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));