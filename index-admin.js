let map;
let editableLayer;
let currentMarker = null;
let idCounter = 0; // Contador para los identificadores únicos

const zonas = {
  playa: [20.6296, -87.0739],
  puerto: [20.8446, -87.1486],
  tulum: [20.2115, -87.4658]
};

function initMap() {
  const initialCoords = zonas.playa;
  map = L.map('map').setView(initialCoords, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  editableLayer = L.featureGroup().addTo(map);

  const drawControl = new L.Control.Draw({
    draw: {
      polyline: false,
      polygon: true,
      rectangle: false,
      circle: false,
      marker: true,
      circlemarker: false
    },
    edit: {
      featureGroup: editableLayer
    }
  });
  map.addControl(drawControl);

  // Evento al crear una nueva capa (marker o polígono)
  map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    const layerType = event.layerType;

    // Si es un polígono, aplicar el color seleccionado
    if (layerType === 'polygon') {
      const polygonColor = document.getElementById('polygon-color').value;
      layer.setStyle({ color: polygonColor });
      editableLayer.addLayer(layer);
    }

    // Si es un marcador
    if (layerType === 'marker') {
      if (currentMarker) {
        editableLayer.removeLayer(currentMarker);
      }

      const popupContent = document.createElement('textarea');
      popupContent.placeholder = "Escribe información aquí...";
      popupContent.style.width = '200px';
      popupContent.style.height = '100px';

      layer.bindPopup(popupContent).openPopup();
      editableLayer.addLayer(layer);
      currentMarker = layer; 

      const latLng = layer.getLatLng();
      document.getElementById('coordinates').value = `${latLng.lat}, ${latLng.lng}`;
    }

    // Guardar la capa en localStorage
    saveToLocalStorage();
  });

  // Evento al eliminar una capa (marker o polígono)
  map.on(L.Draw.Event.DELETED, function(event) {
    const layers = event.layers;
    layers.eachLayer(layer => {
      // Eliminar la capa del editableLayer y del localStorage
      removeFromLocalStorage(layer);
    });

    // Guardar el estado actualizado
    saveToLocalStorage();
  });

  loadFromLocalStorage();

  document.getElementById('use-location').addEventListener('click', useMyLocation);
  
  document.getElementById('add-point').addEventListener('click', () => {
    const coordinates = document.getElementById('add-coordinates').value.split(',');
    const color = document.getElementById('color').value;

    if (coordinates.length === 2) {
      const lat = parseFloat(coordinates[0].trim());
      const lng = parseFloat(coordinates[1].trim());

      const squareIcon = L.divIcon({
        className: 'custom-square-icon',
        html: `<div style="width:20px;height:20px;background:${color};"></div>`,
        iconSize: [20, 20]
      });

      const marker = L.marker([lat, lng], { icon: squareIcon });
      
      const popupContent = document.createElement('textarea');
      popupContent.placeholder = "Escribe información aquí...";
      popupContent.style.width = '200px';
      popupContent.style.height = '100px';

      marker.bindPopup(popupContent).openPopup();
      editableLayer.addLayer(marker);

      document.getElementById('coordinates').value = `${lat}, ${lng}`;

      // Guardar la capa en localStorage
      saveToLocalStorage();
    }
  });

  document.getElementById('save').addEventListener('click', () => {
    const coordinates = document.getElementById('coordinates').value;
    if (coordinates) {
      const tableBody = document.querySelector('#zone-table tbody');
      const row = tableBody.insertRow();
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      cell1.textContent = coordinates;
      cell2.innerHTML = '<button onclick="deleteRow(this)">Eliminar</button>';
      
      saveTableToLocalStorage();
    } else {
      alert('No hay coordenadas para guardar.');
    }
  });
}

// Función para guardar los datos del mapa en localStorage
function saveToLocalStorage() {
  const layers = [];
  editableLayer.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const latLng = layer.getLatLng();
      const popupContent = layer.getPopup().getContent();
      layers.push({
        id: idCounter++, // Incrementar el contador para cada marcador
        type: 'marker',
        lat: latLng.lat,
        lng: latLng.lng,
        popup: popupContent
      });
    } else if (layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs()[0].map(latlng => ({ lat: latlng.lat, lng: latlng.lng }));
      const polygonColor = layer.options.color;
      layers.push({
        id: idCounter++, // Incrementar el contador para cada polígono
        type: 'polygon',
        latLngs: latLngs,
        color: polygonColor
      });
    }
  });
  localStorage.setItem('mapLayers', JSON.stringify(layers));
}

// Función para cargar los datos desde localStorage
function loadFromLocalStorage() {
  const layers = JSON.parse(localStorage.getItem('mapLayers')) || [];
  layers.forEach(layerData => {
    if (layerData.type === 'marker') {
      const marker = L.marker([layerData.lat, layerData.lng]);
      const popupContent = document.createElement('textarea');
      popupContent.value = layerData.popup;
      popupContent.style.width = '200px';
      popupContent.style.height = '100px';
      
      marker.bindPopup(popupContent).openPopup();
      editableLayer.addLayer(marker);
    } else if (layerData.type === 'polygon') {
      const polygon = L.polygon(layerData.latLngs, { color: layerData.color });
      editableLayer.addLayer(polygon);
    }
  });
}

// Función para eliminar el marcador/polígono del almacenamiento local
function removeFromLocalStorage(layerToRemove) {
  let layers = JSON.parse(localStorage.getItem('mapLayers')) || [];
  layers = layers.filter(layer => {
    if (layer.type === 'marker') {
      return !(layer.lat === layerToRemove.getLatLng().lat && layer.lng === layerToRemove.getLatLng().lng);
    } else if (layer.type === 'polygon') {
      const latLngs = layerToRemove.getLatLngs()[0].map(latlng => ({ lat: latlng.lat, lng: latlng.lng }));
      return JSON.stringify(layer.latLngs) !== JSON.stringify(latLngs);
    }
    return true; // Mantener el resto de los objetos
  });
  localStorage.setItem('mapLayers', JSON.stringify(layers));
}

// Función para usar la ubicación del usuario
function useMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      map.setView([lat, lng], 12);
      L.marker([lat, lng]).addTo(map).bindPopup("Estás aquí").openPopup();
      document.getElementById('coordinates').value = `${lat}, ${lng}`;
    }, function(error) {
      alert("Error al obtener la ubicación: " + error.message);
    });
  } else {
    alert("La geolocalización no es compatible con este navegador.");
  }
}

// Inicializar el mapa al cargar la página
window.onload = initMap;