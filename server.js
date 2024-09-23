const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 8000;

// Middleware para parsear el cuerpo de las solicitudes JSON
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'tu_usuario', // Reemplaza con tu usuario de MySQL
  password: 'tu_contraseña', // Reemplaza con tu contraseña de MySQL
  database: 'tu_base_de_datos' // Reemplaza con el nombre de tu base de datos
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Ruta para manejar la solicitud de guardar datos
app.post('/guardar', (req, res) => {
  const { calle, colonia, ciudad, numero_casa, estado, codigo_postal, coordenadas } = req.body;

  // Aquí puedes agregar la lógica para guardar los datos en la base de datos
  const query = 'INSERT INTO tu_tabla (calle, colonia, ciudad, numero_casa, estado, codigo_postal, coordenadas) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  db.query(query, [calle, colonia, ciudad, numero_casa, estado, codigo_postal, coordenadas], (error, results) => {
    if (error) {
      console.error('Error guardando datos:', error);
      return res.status(500).json({ message: 'Error al guardar los datos' });
    }

    res.json({ message: 'Datos guardados exitosamente.', id: results.insertId });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
