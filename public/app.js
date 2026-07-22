const statusColors = {
  ready: '#2e7d32',       // зелений
  on_route: '#f9a825',    // жовтий
  broken: '#c62828',      // червоний
  maintenance: '#616161'  // сірий
};

const statusLabels = {
  ready: 'Готова',
  on_route: 'В дорозі',
  broken: 'Несправна',
  maintenance: 'Тех. обслуговування'
};

async function loadCars() {
  const res = await fetch('/api/cars');
  const cars = await res.json();
  render(cars);
}

function render(cars) {
  const directions = [...new Set(cars.map(c => c.direction))];
  const board = document.getElementById('board');
  board.innerHTML = '';

  directions.forEach(dir => {
    const column = document.createElement('div');
    column.className = 'column';
    column.innerHTML = `<h2>${dir}</h2>`;

    cars.filter(c => c.direction === dir).forEach(car => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = statusColors[car.status] || '#333';
      card.innerHTML = `<strong>${car.name}</strong><br>${statusLabels[car.status] || car.status}`;
      column.appendChild(card);
    });

    board.appendChild(column);
  });
}

loadCars();
setInterval(loadCars, 5000); // оновлення кожні 5 секунд