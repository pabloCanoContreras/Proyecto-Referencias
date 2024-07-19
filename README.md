Aplicación de Investigación Bibliográfica

Esta aplicación está diseñada para facilitar la investigación bibliográfica, proporcionando una interfaz amigable para gestionar y consultar referencias bibliográficas. La aplicación está desarrollada utilizando una pila MERN (MongoDB, Express, React, Node.js) con un backend adicional en Flask para controlar y dirigir las solicitudes a las diferentes APIs de referencias bibliográficas.

Configuración:

1.	Frontend

Navega al directorio del frontend.

•	cd front

•	Instala las dependencias.

•	npm install

2.	Backend Flask

Navega al directorio del backend en Flask.


•	cd back-flask

•	Crea un entorno virtual y actívalo.


•	python -m venv venv

•	source venv/bin/activate # En Windows usa `venv\Scripts\activate`

•	Instala las dependencias.

•	pip install -r requirements.txt

3.	Backend Node.js

Navega al directorio del backend en Node.js.

•	cd src

•	Instala las dependencias.

•	npm install

•	Uso:

•	Frontend

•	Inicia el servidor de desarrollo del frontend.


•	npm run dev

•	Esto lanzará el frontend en http://localhost:5173/.

4.	Backend Flask

Inicia el servidor Flask.


•	python app.py

•	Esto lanzará el backend Flask en http://127.0.0.1:5000.

•	Backend Node.js

•	Inicia el servidor Node.js.


•	npm run dev

•	Esto lanzará el backend Node.js en http://localhost:4000.
