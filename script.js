
let map = L.map('map', { minZoom: 3, maxZoom: 22 }).setView([20.5937,78.9629],5);
let drawnItems = new L.FeatureGroup().addTo(map);
let currentLayer = null;
let currentArea = 0;
let sideMarkers = [];

let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 22
});

let satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri, Earthstar Geographics',
  maxZoom: 22
});

let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap contributors',
  maxZoom: 22
});

street.addTo(map);
L.control.layers({"Street":street,"Satellite":satellite,"Terrain":topo}).addTo(map);

// ===== Draw Controls =====
map.addControl(new L.Control.Draw({
  draw: { polygon: { shapeOptions: { color: '#00c853', fillOpacity: 0.3 } }, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
  edit: { featureGroup: drawnItems }
}));

map.on(L.Draw.Event.CREATED, function(e){
  drawnItems.clearLayers();
  clearSideMarkers();
  currentLayer = e.layer;
  drawnItems.addLayer(currentLayer);
  updateArea();
});

map.on(L.Draw.Event.EDITED, function(e){
  clearSideMarkers();
  updateArea();
});

function updateArea(){
  if(!currentLayer) return;
  let latlngs = currentLayer.getLatLngs()[0];
  currentArea = L.GeometryUtil.geodesicArea(latlngs);
  let sqm = currentArea;
  let sqft = sqm * 10.7639;
  let acres = sqft / 43560;
  let hectares = sqm / 10000;
  let guntha = sqm / 101.17;
  document.getElementById("result").innerHTML = `<b>Sq Meters:</b> ${sqm.toFixed(2)}<br><b>Sq Feet:</b> ${sqft.toFixed(2)}<br><b>Acres:</b> ${acres.toFixed(4)}<br><b>Hectares:</b> ${hectares.toFixed(4)}<br><b>Guntha:</b> ${guntha.toFixed(2)}`;
  showSideLengths(latlngs);
}

function showSideLengths(latlngs){
  clearSideMarkers();
  for(let i=0;i<latlngs.length;i++){
    let next=(i+1)%latlngs.length;
    let dist=latlngs[i].distanceTo(latlngs[next]);
    let midLat=(latlngs[i].lat+latlngs[next].lat)/2;
    let midLng=(latlngs[i].lng+latlngs[next].lng)/2;
    let marker=L.marker([midLat,midLng],{icon:L.divIcon({className:'side-label',html:`<div style="background:white;padding:2px 5px;border-radius:3px;font-size:12px;color:black;">${dist.toFixed(2)} m</div>`})}).addTo(map);
    sideMarkers.push(marker);
  }
}
function clearSideMarkers(){sideMarkers.forEach(m=>map.removeLayer(m)); sideMarkers=[];}

function calculatePrice(){
  if(!currentArea) return alert("Draw a plot first");
  let price=parseFloat(document.getElementById("price").value);
  let unit=document.getElementById("unitSelect").value;
  if(!price) return;
  let total=0;
  switch(unit){
    case 'sqm': total=price*currentArea; break;
    case 'sqft': total=price*(currentArea*10.7639); break;
    case 'acre': total=price*((currentArea*10.7639)/43560); break;
    case 'hectare': total=price*(currentArea/10000); break;
    case 'guntha': total=price*(currentArea/101.17); break;
  }
  document.getElementById("priceResult").innerHTML="<b>Total Price:</b> "+total.toFixed(2);
}

let watchId = null;
let userMarker = null;
function getLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    alert("Stopped live location tracking.");
    return;
  }

  alert("Starting live location tracking...");

  watchId = navigator.geolocation.watchPosition(async function(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    if (!userMarker) {
      userMarker = L.marker([lat, lng]).addTo(map).bindPopup("📍 You are here").openPopup();
      map.setView([lat, lng], 18);
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    try {
      let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      let data = await response.json();
      if (data && data.address) {
        let city = data.address.city || data.address.town || data.address.village || data.address.county || "Unknown Location";
        userMarker.bindPopup(`📍 Live: <b>${city}</b>`).openPopup();
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }

  }, function (err) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        alert("Please allow location access in your browser settings.");
        break;
      case err.POSITION_UNAVAILABLE:
        alert("Location information is unavailable.");
        break;
      case err.TIMEOUT:
        alert("Location request timed out.");
        break;
      default:
        alert("Unable to retrieve your location.");
    }
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function toggleDark(){document.body.classList.toggle("dark");}
