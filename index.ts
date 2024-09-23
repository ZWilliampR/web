import * as L from 'leaflet';

const zonas = {
  playa: [20.6296, -87.0739] as [number, number],
  puerto: [20.8494, -86.8759] as [number, number],
  tulum: [20.211, -87.4653] as [number, number],
};

let map: L.Map;

function initMap(): void {
  // Inicializar el mapa
  const initialCoords = zonas.playa;
  map = L.map('map').setView(initialCoords, 12);

  // Añadir capa de OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Selección de zonas
  const selector = document.getElementById('zonas') as HTMLSelectElement;
  if (selector) {
    selector.addEventListener('change', () => {
      const zonaSeleccionada = selector.value as keyof typeof zonas;
      const coords = zonas[zonaSeleccionada];
      if (coords) {
        map.setView(coords, 12);
      } else {
        console.error('Coordenadas no encontradas para la zona seleccionada.');
      }
    });
  } else {
    console.error('Selector de zonas no encontrado.');
  }

  // Manejar clics en el mapa
  map.on('click', (event: L.LeafletMouseEvent) => {
    const { lat, lng } = event.latlng;
    obtenerInformacion(lat, lng);
  });
}

function obtenerInformacion(lat: number, lng: number): void {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
    .then(response => response.json())
    .then(data => {
      const address = data.address;
      const direccion = `
        Coordenadas: (${lat}, ${lng})
        Dirección: ${address.road || 'Desconocida'}, ${address.suburb || address.city || 'Desconocida'}
        Colonia: ${address.neighborhood || 'Desconocida'}
      `;
      alert(direccion);
    })
    .catch(error => {
      alert('No se encontró información para este punto.');
      console.error('Error al obtener la información:', error);
    });
}

// Inicializar el mapa cuando la ventana se carga
window.onload = initMap;