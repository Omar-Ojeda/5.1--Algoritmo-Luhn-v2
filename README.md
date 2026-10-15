# Trabajo Final de Base de Datos y Gestión de Proyectos de Software

**Institución:** Escuela Superior de Comercio N.º 43  
**Carrera:** Técnico Superior en Desarrollo de Software  
**Profesores:** Ariel Nardelli, Matías Nardelli y Eliana Suligoy  
**Integrantes:** Omar Ojeda y Lucía Solari

---

## 1. ¿En qué consiste la base de datos?

El proyecto consiste en diseñar y normalizar una base de datos a partir de un *dataset* de películas y series de Netflix. El archivo original contiene **8.807 registros** y campos como tipo, título, director, reparto, país, fecha de incorporación, año de lanzamiento, clasificación, duración, categorías y descripción.

En una primera etapa, los datos se cargaron en una tabla temporal llamada `dataset`. Luego se analizaron los campos y se reorganizó la información en tablas relacionadas para reducir la repetición de datos y representar correctamente las relaciones entre títulos, directores, actores, países y categorías.

La base de datos final se llama `proyectoFinalDB_v2` y permite consultar el catálogo, buscar títulos y obtener información agrupada y estadísticas.

### Tablas principales

- `shows`: información principal de cada película o serie.
- `tipos`: tipos de contenido, por ejemplo, película o serie.
- `clasificaciones`: clasificaciones por edad.
- `directores` y `shows_directores`: directores y su relación con los títulos.
- `actores` y `shows_actores`: actores y su relación con los títulos.
- `paises` y `shows_paises`: países asociados a cada título.
- `categorias` y `shows_categorias`: categorías asociadas a cada título.
- `dataset`: tabla inicial utilizada para importar y procesar los datos originales.

Las tablas intermedias `shows_directores`, `shows_actores`, `shows_paises` y `shows_categorias` permiten representar relaciones de muchos a muchos.

---

## 2. Diagrama entidad-relación (E-R)

El siguiente diagrama representa las tablas de la base de datos y sus relaciones.

![Diagrama entidad-relación de la base de datos](Proyecto%20Final%20DER.png)

---

## 3. Código utilizado para la normalización

La normalización se realizó mediante consultas SQL en MySQL. Primero se creó una tabla con los datos originales y después se distribuyó la información en tablas específicas, vinculadas mediante claves primarias y claves foráneas.

### 3.1. Creación de la base de datos y tabla inicial

```sql
CREATE DATABASE proyectoFinalDB_v2;
USE proyectoFinalDB_v2;

CREATE TABLE dataset (
    id_show INT AUTO_INCREMENT NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    director TEXT,
    `cast` TEXT,
    country TEXT,
    date_added TEXT,
    release_year INT,
    rating TEXT,
    duration TEXT,
    listed_in TEXT,
    description TEXT,
    PRIMARY KEY (id_show)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;
```

La tabla `dataset` conserva los campos del archivo original para facilitar la importación y el procesamiento de los registros.

### 3.2. Separación de datos repetidos

Se crearon tablas independientes para los tipos de contenido y las clasificaciones. Los valores únicos se obtuvieron con `SELECT DISTINCT`.

```sql
INSERT INTO tipos (tipo_de_show)
SELECT DISTINCT type
FROM dataset;

INSERT INTO clasificaciones (clasificacion)
SELECT DISTINCT rating
FROM dataset
WHERE rating <> ''
  AND rating NOT LIKE '%min%';
```

### 3.3. Creación de relaciones

Los campos originales de director, reparto, país y categoría pueden contener varios valores separados por comas. Para separar esos valores, se utilizaron consultas con `JSON_TABLE`, junto con `TRIM` y `DISTINCT`, y se insertaron los resultados en tablas individuales y tablas intermedias.

Ejemplo de la relación entre títulos y directores:

```sql
INSERT INTO shows_directores (id_show, id_director)
SELECT DISTINCT
    d.id_show,
    di.id_director
FROM dataset AS d
JOIN JSON_TABLE(
    CONCAT(
        '["',
        REPLACE(REPLACE(d.director, '"', '\\"'), ', ', '","'),
        '"]'
    ),
    '$[*]' COLUMNS (
        nombre_director VARCHAR(100) PATH '$'
    )
) AS j
JOIN directores AS di
    ON di.nombre_director = TRIM(j.nombre_director)
WHERE TRIM(d.director) <> ''
  AND TRIM(j.nombre_director) <> '';
```

El mismo enfoque se utilizó para procesar actores, países y categorías, adaptando los nombres de los campos y las tablas.

### 3.4. Claves y relaciones

Las tablas se vincularon mediante claves primarias (`PRIMARY KEY`) y claves foráneas (`FOREIGN KEY`). En las tablas intermedias se utilizaron claves primarias compuestas por los identificadores de ambas entidades, para evitar duplicar una misma relación.

### 3.5. Ajuste de fechas

La fecha de incorporación se transformó al tipo `DATE`. Para ello, se convirtió el texto original con `STR_TO_DATE` y luego se modificó el tipo de la columna.

```sql
UPDATE shows
SET fecha_aniadido = STR_TO_DATE(fecha_aniadido, '%M %d, %Y')
WHERE fecha_aniadido IS NOT NULL
  AND fecha_aniadido <> '';

UPDATE shows
SET fecha_aniadido = NULL
WHERE fecha_aniadido = '';

ALTER TABLE shows
MODIFY fecha_aniadido DATE;
```

### 3.6. Compatibilidad al importar

Durante la preparación del archivo SQL, se indicó reemplazar la intercalación `utf8mb4_0900_ai_ci` por `utf8mb4_unicode_ci` cuando el servidor MySQL de destino no admita la primera.

---

## 4. Consultas realizadas

Durante el desarrollo se realizaron consultas para cargar los datos, revisar registros, detectar valores vacíos, contar elementos, comprobar relaciones y consultar la información ya normalizada.

### 4.1. Consultar los registros originales

```sql
SELECT *
FROM dataset;
```

### 4.2. Contar películas y series por tipo

```sql
SELECT COUNT(*) AS total, type
FROM dataset
GROUP BY type;
```

### 4.3. Consultar títulos con su tipo y clasificación

```sql
SELECT
    s.id_show,
    t.tipo_de_show,
    s.titulo,
    s.anio_salida,
    c.clasificacion,
    s.duracion
FROM shows AS s
LEFT JOIN tipos AS t
    ON t.id_tipo = s.id_tipo
LEFT JOIN clasificaciones AS c
    ON c.id_clasificacion = s.id_clasificacion;
```

### 4.4. Buscar títulos con la fecha de incorporación más antigua

```sql
SELECT *
FROM shows
WHERE YEAR(fecha_aniadido) = (
    SELECT MIN(YEAR(fecha_aniadido))
    FROM shows
);
```

### 4.5. Contar títulos por categoría

```sql
SELECT
    ca.categoria,
    COUNT(DISTINCT sc.id_show) AS total_titulos
FROM categorias AS ca
JOIN shows_categorias AS sc
    ON sc.id_categoria = ca.id_categoria
GROUP BY ca.categoria
ORDER BY total_titulos DESC;
```

### 4.6. Comprobar relaciones faltantes con clasificaciones

```sql
SELECT
    d.id_show,
    d.rating
FROM dataset AS d
LEFT JOIN clasificaciones AS c
    ON c.clasificacion = d.rating
WHERE c.id_clasificacion IS NULL;
```

Además de estas consultas, se realizaron consultas de control para contar directores y actores, revisar valores vacíos, detectar nombres extensos y comprobar las relaciones de las tablas intermedias.

---

## 5. Vistas creadas

Se crearon vistas SQL para simplificar consultas frecuentes y presentar información del catálogo sin tener que escribir nuevamente todas las relaciones entre tablas.

| Vista | Descripción |
|---|---|
| `vista_catalogo_netflix` | Muestra los datos principales del catálogo: título, tipo, año, duración, clasificación y fecha de incorporación. |
| `super_consulta` | Reúne información de títulos, directores, actores, países y categorías mediante varias relaciones. |
| `super_consulta_2` | Presenta información similar a la consulta general, agrupando por separado los datos relacionados para reducir la multiplicación de filas producida por varias relaciones de muchos a muchos. |
| `vista_titulos_categorias` | Relaciona cada título con sus categorías. |
| `vista_titulos_paises` | Relaciona cada título con sus países asociados. |
| `vista_estadisticas_anuales` | Agrupa los títulos por año de lanzamiento y tipo de contenido. |

### Ejemplos de uso de las vistas

**Buscar un título por nombre:**

```sql
SELECT *
FROM vista_catalogo_netflix
WHERE titulo LIKE '%Dark%';
```

**Consultar los títulos de una categoría:**

```sql
SELECT *
FROM vista_titulos_categorias
WHERE categoria = 'Documentaries'
ORDER BY titulo;
```

**Consultar los títulos asociados a Argentina:**

```sql
SELECT *
FROM vista_titulos_paises
WHERE nombre_pais = 'Argentina'
ORDER BY titulo;
```

**Consultar estadísticas por año y tipo:**

```sql
SELECT *
FROM vista_estadisticas_anuales
ORDER BY total_titulos DESC;
```

---

## 6. Instrucciones para importar la base de datos

La base de datos se puede importar utilizando **MySQL Workbench** o **HeidiSQL**. Antes de comenzar, hay que identificar el archivo `.sql` que contiene la creación y carga de las tablas. Si las vistas están en un archivo SQL separado, ese archivo debe ejecutarse después de crear las tablas.

### 6.1. Importar con MySQL Workbench

1. Abrir MySQL Workbench y conectarse al servidor MySQL.
2. Ir a **File → Open SQL Script** y seleccionar el archivo SQL principal.
3. Revisar que el script corresponda a la versión final del proyecto.
4. Ejecutar el script con el botón del rayo.
5. Actualizar el panel **Schemas** y comprobar que aparezca `proyectoFinalDB_v2`.
6. Si las vistas se encuentran en otro archivo, abrir ese archivo y ejecutarlo después de importar las tablas.

Para comprobar la importación, ejecutar:

```sql
USE proyectoFinalDB_v2;

SHOW TABLES;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

SELECT COUNT(*) AS total_registros
FROM shows;

SELECT *
FROM vista_catalogo_netflix
LIMIT 10;
```

### 6.2. Importar con HeidiSQL

1. Abrir **HeidiSQL** y crear o seleccionar una sesión de conexión al servidor MySQL.
2. Conectarse al servidor.
3. Abrir una pestaña de consulta y cargar el archivo SQL principal. Según la versión de HeidiSQL, se puede utilizar **Archivo → Cargar archivo SQL** o abrir el archivo `.sql` desde el editor.
4. Verificar que el archivo sea el script principal que crea la base de datos y las tablas.
5. Ejecutar el script con el botón de ejecución (o la tecla de acceso rápido indicada por la versión).
6. Esperar a que termine la ejecución y revisar la pestaña de mensajes para detectar posibles errores.
7. Actualizar el árbol de bases de datos y comprobar que aparezca `proyectoFinalDB_v2` con sus tablas.
8. Si las vistas están en un archivo separado, cargar y ejecutar ese archivo después de importar las tablas.
9. Ejecutar las consultas de verificación que aparecen a continuación para comprobar que las tablas, vistas y registros estén disponibles.

```sql
USE proyectoFinalDB_v2;

SHOW TABLES;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

SELECT COUNT(*) AS total_registros
FROM shows;

SELECT *
FROM vista_catalogo_netflix
LIMIT 10;
```


### 6.3. Si se utiliza el CSV original

Si el script incluye `LOAD DATA INFILE`, la ruta del archivo CSV debe existir en el equipo o servidor MySQL y el usuario debe tener permisos para leerla. En el script original se utilizó:

```sql
LOAD DATA INFILE '/var/lib/mysql-files/netflix_titles.csv'
```

Esa ruta corresponde a una configuración de servidor y puede no existir en Windows. Si se importa desde otro entorno, hay que adaptar la ruta o cargar el CSV mediante la herramienta de importación de datos. Si se entrega un respaldo SQL que ya contiene los datos, normalmente no será necesario volver a importar el CSV por separado.

---

## 7. Estructura del proyecto

El proyecto está organizado en tres carpetas principales y los archivos de ejecución de la aplicación.

```text
ProyectoFinal/
├── database/
│   ├── proyectoFinalBD_v6.sql
│   ├── Proyecto Final DER.png
│   ├── netflix_titles.csv
│   └── normalizacion/
│       ├── actores.txt
│       ├── directores.txt
│       ├── ... otros archivos TXT de normalización
│       └── ...
├── static/
│   └── estilos.css
├── templates/
│   └── index.html
├── app.py
├── requirements.txt
└── README.md
```

### Descripción de las carpetas y archivos

- **`database/`**: contiene los archivos relacionados con la base de datos: el script SQL, el dataset original y el diagrama entidad-relación. Dentro de esta carpeta hay una subcarpeta con archivos `.txt` que guardan las consultas utilizadas para normalizar las tablas, por ejemplo `actores.txt`, `directores.txt` y otros archivos similares.
- **`static/`**: contiene los recursos estáticos de la aplicación. En este proyecto se encuentra `estilos.css`, que define la apariencia visual de la página.
- **`templates/`**: contiene las plantillas HTML que utiliza Flask. El archivo `index.html` define la estructura de la página principal.
- **`app.py`**: archivo principal de la aplicación Flask. Se encarga de iniciar el servidor y conectar la interfaz con la base de datos.
- **`requirements.txt`**: lista las dependencias de Python necesarias para ejecutar el proyecto.
- **`README.md`**: documento con la descripción del proyecto y las instrucciones de instalación e importación.

### Instalación de dependencias y ejecución

Con Python instalado, abrir una terminal en la carpeta principal del proyecto y ejecutar:

```bash
pip install -r requirements.txt
python app.py
```

Después, abrir en el navegador la dirección local que indique Flask en la terminal.
