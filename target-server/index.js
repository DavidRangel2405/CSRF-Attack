const express = require('express');
const session = require('express-session');
const flash = require('connect-flash-plus');
const { engine } = require('express-handlebars');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARES BASE ===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambiar-esto-en-produccion',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    }
  })
);

app.use(flash());

/* ===================== MOTOR DE VISTAS (HANDLEBARS) ===================== */
app.set("views", __dirname);
app.engine("hbs", engine({
  defaultLayout: 'main',
  layoutsDir: __dirname,
  extname: '.hbs',
}));
app.set("view engine", "hbs");

/* ===================== MIDDLEWARE DE AUTENTICACIÓN ===================== */
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    console.log('[Auth] ❌ Intento de acceso sin sesión');
    req.flash('message', 'Debes iniciar sesión para acceder');
    return res.redirect('/login');
  }
  console.log('[Auth] ✓ Sesión válida, acceso permitido');
  next();
};

/* ===================== BASE DE DATOS ===================== */
const DB_FILE = path.join(__dirname, 'db.json');
let users = [];

// Cargar usuarios
try {
  users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  console.log(`[DB] ${users.length} usuarios cargados correctamente`);
} catch (error) {
  console.error('[DB] Error al cargar usuarios:', error.message);
  users = [];
}

/* ===================== RUTAS DE LA APLICACIÓN ===================== */

// 🔹 HOME
app.get('/home', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const displayEmail = req.query.email || user?.email || 'Desconocido';

  console.log(`[Home] Usuario actual: ${displayEmail}`);
  res.send(`
    <h1>Bienvenido al Sistema</h1>
    <p>Usuario: ${displayEmail}</p>
    <p>Estado CSRF: ⚠️ Vulnerable</p>
    <a href="/edit">Editar perfil</a> | 
    <a href="/logout">Cerrar sesión</a>
  `);
});

// 🔹 LOGIN (GET)
app.get('/login', (req, res) => {
  if (req.session.userId) {
    console.log('[Login] Usuario ya autenticado, redirigiendo a /home');
    return res.redirect('/home');
  }
  res.render('login', { 
    message: req.flash('message')
  });
});

// 🔹 LOGIN (POST)
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('[Login] Intento de inicio de sesión:', { email, password });

  if (!email || !password) {
    req.flash('message', 'Por favor completa todos los campos');
    return res.redirect('/login');
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    console.log('[Auth] ❌ Credenciales incorrectas');
    req.flash('message', 'Credenciales incorrectas');
    return res.redirect('/login');
  }

  req.session.userId = user.id;

  console.log('[Auth] ✅ Login exitoso:', {
    userId: user.id,
    email: user.email,
    sessionId: req.sessionID.substring(0, 8) + '...'
  });

  res.redirect('/home');
});

// 🔹 LOGOUT
app.get('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Error al destruir sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    console.log('[Auth] 📴 Sesión cerrada correctamente');
    res.send(`
      <h2>Sesión cerrada exitosamente</h2>
      <p>Estado de protección CSRF: Desactivado</p>
      <a href="/login">Volver al login</a>
    `);
  });
});

// 🔹 EDITAR PERFIL (GET)
app.get('/edit', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const viewModel = {
    currentEmail: user?.email || ''
  };

  console.log('[Edit] 🧾 Renderizando formulario de edición:', {
    currentEmail: viewModel.currentEmail
  });
  res.render('edit', viewModel);
});

// 🔹 EDITAR PERFIL (POST)
app.post('/edit', requireAuth, (req, res) => {
  const { email, password } = req.body;
  console.log('[Edit] Datos recibidos:', { email, password });

  const user = users.find(u => u.id === req.session.userId);
  if (!user) {
    console.error('[Edit] ❌ Usuario no encontrado');
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (!email || !email.includes('@')) {
    console.log('[Edit] ❌ Email inválido');
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!password || password.trim().length < 3) {
    console.log('[Edit] ❌ Contraseña muy corta');
    return res.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres' });
  }

  const oldEmail = user.email;
  const oldPassword = user.password;

  user.email = email;
  user.password = password;

  console.log('[Edit] ✅ Perfil actualizado:', {
    userId: user.id,
    oldEmail,
    newEmail: email,
    oldPassword,
    newPassword: password,
    csrf: 'Desactivado'
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');

  return res.redirect(303, `/home?email=${encodeURIComponent(oldEmail)}`);
});

// 🔹 STATUS
app.get('/status', (req, res) => {
  res.json({
    csrf: {
      enabled: false
    },
    session: {
      authenticated: !!req.session.userId,
      sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'ninguna'
    }
  });
});

/* ===================== MANEJO DE ERRORES ===================== */
app.use((err, req, res, next) => {
  console.error('[Error Global]', err);
  res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Página no encontrada</h1>
    <a href="/home">Volver al inicio</a>
  `);
});

/* ===================== INICIO DEL SERVIDOR ===================== */
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`Servidor iniciado en: http://localhost:${PORT}`);
  console.log(`CSRF: DESACTIVADO ✗`);
});