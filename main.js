let config = null;
let allSpots = [];
let currentNumber = ""; // digits as string

const $ = (id) => document.getElementById(id);
function setStatus(msg){ $("status").textContent = msg; }
function normalizeCompany(s){ return (s || "").trim().toLowerCase(); }

function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent); }
function openNativeNavigation(lat, lng){
  const dlat = encodeURIComponent(lat);
  const dlng = encodeURIComponent(lng);
  if (isIOS()){
    window.location.href = `https://maps.apple.com/?daddr=${dlat},${dlng}&dirflg=w`;
  } else {
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${dlat},${dlng}&travelmode=walking`;
  }
}

async function loadJson(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function populateCompanies(){
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
    clearSelection();
    setStatus("Enter your stall number, then tap Find My Car.");
  });
}

function updateDisplay(){
  const has = currentNumber.length > 0;
  const ghost = $("numDisplay");
  const val = $("numValue");

  if (!has){
    ghost.style.display = "inline";
    val.style.display = "none";
    $("goBtn").disabled = true;
  } else {
    ghost.style.display = "none";
    val.style.display = "inline";
    val.textContent = currentNumber;
    $("goBtn").disabled = false;
  }
}

function clearSelection(){
  $("selectedLabel").textContent = "—";
  $("selectedCoords").textContent = "—";
}

function appendDigit(d){
  if (currentNumber.length >= 4) return; // adjust if needed
  if (currentNumber === "0") currentNumber = "";
  currentNumber += String(d);
  currentNumber = currentNumber.replace(/^0+(?=\d)/, "");
  updateDisplay();
}

function backspace(){
  currentNumber = currentNumber.slice(0, -1);
  updateDisplay();
}

function clearAll(){
  currentNumber = "";
  updateDisplay();
}

function findSpot(companyId, numberStr){
  const n = parseInt(numberStr, 10);
  if (!Number.isFinite(n)) return null;
  return allSpots.find(s =>
    normalizeCompany(s.company) === normalizeCompany(companyId) &&
    Number(s.number) === n
  ) || null;
}

function handleFindMyCar(){
  const companyId = $("companySelect").value;
  if (!currentNumber){
    setStatus("Please enter your stall number.");
    return;
  }

  const spot = findSpot(companyId, currentNumber);
  if (!spot){
    clearSelection();
    setStatus(`We couldn't find stall ${currentNumber}. Double-check the number on your tag/sign.`);
    return;
  }

  $("selectedLabel").textContent = `${companyId.toUpperCase()} ${spot.number}`;
  $("selectedCoords").textContent = `${spot.lat}, ${spot.lng}`;
  setStatus("Opening directions in Maps…");
  openNativeNavigation(spot.lat, spot.lng);
}

function attachHandlers(){
  document.querySelectorAll("[data-digit]").forEach(btn => {
    btn.addEventListener("click", () => appendDigit(btn.getAttribute("data-digit")));
  });
  $("backBtn").addEventListener("click", backspace);
  $("clearBtn").addEventListener("click", clearAll);
  $("goBtn").addEventListener("click", handleFindMyCar);

  // allow physical keyboard too
  window.addEventListener("keydown", (e) => {
    if (/^[0-9]$/.test(e.key)) appendDigit(e.key);
    if (e.key === "Backspace") backspace();
    if (e.key === "Escape") clearAll();
    if (e.key === "Enter") handleFindMyCar();
  });
}

async function boot(){
  try{
    config = await loadJson("./config/site.json");
    allSpots = await loadJson("./data/spots.json");
    populateCompanies();
    attachHandlers();
    setStatus("Enter your stall number, then tap Find My Car.");
    updateDisplay();
    clearSelection();
  } catch(e){
    console.error(e);
    setStatus(`Error: ${e.message}`);
  }
}

boot();
