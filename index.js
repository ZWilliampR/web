"use strict";

const L = window.L; // Asegúrate de que Leaflet esté disponible globalmente
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
  mostrarIndicadorCarga(); // Mostrar el indicador de carga

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
      });
    })
    .catch(error => {
      console.error('Error obteniendo información de la ubicación:', error);
      alert('No se encontró información para este punto.');
    })
    .finally(() => {
      ocultarIndicadorCarga(); // Ocultar el indicador de carga
    });
}

// Llena los campos del formulario con la información obtenida
function fillAddressForm({ road, neighborhood, city, state, postalCode }) {
  document.getElementById('road').value = road;
  document.getElementById('neighborhood').value = neighborhood;
  document.getElementById('city').value = city;
  document.getElementById('state').value = state;
  document.getElementById('postal-code').value = postalCode;
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
  mostrarIndicadorCarga(); // Mostrar el indicador de carga

  if (!navigator.geolocation) {
    alert('La geolocalización no es soportada por este navegador.');
    ocultarIndicadorCarga(); // Ocultar el indicador si falla
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000, // Tiempo máximo de espera en milisegundos (10 segundos)
    maximumAge: 0, // No usar ubicaciones en caché
  };

  navigator.geolocation.getCurrentPosition(({ coords: { latitude, longitude } }) => {
    ocultarIndicadorCarga(); // Ocultar el indicador cuando se obtenga la ubicación
    if (userLocationMarker) {
      userLocationMarker.setLatLng([latitude, longitude]);
    } else {
      userLocationMarker = L.marker([latitude, longitude], { icon: L.icon({ iconUrl: redIconUrl, iconSize: [32, 32] }) });
      userLocationMarker.addTo(map);
    }

    map.setView([latitude, longitude], 12);
    obtenerInformacion(latitude, longitude);
  }, (error) => {
    ocultarIndicadorCarga(); // Ocultar el indicador si hay un error
    console.error('Error obteniendo la ubicación:', error);
    alert('No se pudo obtener la ubicación. Por favor, inténtalo de nuevo.');
  }, options);
}

// Guarda los datos del formulario en una tabla
function guardarDatos() {
  const road = document.getElementById('road').value;
  const neighborhood = document.getElementById('neighborhood').value;
  const city = document.getElementById('city').value;
  const houseNumber = document.getElementById('house-number').value;
  const state = document.getElementById('state').value;
  const postalCode = document.getElementById('postal-code').value;

  const tableContainer = document.getElementById('table-container');
  if (!tableContainer) return;

  let table = tableContainer.querySelector('table');
  if (!table) {
    table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Calle</th>
          <th>Colonia</th>
          <th>Ciudad</th>
          <th>Número de casa</th>
          <th>Estado</th>
          <th>Código Postal</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    tableContainer.appendChild(table);
  }

  const tbody = table.querySelector('tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${road}</td>
    <td>${neighborhood}</td>
    <td>${city}</td>
    <td>${houseNumber}</td>
    <td>${state}</td>
    <td>${postalCode}</td>
    <td>
      <button onclick="editarFila(this)">Editar</button>
      <button onclick="eliminarFila(this)">Eliminar</button>
    </td>
  `;
  tbody.appendChild(tr);

  // Limpiar el formulario
  document.getElementById('location-info').reset();
}

// Edita una fila en la tabla
function editarFila(button) {
  const tr = button.closest('tr');
  const tds = tr.querySelectorAll('td');

  document.getElementById('road').value = tds[0].textContent;
  document.getElementById('neighborhood').value = tds[1].textContent;
  document.getElementById('city').value = tds[2].textContent;
  document.getElementById('house-number').value = tds[3].textContent;
  document.getElementById('state').value = tds[4].textContent;
  document.getElementById('postal-code').value = tds[5].textContent;

  tr.remove();
}

// Elimina una fila de la tabla
function eliminarFila(button) {
  if (confirm('¿Estás seguro de que deseas eliminar esta fila?')) {
    button.closest('tr').remove();
  }
}

// Asignar eventos a los botones
document.getElementById('use-location').addEventListener('click', usarUbicacion);
document.getElementById('save').addEventListener('click', guardarDatos);

// Inicializar el mapa cuando la ventana se carga
window.onload = initMap;
