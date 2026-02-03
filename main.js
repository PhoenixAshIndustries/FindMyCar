let config = null;
let allSpots = [];
let selectedSpot = null;

// Optional map
let map = null;
let spotMarker = null;

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

/**
 * FREE routing: opens native Maps app with destination coordinate.
 */
function openNativeNavigation(lat, lng) {
  if (isIOS()) {
    // Apple Maps walking
    window.location.href = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
  } else {
    // Google Maps walking
    window.location.href =
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  }
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
  const defaultCompany = config.defaultCompany || enabled[0];
  sel.value = enabled.includes(saved) ? saved : defaultCompany;

  sel.addEventListener("change", () => {
    localStorage.setItem("company", sel.value);
    selectedSpot = null;
    $("navBtn").disabled = true;
    setStatus(`Company set to ${sel.options[sel.selectedIndex].text}. Enter a Spot ID.`);
  });
}

function findSpot(companyId, spotIdRaw) {
  const spotId = normalize(spotIdRaw);
  const spot = allSpots.find(s =>
    normalize(s.company) === normalize(companyId) &&
    normalize(s.id) === spotId
  );
  return spot || null;
}

// Optional: show a pin on your map if Maps JS is present
function ensureMap(lat, lng) {
  if (!window.google?.maps) return; // map is optional
  if (!map) {
    map = new google.maps.Map($("map"), { center: { lat, lng }, zoom: 20, mapTypeId: "satellite" });
  }
  map.setCenter({ lat, lng });
  map.setZoom(20);

  if (spotMarker) spotMarker.setMap(null);
  spotMarker = new google.maps.Marker({ map, position: { lat, lng } });
}

async function boot() {
  try {
    config = await loadJson("./config/site.json");
    allSpots = await loadJson("./data/spots.json");

    populateCompanies();

    setStatus("Ready. Choose a company, then enter a Spot ID.");
    $("navBtn").disabled = true;

    $("findBtn").addEventListener("click", () => {
      const companyId = $("companySelect").value;
      const spotId = $("spotInput").value;

      const spot = findSpot(companyId, spotId);
      if (!spot) {
        selectedSpot = null;
        $("navBtn").disabled = true;
        setStatus(`Not found: ${normalize(spotId)} for ${companyId}. Check the ID.`);
        return;
      }

      selectedSpot = spot;
      $("navBtn").disabled = false;

      setStatus(`Found ${spot.id} (${companyId}). Tap Navigate to open Maps.`);
      ensureMap(spot.lat, spot.lng);
    });

    $("navBtn").addEventListener("click", () => {
      if (!selectedSpot) return;
      openNativeNavigation(selectedSpot.lat, selectedSpot.lng);
    });

  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
  }
}

boot();
