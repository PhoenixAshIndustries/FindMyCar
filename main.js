let config = null;
let allSpots = [];
let selectedSpot = null;

const $ = (id) => document.getElementById(id);

function setStatus(msg) { $("status").textContent = msg; }

// Accepts inputs like:
// - "48" -> "SPOT-048"
// - "048" -> "SPOT-048"
// - "SPOT-48" -> "SPOT-048"
// - "SPOT-048" -> "SPOT-048"
function normalizeSpotInput(raw) {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return "";

  // If user typed just digits
  if (/^\d+$/.test(s)) {
    return `SPOT-${s.padStart(3, "0")}`;
  }

  // If they typed SPOT-<digits>
  const m = s.match(/^SPOT[-\s_]*(\d+)$/);
  if (m) {
    return `SPOT-${m[1].padStart(3, "0")}`;
  }

  // Otherwise, return as-is (for future real IDs like E-241)
  return s;
}

function normalizeCompany(s) { return (s || "").trim().toLowerCase(); }

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// FREE routing via deep link to native Maps
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
    company: normalizeCompany(p.get("company") || ""),
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
    setStatus("Enter your stall/spot number, then tap Find.");
  });
}

function clearSelection() {
  selectedSpot = null;
  $("navBtn").disabled = true;
  $("selectedLabel").textContent = "—";
  $("selectedCoords").textContent = "—";
}

function findSpot(companyId, spotInputRaw) {
  const spotId = normalizeSpotInput(spotInputRaw);

  // Note: current dataset uses company="enterprise" for all rows.
  // You can later split it across companies.
  return allSpots.find(s =>
    normalizeCompany(s.company) === normalizeCompany(companyId) &&
    (String(s.id || "").toUpperCase() === spotId)
  ) || null;
}

function showSelection(spot, companyId) {
  selectedSpot = spot;
  $("navBtn").disabled = false;
  $("selectedLabel").textContent = `${spot.id} (${companyId})`;
  $("selectedCoords").textContent = `${spot.lat}, ${spot.lng}`;
  setStatus(`Found it. Tap Navigate to open directions in Maps.`);
}

function attachHandlers() {
  $("findBtn").addEventListener("click", () => {
    const companyId = $("companySelect").value;
    const spotRaw = $("spotInput").value;

    const normalized = normalizeSpotInput(spotRaw);
    if (!normalized) {
      clearSelection();
      setStatus("Please enter a stall/spot number (example: 48).");
      return;
    }

    const spot = findSpot(companyId, spotRaw);
    if (!spot) {
      clearSelection();
      setStatus(`We couldn't find spot ${normalized}. Double-check the number on your tag/sign.`);
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

    setStatus("Enter your stall/spot number, then tap Find.");
    clearSelection();

    // Auto-fill from QR/link params (accept both 48 and SPOT-048)
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
