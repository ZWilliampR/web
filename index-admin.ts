import L from 'leaflet';
import 'leaflet-draw'; // Importación de leaflet-draw

// Declaración para extender el namespace de Leaflet
declare module 'leaflet' {
  namespace Draw {
    interface Events {
      CREATED: 'draw:created';
    }
  }
}

let map: L.Map;
let editableLayer: L.FeatureGroup;
let currentPolygon: L.Layer | null = null;

const zonas: { [key: string]: [number, number] } = {
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
      polygon: {
        allowIntersection: false, // Si deseas que no se permita la intersección de polígonos
        shapeOptions: {
          color: '#ff0000', // Ejemplo de color
          weight: 4,
        },
      },
      rectangle: false,
      circle: false,
      circlemarker: false
    },
    edit: {
      featureGroup: editableLayer
    }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    editableLayer.clearLayers();
    editableLayer.addLayer(layer);
    currentPolygon = layer;
  });

  document.getElementById('add-point')!.addEventListener('click', () => {
    const coordinates = (document.getElementById('add-coordinates') as HTMLInputElement).value.split(',');
    const color = (document.getElementById('color') as HTMLInputElement).value;

    if (coordinates.length === 2) {
      const lat = parseFloat(coordinates[0].trim());
      const lng = parseFloat(coordinates[1].trim());

      const squareIcon = L.divIcon({
        className: 'custom-square-icon',
        html: `<div style="width:20px;height:20px;background:${color};"></div>`,
        iconSize: [20, 20]
      });

      const marker = L.marker([lat, lng], { icon: squareIcon }).addTo(map);

      let popupInfo = `
        <div contenteditable="false" id="popup-text">
          Ingrese información aquí<br>
          Ingrese información aquí<br>
          Ingrese información aquí<br>
          Ingrese información aquí<br>
          Ingrese información aquí
        </div>
      `;

      marker.on('mouseover', function() {
        const popupContent = `
          <div class="popup-content">
            ${popupInfo}
            <button id="edit-popup" style="margin-top: 10px;">Editar</button>
          </div>
        `;

        marker.bindPopup(popupContent).openPopup();
      });

      marker.on('popupopen', function() {
        const editButton = document.getElementById('edit-popup')!;
        const popupText = document.getElementById('popup-text')!;

        editButton.addEventListener('click', () => {
          if (editButton.textContent === 'Editar') {
            popupText.contentEditable = 'true';
            popupText.style.border = '1px solid black';
            editButton.textContent = 'Guardar';
          } else {
            popupText.contentEditable = 'false';
            popupText.style.border = 'none';
            popupInfo = popupText.innerHTML; // Cambiado a innerHTML
            editButton.textContent = 'Editar';
          }
        });
      });
    }
  });
}

// Función para usar la ubicación del usuario y rellenar los campos
function useMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        map.setView([lat, lng], 12);

        const userMarker = L.marker([lat, lng]).addTo(map)
          .bindPopup("Estás aquí")
          .openPopup();

        (document.getElementById('coordinates') as HTMLInputElement).value = `${lat}, ${lng}`;

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();

        if (data && data.address) {
          (document.getElementById('road') as HTMLInputElement).value = data.address.road || '';
          (document.getElementById('neighborhood') as HTMLInputElement).value = data.address.neighbourhood || data.address.suburb || '';
          (document.getElementById('house-number') as HTMLInputElement).value = data.address.house_number || '';
          (document.getElementById('state') as HTMLInputElement).value = data.address.state || '';
          (document.getElementById('postal-code') as HTMLInputElement).value = data.address.postcode || '';
        }
      },
      function (error) {
        alert('No se pudo obtener la ubicación: ' + error.message);
      }
    );
  } else {
    alert('La geolocalización no es soportada por este navegador.');
  }
}

// Función para guardar los datos en la tabla
function saveDataToTable() {
  const coordinates = (document.getElementById('coordinates') as HTMLInputElement).value;
  const road = (document.getElementById('road') as HTMLInputElement).value;
  const neighborhood = (document.getElementById('neighborhood') as HTMLInputElement).value;
  const houseNumber = (document.getElementById('house-number') as HTMLInputElement).value;
  const state = (document.getElementById('state') as HTMLInputElement).value;
  const postalCode = (document.getElementById('postal-code') as HTMLInputElement).value;

  const table = document.getElementById('zone-table')!.getElementsByTagName('tbody')[0];
  const newRow = table.insertRow();

  newRow.insertCell(0).innerText = coordinates || '';
  newRow.insertCell(1).innerText = road || '';
  newRow.insertCell(2).innerText = neighborhood || '';
  newRow.insertCell(3).innerText = houseNumber || '';
  newRow.insertCell(4).innerText = state || '';
  newRow.insertCell(5).innerText = postalCode || '';

  const actionCell = newRow.insertCell(6);

  const editButton = document.createElement('button');
  editButton.innerText = 'Editar';
  actionCell.appendChild(editButton);

  const deleteButton = document.createElement('button');
  deleteButton.innerText = 'Eliminar';
  actionCell.appendChild(deleteButton);

  deleteButton.addEventListener('click', function () {
    table.deleteRow(newRow.rowIndex - 1);
  });

  editButton.addEventListener('click', function () {
    if (editButton.textContent === 'Editar') {
      makeRowEditable(newRow);
      editButton.textContent = 'Guardar';
    } else {
      makeRowReadOnly(newRow);
      editButton.textContent = 'Editar';
    }
  });
}

// Función para hacer una fila editable
function makeRowEditable(row: HTMLTableRowElement) {
  for (let i = 0; i < 6; i++) {
    const cell = row.cells[i];
    const input = document.createElement('input');
    input.type = 'text';
    input.value = cell.innerText;
    cell.innerText = '';
    cell.appendChild(input);
  }
}

// Función para hacer una fila de solo lectura
function makeRowReadOnly(row: HTMLTableRowElement) {
  for (let i = 0; i < 6; i++) {
    const cell = row.cells[i];
    const input = cell.firstChild as HTMLInputElement;
    cell.innerText = input.value;
  }
}

// Agregar el evento al botón de "Usar mi ubicación"
document.getElementById('use-location')!.addEventListener('click', useMyLocation);

// Agregar el evento al botón de "Guardar"
document.getElementById('save')!.addEventListener('click', saveDataToTable);

// Inicializar el mapa cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initMap);