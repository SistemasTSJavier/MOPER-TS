# Configurar Supabase (plan gratuito) con Render

En el plan gratuito de Supabase la **conexión directa** (puerto 5432) suele dar **ENETUNREACH** desde Render. La solución es usar **Connection pooling** (puerto 6543): el pooler es accesible por IPv4 y funciona desde Render sin cambiar de plan.

---

## 1. Obtener la URI del pooler en Supabase

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** y abre tu proyecto.
2. Ve a **Project Settings** (icono de engranaje abajo a la izquierda).
3. En el menú lateral, **Database**.
4. Baja hasta la sección **Connection string**.
5. Arriba verás pestañas:
   - **URI** (conexión directa, puerto 5432) → **no uses esta** para Render.
   - **Connection pooling** → **usa esta**.
6. Con **Connection pooling** seleccionado:
   - Elige modo **Transaction** (puerto **6543**).
   - Copia la cadena. Se verá así:
     ```
     postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - El host debe ser `*.pooler.supabase.com` y el puerto **6543**.
7. Sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos (la misma que usas en la conexión directa).  
   Si no la recuerdas: **Project Settings → Database → Database password** (o restablece la contraseña).

Ejemplo (con contraseña de ejemplo):
```
postgresql://postgres.abc123xyz:MiPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 2. Configurar Render

1. En **Render** abre tu **Web Service** (la app MOPER).
2. **Environment** (menú izquierdo).
3. Busca la variable **`DATABASE_URL`**.
4. **Edit** (o añádela si no existe).
5. Pega la URI del pooler que copiaste (con la contraseña ya puesta).
6. Guarda. Render hará un **redeploy** automático.

---

## 3. Comprobar

- Tras el redeploy, abre tu app en la URL de Render.
- Si todo está bien, el panel cargará los registros y no verás "Error al listar registros: connect ENETUNREACH".

Si sigue fallando:
- Revisa que la URI tenga **puerto 6543** y **pooler.supabase.com** en el host.
- Comprueba que la contraseña no tenga caracteres que deban ir codificados en la URL (si tiene `@`, `#`, `%`, etc., codifícalos: `%40`, `%23`, `%25`).

---

## Resumen

| Conexión              | Puerto | Host              | ¿Funciona desde Render? |
|-----------------------|--------|--------------------|--------------------------|
| Direct (no usar aquí) | 5432   | db.xxx.supabase.co | Suele dar ENETUNREACH    |
| **Connection pooling**| **6543** | **xxx.pooler.supabase.com** | **Sí**              |

No hace falta activar IPv4 ni cambiar de plan en Supabase: solo usar la URI del pooler en `DATABASE_URL` en Render.

---

## Código de acceso para la firma del oficial del MOPER

Para que la **firma de conformidad** (oficial del MOPER) exija un código antes de firmar, configura en Render (Environment) la variable:

- **`FIRMA_CONFORMIDAD_CODE`**: código que debe ingresar quien firma conformidad.  
  Opcionalmente puedes usar **`FIRMA_ACCESS_CODE`** con el mismo valor.

Si no defines ninguna de las dos variables (o las dejas vacías), la firma de conformidad no pedirá código. Las demás firmas (RH, Gerente, Centro de Control) no usan código.

---

## Login y usuarios (gerente / RH / control)

La aplicación tiene un **panel de login** con dos opciones:

1. **Iniciar sesión**: para gerente, RH o control. Quien inicia sesión puede ver todos los registros y firmar según su rol (gerente firma “Gerente de Operaciones”, RH firma “Recursos Humanos”, control firma “Centro de Control”).
2. **Código de acceso**: el código se genera al crear cada registro. Quien ingresa el código ve solo el resumen de ese MOPER y puede **solo firmar conformidad** (oficial). Las otras tres firmas aparecen bloqueadas hasta que se inicie sesión con la cuenta correspondiente.

### ¿Dónde se crean el admin y los usuarios?

Los usuarios se guardan en **Supabase**, en la tabla **`usuarios`** (la crea la app al arrancar). No se crean desde el panel de Supabase a mano; hay dos formas:

---

#### 1. Admin (primer usuario) – automático al desplegar

- En **Render** → tu Web Service → **Environment**.
- Añade **`ADMIN_EMAIL`** y **`ADMIN_PASSWORD`** (el correo y la contraseña que quieras para el admin).
- La **primera vez** que el servidor arranque, si la tabla `usuarios` está vacía, creará un usuario con ese correo y contraseña y rol `admin`. Ese usuario ya puede iniciar sesión en la app.
- Después puedes quitar `ADMIN_EMAIL` y `ADMIN_PASSWORD` de Render si no quieres dejarlos guardados (el usuario ya está en Supabase).

---

#### 2. Resto de usuarios (gerente, RH, control) – script en tu PC

Desde tu máquina (con la misma `DATABASE_URL` que usa la app, por ejemplo en `server/.env`):

```bash
cd server
npm run create-user -- <email> <password> <nombre> <rol>
```

**Ejemplos:**

```bash
npm run create-user -- gerente@empresa.com MiClave456 "María Gerente" gerente
npm run create-user -- rh@empresa.com OtraClave789 "Pedro RH" rh
npm run create-user -- control@empresa.com ClaveControl "Ana Control" control
```

**Roles válidos:** `admin`, `gerente`, `rh`, `control`.

**Usuarios de Tactical Support (ya definidos):** para crear de una vez los 4 usuarios (gterh, centrodecontrol, relacioneslaborales, operaciones) con las contraseñas indicadas, desde la carpeta `server` ejecuta:

```bash
npm run seed-usuarios
```

Requiere `DATABASE_URL` en `server/.env` con la URI del pooler de Supabase. Si la app en Render ya usa esa misma base, los usuarios quedarán creados ahí y podrán iniciar sesión.

El script `create-user` usa la variable **`DATABASE_URL`** del archivo `server/.env` (la misma URI del pooler de Supabase que en Render). Si ya tienes esa variable en `.env` para desarrollar, el script se conecta a la misma base y crea el usuario ahí. Así los usuarios que crees se verán al iniciar sesión en la app (local o en Render).

---

#### Crear usuarios directo en Supabase (avanzado)

También puedes insertar filas en la tabla **`usuarios`** desde Supabase (Table Editor), pero la contraseña debe ir hasheada con **bcrypt**. Sin el script o otro programa que genere el hash, es fácil equivocarse. Por eso se recomienda usar el script `create-user`.

---

### Variables de entorno en Render

- **`JWT_SECRET`**: secreto para firmar los tokens (obligatorio en producción). Ejemplo: una cadena larga y aleatoria.
- **`ADMIN_EMAIL`** y **`ADMIN_PASSWORD`**: solo para crear el **primer** usuario admin al arrancar (ver arriba).
