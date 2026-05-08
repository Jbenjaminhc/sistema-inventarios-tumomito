---
# Sistema de Inventarios Tumomito
FICCT – 2026
---

## 📘 Descripción del Proyecto

El **Sistema de Inventarios Tumomito** es una aplicación web desarrollada para la Materia de Soporte para la toma de Decisiones.

El sistema está diseñado para optimizar la gestión, control y trazabilidad de inventarios dentro de una organización, permitiendo el registro de productos, categorías, usuarios, despachos y devoluciones, apoyándose en tecnologías modernas y buenas prácticas de desarrollo de software.

La solución implementa una arquitectura **Frontend / Backend desacoplada**, con control de acceso por roles y uso de códigos QR para facilitar la identificación y operación sobre los productos.

Este repositorio se publica con fines **exclusivamente académicos**, para revisión técnica por parte del Docente.

---

## 🎯 Objetivo General

Desarrollar un sistema web de inventarios que permita administrar de forma eficiente los productos, usuarios y movimientos logísticos, garantizando trazabilidad, control y facilidad de uso mediante una interfaz moderna y segura.

---

## 🧩 Funcionalidades Principales

- Autenticación de usuarios mediante JWT
- Control de roles (Administrador / Usuario)
- Gestión de productos y categorías
- Generación, impresión y lectura de códigos QR
- Registro de despachos de productos
- Registro de devoluciones
- Historial de movimientos con exportación a Excel
- Interfaz con soporte para tema claro y oscuro
- Persistencia de información en base de datos relacional

---

## 🏗️ Arquitectura del Sistema

El proyecto está dividido en dos componentes principales:

- **Backend**: API REST encargada de la lógica de negocio, autenticación y acceso a datos.
- **Frontend**: Aplicación web encargada de la interfaz de usuario y la interacción con la API.

---

## 🧩 Tecnologías Utilizadas

### Backend
- Python
- FastAPI
- SQLAlchemy
- JWT (JSON Web Tokens)
- Base de datos relacional (PostgreSQL o SQLite)
- Uvicorn

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

---

## 📁 Estructura del Proyecto

```text
sistema-inventarios-tumomitoelo/
├── backend/
│   ├── app/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md
---
```
---

## ▶️ Inicialización del Proyecto

### 📋 Requisitos Previos

* Git
* Node.js v18 o superior
* Python 3.10 o superior
* Gestor de paquetes `npm`
* Sistema operativo Windows o Linux

---
## 🚀 Inicialización del Backend

### 1️⃣ Ingresar a la carpeta backend

```bash
cd backend
```

### 2️⃣ Crear entorno virtual

```bash
python -m venv venv
```

### 3️⃣ Activar entorno virtual

#### Windows

```bash
venv\Scripts\activate  
```

### 4️⃣ Instalar dependencias

```bash
pip install -r requirements.txt
```
### 5️⃣ Configurar la base de datos y variables de entorno
Primero crear la base de datos PostgreSQL con el nombre de 'tumomito_db' en pgAdmin, luego las tablas se crearán automaticamente al ejecutar el servidor
Crea un archivo `.env` dentro de la carpeta `backend` (o en la raíz del proyecto, según cómo lo utilice tu código) con el siguiente contenido ajustando tus datos de acceso si es necesario:

Copiar todo el contenido en el archivo .env:
```bash
# URL de conexión a la base de datos PostgreSQL
# Formato: postgresql+psycopg://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_BD
DATABASE_URL=postgresql+psycopg://postgres:contraseña@localhost:5432/tumomito_db

# (Opcional) Si quieres que FastAPI cree las tablas automáticamente al iniciar:
AUTO_CREATE_DB=true
```

### 6 Ejecutar el servidor

```bash
uvicorn app.main:app --reload
```
Luego detener el Servidor con Ctrl + c
Las tablas de la base de datos tumomito_db fueron creadas automaticamente

### 7 Crear la credencial de admin después de detener el servidor para el Login

```bash
python -m scripts.create_admin
```
Esto creará el usuario admin con:
- Usuario: admin
- Contraseña: Admin123*

### 8 Ejecutar el servidor nuevamente

```bash
uvicorn app.main:app --reload
```

📍 El backend quedará disponible en:

```text
http://127.0.0.1:8000
```

---

## 🌐 Inicialización del Frontend

### 1️⃣ Ingresar a la carpeta frontend

```bash
cd frontend
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Ejecutar la aplicación

```bash
npm run dev
```

📍 El frontend quedará disponible en:

```text
http://localhost:3000
```

---

## 🔐 Consideraciones de Seguridad

* La autenticación se gestiona mediante JWT.
* Las variables sensibles se manejan mediante archivos `.env` (no incluidos en el repositorio).
* El acceso a módulos críticos está restringido por roles.
* No se versionan dependencias ni entornos virtuales.

---

---

## 📄 Licencia y Uso

Repositorio publicado únicamente con fines académicos.
No destinado para uso comercial.
---
