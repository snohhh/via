/**
 * via — marathons near you
 */

const EARTH_KM = 6371;

const CAUSE_LABELS = {
  charity: "Charity",
  community: "Community",
  elite: "Major / elite",
  wellness: "Wellness",
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

const CITY_PRESETS = [
  { name: "New York, NY", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix, AZ", lat: 33.4484, lng: -112.074 },
  { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652 },
  { name: "San Antonio, TX", lat: 29.4241, lng: -98.4936 },
  { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  { name: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { name: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
  { name: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { name: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { name: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { name: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { name: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin, DE", lat: 52.52, lng: 13.405 },
  { name: "Paris, FR", lat: 48.8566, lng: 2.3522 },
  { name: "Tokyo, JP", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney, AU", lat: -33.8688, lng: 151.2093 },
  { name: "Toronto, CA", lat: 43.6532, lng: -79.3832 },
];

let marathons = [];
let userPoint = null;
let searchQuery = "";
let typeFilter = "all";
let causeFilter = "all";
let maxRadiusKm = 2000;

const elGrid = document.getElementById("race-grid");
const elStatus = document.getElementById("location-status");
const elAlert = document.getElementById("geo-alert");
const elSearch = document.getElementById("search-input");
const elRadius = document.getElementById("radius-select");

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findCityPreset(q) {
  const lower = q.trim().toLowerCase();
  if (!lower) return null;
  return CITY_PRESETS.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.split(/\s+/).every((w) => c.name.toLowerCase().includes(w))
  );
}

function setLocationLabel(text, isCoords = false) {
  if (!elStatus) return;
  elStatus.innerHTML = "";
  const span = document.createElement("span");
  span.className = "pill-location";
  span.innerHTML = isCoords
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10z"/><circle cx="12" cy="11" r="2.5"/></svg> Near <strong>${text}</strong>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10z"/><circle cx="12" cy="11" r="2.5"/></svg> ${text}`;
  elStatus.appendChild(span);
}

function showAlert(msg) {
  elAlert.textContent = msg;
}

function clearAlert() {
  elAlert.textContent = "";
}

function setChipState(group, value) {
  document.querySelectorAll(`.chip[data-group="${group}"]`).forEach((c) => {
    c.classList.toggle("is-on", c.getAttribute("data-value") === value);
  });
}

function matchesType(m) {
  if (typeFilter === "all") return true;
  if (typeFilter === "marathon") return m.distance === "Marathon";
  if (typeFilter === "half") return m.distance === "Half";
  return m.distance !== "Marathon" && m.distance !== "Half";
}

function matchesCause(m) {
  if (causeFilter === "all") return true;
  return m.cause === causeFilter;
}

function filteredRaces() {
  let list = marathons.map((m) => ({
    ...m,
    distanceKm: userPoint ? haversineKm(userPoint.lat, userPoint.lng, m.lat, m.lng) : null,
  }));

  if (userPoint) {
    list = list.filter((m) => m.distanceKm <= maxRadiusKm);
  }

  // Only keep races that have a cover image.
  list = list.filter((m) => Boolean(m.image));

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q)
    );
  }

  list = list.filter((m) => matchesType(m) && matchesCause(m));

  if (userPoint) {
    list.sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return list;
}

function statDistanceHtml(m) {
  if (m.distanceKm == null) {
    return `<div class="card-stat"><span class="num">—</span> km</div>`;
  }
  const km = m.distanceKm < 1 ? m.distanceKm.toFixed(1) : m.distanceKm.toFixed(0);
  return `<div class="card-stat"><span class="num">${km}</span> km away</div>`;
}

function render() {
  const list = filteredRaces();
  elGrid.innerHTML = "";

  if (!userPoint) {
    setLocationLabel("Pick a city or use your location to sort by distance.", false);
  }

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML =
      "<p>No races match your filters. Try widening distance or resetting type and cause.</p>";
    elGrid.appendChild(empty);
    return;
  }

  for (const m of list) {
    const card = document.createElement("article");
    card.className = "card";
    const imgSrc = m.image;
    const causeLabel = CAUSE_LABELS[m.cause] || m.cause;
    const routePath =
      '<path d="M24,340 C70,200 140,260 220,140 S260,100 276,48" vector-effect="non-scaling-stroke" />';

    card.innerHTML = `
      <div class="card-media">
        <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(m.name)}" loading="lazy" width="400" height="533" />
        <div class="card-media__shade" aria-hidden="true"></div>
        <div class="card-media__grain" aria-hidden="true"></div>
        <svg class="card-route" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${routePath}</svg>
        <div class="card-media__top">
          ${statDistanceHtml(m)}
          <div class="card-top-right">
            <div class="card-stat">${escapeHtml(m.distance)}</div>
            <div class="cause-pill">${escapeHtml(causeLabel)}</div>
          </div>
        </div>
        <div class="card-media__bottom">
          <h3 class="card-title">${escapeHtml(m.name)}</h3>
          <p class="card-caption">${escapeHtml(formatDate(m.date))} · ${escapeHtml(m.city)}</p>
        </div>
      </div>
      <div class="card-footer">
        <a class="btn btn-primary btn-sm" href="${escapeAttr(m.url)}" target="_blank" rel="noopener noreferrer">View event</a>
      </div>
    `;
    elGrid.appendChild(card);
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

async function loadData() {
  const res = await fetch("data/marathons.json");
  marathons = await res.json();
  render();
}

function useMyLocation() {
  clearAlert();
  if (!navigator.geolocation) {
    showAlert("Geolocation is not supported in this browser.");
    return;
  }
  setLocationLabel("Getting your location…", false);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const label = `${userPoint.lat.toFixed(2)}°, ${userPoint.lng.toFixed(2)}°`;
      setLocationLabel(label, true);
      render();
    },
    () => {
      userPoint = null;
      showAlert("Could not access location. Try searching for a city instead.");
      setLocationLabel("Pick a city or use your location to sort by distance.", false);
      render();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function applySearch() {
  const q = elSearch.value;
  searchQuery = q;
  const preset = findCityPreset(q);
  if (preset && q.length > 2) {
    userPoint = { lat: preset.lat, lng: preset.lng };
    setLocationLabel(preset.name, true);
    clearAlert();
  }
  render();
}

document.getElementById("btn-locate").addEventListener("click", useMyLocation);

elSearch.addEventListener("input", () => {
  searchQuery = elSearch.value;
  render();
});

elSearch.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    applySearch();
  }
});

document.getElementById("btn-search-apply").addEventListener("click", applySearch);

elRadius.addEventListener("change", () => {
  maxRadiusKm = parseInt(elRadius.value, 10);
  render();
});

document.querySelector(".panel").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip[data-group]");
  if (!chip) return;
  const group = chip.getAttribute("data-group");
  const value = chip.getAttribute("data-value");
  if (group === "type") typeFilter = value;
  if (group === "cause") causeFilter = value;
  setChipState(group, value);
  render();
});

loadData().catch(() => {
  showAlert("Could not load race data. Serve this folder over HTTP (e.g. python3 -m http.server).");
});
