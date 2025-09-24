##Definición de entidades y métodos

Entidades principales que se desprenden del problema:

#Usuario

-Atributos: id, nombre, email, password, rol (científico, ciudadano, admin).

--Métodos: registrar(), login(), editarPerfil().

#Evento (dato principal proveniente de la API de la NASA)

-Atributos: id, titulo, descripcion, link, estado (abierto/cerrado).

--Métodos: obtenerEventos(), filtrarPorCategoria(), filtrarPorFechas().

#Categoría

-Atributos: id, titulo.

--Relación: Un evento puede pertenecer a 1:N categorías.

#Fuente

-Atributos: id, url.

--Relación: Un evento puede tener 1:N fuentes.

#Geometría (ubicación y magnitudes del evento)

-Atributos: fecha, tipo, coordenadas, magnitudValor, magnitudUnidad.

--Relación: Un evento puede tener 1:N geometrías (ejemplo: trayectoria de un tifón).