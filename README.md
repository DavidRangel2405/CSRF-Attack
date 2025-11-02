# CSRF-Attack

Demostración de Ataque CSRF (Cross-Site Request Forgery)

## ⚠️ ADVERTENCIA

Este proyecto es **ÚNICAMENTE PARA FINES EDUCATIVOS**. El servidor está intencionalmente configurado sin protecciones de seguridad para demostrar vulnerabilidades CSRF.

**NO USAR EN PRODUCCIÓN**

---

## 📋 Descripción

Proyecto educativo que demuestra:
- ✅ Cómo funciona un ataque CSRF
- ✅ Por qué las aplicaciones son vulnerables
- ✅ Cómo protegerse contra estos ataques

---

## 🛠️ Requisitos

- Node.js (v14 o superior)
- npm o yarn
- Python (para servidor del atacante)

---

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/DavidRangel2405/CSRF-Attack.git
cd CSRF-Attack

# Instalar dependencias
npm install

# Instalar serve globalmente (si no lo tienes)
npm install -g serve
```

### Dependencias necesarias:

```json
{
  "express": "^4.18.0",
  "express-session": "^1.17.0",
  "express-handlebars": "^6.0.0",
  "connect-flash-plus": "^0.1.0"
}
```

---

## 🚀 Ejecución

### 1. Iniciar el servidor vulnerable

```bash
node index.js
```

El servidor se iniciará en: `http://localhost:3000`

### 2. Iniciar el servidor del atacante

En otra terminal:

```bash
serve -l 5000
```

El sitio malicioso estará en: `http://localhost:5000`

---

## 🎯 Demostración del Ataque

### Paso 1: Login como usuario legítimo

1. Abre tu navegador en `http://localhost:3000/login`
2. Credenciales:
   - Email: `test@test.com`
   - Password: `test`
3. Inicia sesión

### Paso 2: Verificar tu cuenta

- Ve a `http://localhost:3000/home`
- Verás tu email actual: `test@test.com`

### Paso 3: Abrir DevTools (F12)

- Activa la pestaña **Network**
- Marca **Preserve log** ✓
- Ve a la pestaña **Application** > Cookies
- Observa la cookie `sessionId`

### Paso 4: Visitar sitio malicioso

**SIN CERRAR LA SESIÓN**, abre una nueva pestaña:

```
http://localhost:5000/index.html
```

### Paso 5: ¡Ataque ejecutado!

- La página cargará automáticamente
- Tu cuenta será modificada
- Email cambiado a: `hacker@hack.com`
- Password cambiado a: `hacker`

### Paso 6: Verificar el daño

Vuelve a `http://localhost:3000/home` y recarga (F5)

**Resultado**: Tu cuenta ha sido comprometida sin tu consentimiento.

---

## 🔍 Qué observar en DevTools

### En la pestaña Network:

Busca la petición `edit`:

```
Request URL: http://localhost:3000/edit
Request Method: POST
Status Code: 303

Request Headers:
  Cookie: sessionId=... ← Cookie enviada automáticamente
  Origin: http://localhost:5000 ← ¡Viene del sitio malicioso!
  Referer: http://localhost:5000/index.html

Form Data:
  email: hacker@hack.com
  password: hacker
```

### En los logs del servidor:

```
[Edit] Datos recibidos: { email: 'hacker@hack.com', password: 'hacker' }
[Edit] ✅ Perfil actualizado:
  oldEmail: 'test@test.com',
  newEmail: 'hacker@hack.com',
  csrf: 'Desactivado'
```

---

## 🔓 Vulnerabilidades Presentes

### 1. Sin Token CSRF
El formulario no incluye token de validación:

```html
<!-- VULNERABLE -->
<form action="/edit" method="POST">
  <input type="email" name="email" />
  <input type="password" name="password" />
</form>
```

### 2. Sin Validación de Origen
El servidor no verifica de dónde viene la petición:

```javascript
app.post('/edit', requireAuth, (req, res) => {
  // Solo verifica autenticación
  // NO verifica origen de la petición
  user.email = req.body.email;
  user.password = req.body.password;
});
```

### 3. Cookie SameSite: Lax
Permite envío de cookies en navegación cross-site:

```javascript
cookie: {
  sameSite: 'lax' // ⚠️ Vulnerable
}
```

### 4. Sin Cabeceras de Seguridad
No hay validación adicional de headers como Origin o Referer.

---

## 🛡️ Cómo Protegerse

### Método 1: Tokens CSRF

```javascript
// Generar token único
const token = uuid();
csrfTokenStore.set(sessionId, token);

// Inyectar en formulario
<input type="hidden" name="csrf" value="{{csrfToken}}">

// Validar en servidor
const isValid = csrfTokenStore.get(sessionId) === req.body.csrf;
if (!isValid) return res.status(403).json({ error: 'Forbidden' });
```

### Método 2: SameSite=Strict

```javascript
cookie: {
  sameSite: 'strict' // Bloquea envío cross-site
}
```

### Método 3: Validar Origin/Referer

```javascript
const origin = req.get('origin') || req.get('referer');
const allowedOrigins = ['http://localhost:3000'];

if (!allowedOrigins.some(allowed => origin.startsWith(allowed))) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Método 4: Cabeceras de Seguridad

```javascript
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "default-src 'self'");
```

---

## 📊 Comparación Visual

| Aspecto                | SIN Protección ⚠️     | CON Protección ✅      |
|------------------------|----------------------|----------------------|
| Token CSRF             | ✗ No existe          | ✓ Validado           |
| Validación de origen   | ✗ No verifica        | ✓ Verificado         |
| SameSite cookie        | Lax (vulnerable)     | Strict (seguro)      |
| Resultado del ataque   | ❌ Cuenta hackeada   | ✅ Ataque bloqueado  |

---

## 🎓 Conceptos Clave

### ¿Qué es CSRF?

Cross-Site Request Forgery es un ataque donde un sitio malicioso fuerza al navegador de la víctima a realizar acciones no deseadas en un sitio donde la víctima está autenticada.

### ¿Por qué funciona?

1. Las **cookies se envían automáticamente** con cada petición al dominio
2. El servidor **confía en la cookie** como prueba de identidad
3. El servidor **NO verifica el origen** de la petición
4. El usuario **no necesita hacer nada** consciente

### ¿Quién está en riesgo?

- Aplicaciones bancarias
- Redes sociales
- Paneles de administración
- Routers domésticos
- Cualquier sitio que cambie datos con formularios POST

---

## 🔗 Recursos Adicionales

- [OWASP CSRF Guide](https://owasp.org/www-community/attacks/csrf)
- [MDN SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## 🤝 Créditos

Proyecto educativo para demostración de vulnerabilidades CSRF.

**Recuerda**: Usar este conocimiento éticamente y solo en entornos controlados.

---

## ❓ Preguntas Frecuentes

### ¿Por qué el ataque funciona en localhost?

Localhost es considerado un mismo origen para cookies. En producción, el atacante usaría su propio dominio.

### ¿Qué navegadores son vulnerables?

Todos los navegadores envían cookies automáticamente. Por eso es responsabilidad del servidor validar.

### ¿SameSite=Lax no debería proteger?

Lax permite cookies en navegación top-level (cuando el usuario hace click). Strict bloquea todo cross-site.

### ¿Por qué no usar solo SameSite?

Es una defensa adicional, pero tokens CSRF son el estándar. Navegadores antiguos no soportan SameSite.

---

## 📄 Licencia

MIT License - Uso educativo únicamente
