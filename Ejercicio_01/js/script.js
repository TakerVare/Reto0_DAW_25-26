//Mostrar eventos en mapa

// Inicializar mapa
var map = L.map('map').setView([20, 0], 2);

// Cargar tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Ejemplo: cargar un evento de tipo incendio
var incendioIcon = L.icon({
  iconUrl: 'icons/fire.png',
  iconSize: [32, 32]
});

// Simulación: añadir un evento
L.marker([26.51, -80.43], {icon: incendioIcon})
  .addTo(map)
  .bindPopup("<b>Incendio en Florida</b><br>Fuente: NASA EONET");



  
//Filtro por rangos de fechas
async function cargarEventos() {
  let res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events");
  let data = await res.json();

  let fechaInicio = new Date(document.getElementById("fechaInicio").value);
  let fechaFin = new Date(document.getElementById("fechaFin").value);

  let eventosFiltrados = data.events.filter(evento => {
    return evento.geometry.some(geo => {
      let fecha = new Date(geo.date);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });
  });

  mostrarEventos(eventosFiltrados);
}

function mostrarEventos(eventos) {
  let lista = document.getElementById("listaEventos");
  lista.innerHTML = "";
  eventos.forEach(e => {
    let li = document.createElement("li");
    li.textContent = e.title;
    lista.appendChild(li);
  });
}
