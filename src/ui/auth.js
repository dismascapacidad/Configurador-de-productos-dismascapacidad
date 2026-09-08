// @ts-check
/**
 * UI de autenticación (Supabase): botón de cuenta, modal de login/registro/
 * recuperación y las acciones que hablan con `supa.auth`.
 *
 * El puente con los presets (merge local↔nube al iniciar sesión, carga de
 * compartidos, limpieza al salir) NO vive acá: lo orquesta app.js escuchando
 * `supa.auth.onAuthStateChange`.
 */
import { S } from './state.js';
import { toast, esc, closeModal, openModal } from './dom.js';
import { supa, AUTH_REDIRECT } from '../supabase-client.js';

/** getElementById con tipo laxo (transicional, evita castear cada `.value`). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

/** Refresca el botón "Cuenta" del topbar, la etiqueta del drawer y el saludo. */
export function updateAuthBtn() {
  const name = S.currentUser
    ? S.currentUser.user_metadata?.full_name?.split(' ')[0] || S.currentUser.email.split('@')[0]
    : null;
  const label = S.currentUser ? '👤 ' + name : '👤 Cuenta';
  const btn = document.getElementById('btnAuth');
  if (btn) btn.textContent = label;
  const drwLbl = document.getElementById('drwAuthLbl');
  if (drwLbl) drwLbl.textContent = S.currentUser ? name : 'Cuenta';
  // Header del drawer
  const greet = document.getElementById('drwHeadGreet');
  if (greet) {
    if (S.currentUser) {
      greet.innerHTML = `Hola, <em>${esc(name)}</em>`;
    } else {
      greet.innerHTML = `<button class="btn pri sm" onclick="closeDrawer();openAuthModal()">Iniciar sesión</button>`;
    }
  }
}

export function openAuthModal() {
  renderAuthModal('login');
  openModal('authModal');
}

export function renderAuthModal(view = 'login') {
  const body = document.getElementById('authModalBody');
  const title = document.getElementById('authModalTitle');
  if (!body || !title) return;

  if (S.currentUser) {
    title.textContent = 'Mi cuenta';
    body.innerHTML = `
      <p class="auth-info">✅ Sesión iniciada como:<br><strong>${esc(S.currentUser.email)}</strong></p>
      <button class="btn pri sm" onclick="signOut()">Cerrar sesión</button>`;
    return;
  }

  const googleBtn = `
    <button class="btn-google" onclick="signInWithGoogle()">
      <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continuar con Google
    </button>`;

  const divider = `<div class="auth-divider"><span>o</span></div>`;

  if (view === 'login') {
    title.textContent = 'Iniciar sesión';
    body.innerHTML = `
      ${googleBtn}
      ${divider}
      <div class="field">
        <label class="lbl">Email</label>
        <input type="email" id="authEmail" placeholder="tu@email.com" autocomplete="email">
      </div>
      <div class="field">
        <label class="lbl">Contraseña</label>
        <input type="password" id="authPass" placeholder="••••••••" autocomplete="current-password">
      </div>
      <button class="btn pri sm auth-submit" onclick="signInWithPassword()">Ingresar</button>
      <div class="auth-links">
        <a onclick="renderAuthModal('reset')">Olvidé mi contraseña</a>
        <a onclick="renderAuthModal('register')">Crear cuenta</a>
      </div>`;
    setTimeout(() => document.getElementById('authEmail')?.focus(), 50);
  } else if (view === 'register') {
    title.textContent = 'Crear cuenta';
    body.innerHTML = `
      ${googleBtn}
      ${divider}
      <div class="field">
        <label class="lbl">Email</label>
        <input type="email" id="authEmail" placeholder="tu@email.com" autocomplete="email">
      </div>
      <div class="field">
        <label class="lbl">Contraseña <span style="color:var(--txt3);font-weight:400">(mínimo 6 caracteres)</span></label>
        <input type="password" id="authPass" placeholder="••••••••" autocomplete="new-password">
      </div>
      <button class="btn pri sm auth-submit" onclick="signUpWithPassword()">Crear cuenta</button>
      <div class="auth-links">
        <a onclick="renderAuthModal('login')">Ya tengo cuenta</a>
      </div>`;
    setTimeout(() => document.getElementById('authEmail')?.focus(), 50);
  } else if (view === 'reset') {
    title.textContent = 'Recuperar acceso';
    body.innerHTML = `
      <p class="auth-info">Ingresá tu email y te enviamos un enlace para ingresar.</p>
      <div class="field">
        <label class="lbl">Email</label>
        <input type="email" id="authEmail" placeholder="tu@email.com" autocomplete="email">
      </div>
      <button class="btn pri sm auth-submit" onclick="sendResetLink()">Enviar enlace</button>
      <div class="auth-links">
        <a onclick="renderAuthModal('login')">← Volver</a>
      </div>`;
    setTimeout(() => document.getElementById('authEmail')?.focus(), 50);
  } else if (view === 'link-sent') {
    title.textContent = '📬 Revisá tu correo';
    body.innerHTML = `
      <p class="auth-info" style="text-align:center;padding:8px 0">
        Te enviamos un enlace de acceso.<br>
        Hacé clic en ese enlace para ingresar.<br><br>
        <span style="font-size:11px;color:var(--txt3)">Podés cerrar este panel.</span>
      </p>`;
  }
}

export async function signInWithPassword() {
  const email = el('authEmail')?.value?.trim();
  const pass = el('authPass')?.value;
  if (!email || !pass) {
    toast('⚠️', 'Completá email y contraseña');
    return;
  }
  const b = /** @type {any} */ (document.querySelector('.auth-submit'));
  b.disabled = true;
  b.textContent = 'Ingresando…';
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) {
    toast(
      '❌',
      error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message,
    );
    b.disabled = false;
    b.textContent = 'Ingresar';
  } else {
    closeModal('authModal');
    toast('👋', '¡Bienvenido!');
  }
}

export async function signUpWithPassword() {
  const email = el('authEmail')?.value?.trim();
  const pass = el('authPass')?.value;
  if (!email || !pass) {
    toast('⚠️', 'Completá email y contraseña');
    return;
  }
  if (pass.length < 6) {
    toast('⚠️', 'La contraseña debe tener al menos 6 caracteres');
    return;
  }
  const b = /** @type {any} */ (document.querySelector('.auth-submit'));
  b.disabled = true;
  b.textContent = 'Creando cuenta…';
  const { error } = await supa.auth.signUp({
    email,
    password: pass,
    options: { emailRedirectTo: AUTH_REDIRECT },
  });
  if (error) {
    toast('❌', error.message);
    b.disabled = false;
    b.textContent = 'Crear cuenta';
  } else {
    renderAuthModal('link-sent');
  }
}

export async function signInWithGoogle() {
  await supa.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT },
  });
}

export async function sendResetLink() {
  const email = el('authEmail')?.value?.trim();
  if (!email) {
    toast('⚠️', 'Ingresá tu email');
    return;
  }
  const b = /** @type {any} */ (document.querySelector('.auth-submit'));
  b.disabled = true;
  b.textContent = 'Enviando…';
  const { error } = await supa.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: AUTH_REDIRECT },
  });
  if (error) {
    toast('❌', error.message);
    b.disabled = false;
    b.textContent = 'Enviar enlace';
  } else {
    renderAuthModal('link-sent');
  }
}

export async function signOut() {
  await supa.auth.signOut();
  // La limpieza de localStorage y renderCustom() la maneja onAuthStateChange(SIGNED_OUT)
  closeModal('authModal');
  toast('👋', 'Sesión cerrada. Tus configuraciones quedan guardadas en tu cuenta.');
}
