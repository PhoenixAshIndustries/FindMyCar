let config = null;
let allSpots = [];
let selectedSpot = null;

const $ = (id) => document.getElementById(id);

function setStatus(msg) { $("status").textContent = msg; }
function normalize(s) { return (s || "").trim().toUpperCase(); }

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function openNativeNavigation(lat, lng) {
  const dlat = encodeURIComponent(lat);
  const dlng = encodeURIComponent(lng);

  if (isIOS()) {
    window.location.href = `https://maps.apple.com/?daddr=${dlat},${dlng}&dirflg=w`;
  } else {
    window.location.href =
      `https://www.google.com/maps/dir/?api=1&destination=${dlat},${dlng}&travelmode=walking`;
  }
}

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    company: (p.get("company") || "").toLowerCase(),
    spot: p.get("spot") || ""
  };
}

function populateCompanies() {
  const sel = $("companySelect");
  sel.innerHTML = "";

  const enabled = config.enabledCompanies || [];
  enabled.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = config.labels?.[id] || id;
    sel.appendChild(opt);
  });

  const saved = localStorage.getItem("company");
  const url = getUrlParams();

  const defaultCompany = config.defaultCompany || enabled[0];
  const initial =
    (enabled.includes(url.company) && url.company) ||
    (enabled.includes(saved) && saved) ||
    defaultCompany;

  sel.value = initial;

  sel.addEventListener("change", () => {
    localStorage.setItem("company", sel.value);
    clearSelection();
    setStatus(`Company set. Enter a Spot ID.`);
  });
}

function clearSelection() {
  selectedSpot = null;
  $("navBtn").disabled = true;
  $("selectedLabel").textContent = "—";
  $("selectedCoords").textContent = "—";
}

function findSpot(companyId, spotIdRaw) {
  const spotId = normalize(spotIdRaw);
  return allSpots.find(s =>
    normalize(s.company) === normalize(companyId) &&
    normalize(s.id) === spotId
  ) || null;
}

function showSelection(spot, companyId) {
  selectedSpot = spot;
  $("navBtn").disabled = false;
  $("selectedLabel").textContent = `${spot.id} (${companyId})`;
  $("selectedCoords").textContent = `${spot.lat}, ${spot.lng}`;
  setStatus(`Found ${spot.id}. Tap Navigate to open Maps.`);
}

function attachHandlers() {
  $("findBtn").addEventListener("click", () => {
    const companyId = $("companySelect").value;
    const spotId = $("spotInput").value;

    const spot = findSpot(companyId, spotId);
    if (!spot) {
      clearSelection();
      setStatus(`Not found: ${normalize(spotId)}. Check the ID.`);
      return;
    }
    showSelection(spot, companyId);
  });

  $("navBtn").addEventListener("click", () => {
    if (!selectedSpot) return;
    openNativeNavigation(selectedSpot.lat, selectedSpot.lng);
  });

  $("spotInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("findBtn").click();
  });
}

async function boot() {
  try {
    config = await loadJson("./config/site.json");
    allSpots = await loadJson("./data/spots.json");

    populateCompanies();
    attachHandlers();

    setStatus("Ready. Choose a company, then enter a Spot ID.");
    clearSelection();

    const url = getUrlParams();
    if (url.spot) {
      $("spotInput").value = url.spot;
      $("findBtn").click();
    }
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
  }
}

boot();
