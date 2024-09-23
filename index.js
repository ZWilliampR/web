"use strict";

const L = window.L;
const zonas = {
  playa: [20.6296, -87.0739],
  puerto: [20.8494, -86.8759],
  tulum: [20.211, -87.4653],
};

let map;
let redMarkerLayer = L.layerGroup();
let userLocationMarker = null;
const redIconUrl = 'https://img.icons8.com/ios-filled/50/ff0000/marker.png';

// Inicializa el mapa y las funcionalidades principales
function initMap() {
  initBaseMap();
  addGeocoder();
  setupZoneSelector();
  setupMapEvents();
}

// Configura el mapa base con OpenStreetMap
function initBaseMap() {
  map = L.map('map').setView(zonas.playa, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
}

// Añade un control de geocodificación para búsquedas
function addGeocoder() {
  const geocoder = L.Control.Geocoder.nominatim();
  L.Control.geocoder({
    geocoder: geocoder,
    defaultMarkGeocode: false,
  })
  .on('markgeocode', (event) => {
    const result = event.geocode;
    map.setView(result.center, 12);
    L.marker(result.center).addTo(map)
      .bindPopup(result.name)
      .openPopup();
  }).addTo(map);
}

// Configura el selector de zonas y la funcionalidad de cambio de vista
function setupZoneSelector() {
  const selector = document.getElementById('zonas');
  if (!selector) {
    console.error('Selector de zonas no encontrado.');
    return;
  }

  selector.addEventListener('change', () => {
    const coords = zonas[selector.value];
    if (coords) {
      map.setView(coords, 12);
    } else {
      console.error('Coordenadas no encontradas para la zona seleccionada.');
    }
  });
}

// Maneja los eventos de clic y doble clic en el mapa
function setupMapEvents() {
  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    obtenerInformacion(lat, lng);
  });

  map.on('dblclick', (event) => {
    const { lat, lng } = event.latlng;
    agregarMarcadorRojo(lat, lng);
  });
}

// Muestra el indicador de carga
function mostrarIndicadorCarga() {
  document.getElementById('loader').style.display = 'block';
}

// Oculta el indicador de carga
function ocultarIndicadorCarga() {
  document.getElementById('loader').style.display = 'none';
}

// Obtiene la información de la ubicación y llena el formulario
function obtenerInformacion(lat, lng) {
  mostrarIndicadorCarga();

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
    .then(response => response.json())
    .then(data => {
      const address = data.address;
      fillAddressForm({
        road: address.road || 'Desconocida',
        neighborhood: address.neighborhood || address.suburb || address.village || 'Desconocida',
        city: address.city || 'Desconocida',
        state: address.state || 'Desconocido',
        postalCode: address.postcode || 'Desconocido',
        coordinates: `${lat}, ${lng}`, // Añade las coordenadas
      });
    })
    .catch(error => {
      console.error('Error obteniendo información de la ubicación:', error);
      alert('No se encontró información para este punto.');
    })
    .finally(() => {
      ocultarIndicadorCarga();
    });
}

// Llena los campos del formulario con la información obtenida
function fillAddressForm({ road, neighborhood, city, state, postalCode, coordinates }) {
  document.getElementById('road').value = road;
  document.getElementById('neighborhood').value = neighborhood;
  document.getElementById('city').value = city;
  document.getElementById('state').value = state;
  document.getElementById('postal-code').value = postalCode;
  document.getElementById('house-number').value = coordinates; // Actualizado para guardar coordenadas
}

// Añade un marcador rojo en las coordenadas especificadas
function agregarMarcadorRojo(lat, lng) {
  redMarkerLayer.clearLayers();
  const redIcon = L.icon({
    iconUrl: redIconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  L.marker([lat, lng], { icon: redIcon }).addTo(redMarkerLayer);
  redMarkerLayer.addTo(map);
}

// Maneja el uso de la geolocalización del usuario
function usarUbicacion() {
  mostrarIndicadorCarga();

  if (!navigator.geolocation) {
    alert('La geolocalización no es soportada por este navegador.');
    ocultarIndicadorCarga();
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(({ coords: { latitude, longitude } }) => {
    ocultarIndicadorCarga();
    if (userLocationMarker) {
      userLocationMarker.setLatLng([latitude, longitude]);
    } else {
      userLocationMarker = L.marker([latitude, longitude], { icon: L.icon({ iconUrl: redIconUrl, iconSize: [32, 32] }) });
      userLocationMarker.addTo(map);
    }

    map.setView([latitude, longitude], 12);
    obtenerInformacion(latitude, longitude);
  }, (error) => {
    ocultarIndicadorCarga();
    console.error('Error obteniendo la ubicación:', error);
    alert('No se pudo obtener la ubicación. Por favor, inténtalo de nuevo.');
  }, options);
}

// Guarda los datos del formulario en la base de datos
function guardarDatos() {
  const road = document.getElementById('road').value;
  const neighborhood = document.getElementById('neighborhood').value;
  const city = document.getElementById('city').value;
  const houseNumber = document.getElementById('house-number').value;
  const state = document.getElementById('state').value;
  const postalCode = document.getElementById('postal-code').value;

  const data = {
    calle: road,
    colonia: neighborhood,
    ciudad: city,
    numero_casa: houseNumber,
    estado: state,
    codigo_postal: postalCode,
    coordenadas: houseNumber // Utiliza las coordenadas
  };

  console.log('Datos a enviar:', data); // Para depuración

  fetch('http://localhost:8000/guardar', { // Asegúrate de usar el puerto correcto
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    console.log('Respuesta del servidor:', response); // Para depuración
    if (!response.ok) {
      throw new Error('Error en la respuesta de la red');
    }
    return response.json();
  })
  .then(data => {
    console.log('Datos guardados:', data);
    alert('Datos guardados exitosamente.');
    document.getElementById('location-info').reset(); // Limpiar el formulario
  })
  .catch(error => {
    console.error('Error al guardar datos:', error);
    alert('Error al guardar los datos. Intenta nuevamente.');
  });
}

// Asignar eventos a los botones
document.getElementById('use-location').addEventListener('click', usarUbicacion);
document.getElementById('save').addEventListener('click', guardarDatos);

// Inicializar el mapa cuando la ventana se carga
window.onload = initMap;