const REFRESH_MS = 10000;

// Відповідність статусу з JSON -> CSS клас
function statusClass(rawStatus) {
  const s = (rawStatus || '').trim().toUpperCase().replace(/\.$/, '');
  if (s === 'В РУСІ') return 'status-onroute';
  if (s === 'В ОЧІКУВАННІ') return 'status-ready';
  if (s === 'НЕСПРАВНА') return 'status-broken';
  if (s === 'ЧЕКАЄ ЕВАКУАЦІЇ') return 'status-evac';
  if (s === 'ЗЛАМАЛАСЬ В ДОРОЗІ') return 'status-broken-halfway';
  return 'status-onroute'; // невідомий статус - за замовчуванням сірий
}

function getImageSrc(vehicle) {
  const map = {
    'pickup': 'images/vehicles/pickup.png',
    'kamaz': 'images/vehicles/kamaz.png',
    'kraz': 'images/vehicles/kraz.png',
    'bus': 'images/vehicles/bus.png',
    'bbm': 'images/vehicles/bbm.png',
    'oshkosh': 'images/vehicles/oshkosh.png',
  };
  return map[vehicle && vehicle.type] || 'images/vehicles/pickup.png'; // картинка-заглушка про запас
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `З ${hh}:${mm}`;
}

function toggleCardFlip(cardElement) {
  return function() {
    if (cardElement.classList.contains('flipped')) {
      cardElement.classList.remove('flipped');
    } else {
      document.querySelectorAll('.card-flip.flipped').forEach(card => card.classList.remove('flipped')); // закриваємо інші перевернуті картки
      cardElement.classList.add('flipped');
      setTimeout(() => cardElement.classList.remove('flipped'), 5000); // автоматично перевертаємо назад через 5 секунд

    }}
}

function buildTopCard(trip) {
  const v = trip.vehicle || {};
  const cls = statusClass(trip.status);

  const wrapper = document.createElement('div');
  wrapper.className = 'card-flip';
  wrapper.addEventListener('click', toggleCardFlip(wrapper));

  wrapper.innerHTML = `
    <div class="card-inner ${cls}">
      <div class="card-front">
        <img class="vehicle-img" src="${getImageSrc(trip.vehicle)}" alt="">
        <div class="line-title">${v.model || ''}</div>
        <div class="line-status">${trip.status || ''}</div>
        <div class="line-time">${formatTime(trip.update_time)}</div>
        <div class="line-comment">${trip.route || '-'}</div>
        <div class="line-comment">${v.drone_defence || ''}</div>
      </div>
      <div class="card-back">
        <div class="back-line"><span class="back-label">Номер:</span> ${v.plate_number || ''}</div>
        <div class="back-line"><span class="back-label">Водій:</span> ${v.driver || '-'}</div>
        <div class="back-line"><span class="back-label">Старший:</span> ${v.in_charge || '-'}</div>
        <div class="back-line"><span class="back-label">Мета:</span> ${trip.purpose || '-'}</div>
      </div>
    </div>
  `;

  return wrapper;
}

function buildBottomCard(trip) {
  const v = trip.vehicle || {};
  const cls = statusClass(trip.status);

  const wrapper = document.createElement('div');
  wrapper.className = 'card-flip';
  wrapper.addEventListener('click', toggleCardFlip(wrapper));

  wrapper.innerHTML = `
    <div class="card-inner ${cls}">
      <div class="card-front">
        <img class="vehicle-img" src="${getImageSrc(trip.vehicle)}" alt="">
        <div class="line-title">${trip.vehicle.unit}</div>
        <div class="line-status">${v.model || ''}</div>
        <div class="line-time">${formatTime(trip.update_time)}</div>
        <div class="line-comment">${trip.purpose || '-'}</div>
      </div>
      <div class="card-back">
        <div class="back-line"><span class="back-label">Номер:</span> ${v.plate_number || ''}</div>
        <div class="back-line"><span class="back-label">Водій:</span> ${v.driver || '-'}</div>
        <div class="back-line"><span class="back-label">Старший:</span> ${v.in_charge || '-'}</div>
        <div class="back-line"><span class="back-label">Захист:</span> ${v.drone_defence || ''}</div>
      </div>
    </div>
  `;

  return wrapper;
}

function renderTopGrid(trips) {
  const topGrid = document.getElementById('topGrid');
  topGrid.innerHTML = '';

  const byUnit = {
    "1 садн": [],
    "2 садн": [],
    "3 адн": [],
    "4 адн": [],
    "днар": [],
    "реабатр": []
  };
  
  trips.forEach(trip => {
    const unit = (trip.vehicle && trip.vehicle.unit);
    if (byUnit[unit]) {
      byUnit[unit].push(trip);
    }
  });

  Object.keys(byUnit).forEach(unit => {
    const column = document.createElement('div');
    column.className = 'column';

    const header = document.createElement('div');
    header.className = 'column-header';
    header.textContent = unit;
    column.appendChild(header);

    const tilesWrap = document.createElement('div');
    tilesWrap.className = 'column-tiles';
    byUnit[unit].forEach(trip => tilesWrap.appendChild(buildTopCard(trip)));
    column.appendChild(tilesWrap);

    topGrid.appendChild(column);
  });
}

function renderBottomGrid(trips) {
  const bottomGrid = document.getElementById('bottomGrid');
  bottomGrid.innerHTML = '';
  trips.forEach(trip => bottomGrid.appendChild(buildBottomCard(trip)));
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/trips');
    const trips = await res.json();

    const onRoute = trips.filter(t => t.vehicle && t.vehicle.on_duty === true);
    const offRoute = trips.filter(t => !t.vehicle || t.vehicle.on_duty === false);

    // Не перемальовуємо відкриту (перевернуту) картку під час автооновлення
    const anyFlipped = document.querySelector('.card-flip.flipped');
    if (anyFlipped) return;

    renderTopGrid(onRoute);
    renderBottomGrid(offRoute);
  } catch (err) {
    console.error('Не вдалося завантажити дані дашборду:', err);
  }
}

loadDashboard();
setInterval(loadDashboard, REFRESH_MS);