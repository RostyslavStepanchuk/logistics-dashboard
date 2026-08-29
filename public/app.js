const REFRESH_MS = 10000;
const MAX_CARDS_PER_COLUMN = 4;
const MIN_COLUMNS_BOTTOM = 7;
const MAX_COLUMNS_BOTTOM = 11;

// Відповідність статусу з JSON -> CSS клас
function statusClass(rawStatus) {
  const s = (rawStatus || '').trim().toUpperCase().replace(/\.$/, '');
  if (s === 'В РУСІ' || s === 'ВЕРТАЄТЬСЯ') return 'status-onroute';
  if (s === 'В ОЧІКУВАННІ' || s === 'В ПУНКТІ ПРИЗНАЧЕННЯ') return 'status-ready';
  if (s === 'НЕСПРАВНИЙ') return 'status-broken';
  if (s === 'ЧЕКАЄ ЕВАКУАЦІЇ') return 'status-evac';
  if (s === 'ПОЛОМКА В ДОРОЗІ' || s === 'ЗАГРОЗА') return 'status-broken-halfway';
  return 'status-ready'; // невідомий статус - за замовчуванням сірий
}

function getImageSrc(vehicle) {
  const map = {
    'pickup': 'images/vehicles/pickup.png',
    'kamaz': 'images/vehicles/kamaz.png',
    'kraz': 'images/vehicles/kraz.png',
    'bus': 'images/vehicles/bus.png',
    'bbm': 'images/vehicles/bbm.png',
    'oshkosh': 'images/vehicles/oshkosh.png',
    'daf': 'images/vehicles/daf.png',
    'uaz': 'images/vehicles/uaz.png',
    'tdc': 'images/vehicles/tdc.png',
  };
  return map[vehicle && vehicle.type] || 'images/vehicles/pickup.png'; // картинка-заглушка про запас
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  let date = '';
  const now = new Date();
  if (d.getDate() !== now.getDate()) {
    date = ` (${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')})`;
  }

  return `З ${hh}:${mm}${date}`;
}

function toggleCardFlip(cardElement) {
  return function () {
    if (cardElement.classList.contains('flipped')) {
      cardElement.classList.remove('flipped');
    } else {
      document.querySelectorAll('.card-flip.flipped').forEach(card => card.classList.remove('flipped')); // закриваємо інші перевернуті картки
      cardElement.classList.add('flipped');
      setTimeout(() => cardElement.classList.remove('flipped'), 5000); // автоматично перевертаємо назад через 5 секунд
    }
  }
}

function buildTripCard(trip, isTopGrid = true) {
  const v = trip.vehicle || {};
  const cls = statusClass(trip.status);

  const wrapper = document.createElement('div');
  wrapper.className = 'card-flip';
  wrapper.addEventListener('click', toggleCardFlip(wrapper));

  wrapper.innerHTML = `
    <div class="card-inner ${cls}">
      <div class="card-front">
        <img class="vehicle-img ${trip.vehicle.type}" src="${getImageSrc(trip.vehicle)}" alt="">
        <div class="line-title">${v.model || ''}</div>
        <div class="line-status">${trip.status || ''}</div>
        <div class="line-time">${formatTime(trip.update_time)}</div>
        <div class="line-comment">${trip.route || '-'}</div>
        <div class="line-comment">${(isTopGrid ? v.drone_defence : trip.purpose) || '-'}</div>
      </div>
      <div class="card-back">
        <div class="back-line"><span class="back-label">Номер:</span> ${v.plate_number || ''}</div>
        <div class="back-line"><span class="back-label">Водій:</span> ${v.driver || '-'}</div>
        <div class="back-line"><span class="back-label">Старший:</span> ${v.in_charge || '-'}</div>
        <div class="back-line"><span class="back-label">${isTopGrid ? 'Мета' : 'РЕБ'}:</span> ${(isTopGrid ? trip.purpose : v.drone_defence) || '-'}</div>
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
    "реабатр": [],
    "інші пірозділи": []
  };

  trips.forEach(trip => {
    const unit = (trip.vehicle && trip.vehicle.unit);
    if (byUnit[unit]) {
      byUnit[unit].push(trip);
    } else {
      byUnit["інші пірозділи"].push(trip);
    }
  });

  Object.keys(byUnit).forEach(unit => {
    const column = document.createElement('div');
    column.className = 'column';

    const header = document.createElement('div');
    header.className = 'column-header';
    header.textContent = unit;
    column.appendChild(header);
    column.appendChild(buildStackOfTiles(byUnit[unit], true));
    topGrid.appendChild(column);
  });
}

function renderBottomGrid(trips) {
  const bottomGrid = document.getElementById('bottomGrid');
  bottomGrid.innerHTML = '';

  const byUnit = {};
  trips.forEach(trip => {
    const unit = (trip.vehicle && trip.vehicle.unit);
    if (byUnit[unit]) {
      byUnit[unit].push(trip);
    } else {
      byUnit[unit] = [trip];
    }
  });

  let totalColumns = 0;

  Object.keys(byUnit)
    .sort()
    .forEach(unit => {
      const column = document.createElement('div');
      column.className = 'column';

      const header = document.createElement('div');
      header.className = 'column-header';
      header.textContent = unit;
      column.appendChild(header);

      let subColumns = Math.min(Math.ceil(byUnit[unit].length / MAX_CARDS_PER_COLUMN), 3); // обмежуємо до 3 підколонок
      totalColumns += subColumns;
      if (subColumns === 1) {
        column.appendChild(buildStackOfTiles(byUnit[unit], false));
      } else {
        const container = document.createElement('div');
        container.classList.add('column-split')
        column.classList.add(subColumns === 2 ? 'column-double' : 'column-triple');

        while (subColumns > 0) {
          const tilesPerSubColumn = Math.ceil(byUnit[unit].length / subColumns);
          const subColumn = byUnit[unit].splice(0, tilesPerSubColumn);
          container.appendChild(buildStackOfTiles(subColumn, false));
          subColumns--;
        }
        column.appendChild(container);
      }
      bottomGrid.appendChild(column);
    });
  
  const columnsToSet = Math.max(MIN_COLUMNS_BOTTOM, Math.min(totalColumns, MAX_COLUMNS_BOTTOM));
  document.documentElement.style.setProperty('--bottom-cols', columnsToSet);
}

function buildStackOfTiles(trips, isTopGrid = true) {
  const tilesWrap = document.createElement('div');
  tilesWrap.className = 'column-tiles';
  trips.forEach(trip => tilesWrap.appendChild(buildTripCard(trip, isTopGrid)));
  return tilesWrap;
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