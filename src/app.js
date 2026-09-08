// @ts-nocheck
/* eslint-disable */
/**
 * Punto de entrada de la app (UI). TRANSICIONAL: es el <script> clásico que
 * vivía en index.html, movido tal cual a un módulo. Se irá partiendo en
 * src/ui/*.js (cada uno con @ts-check y lint). Por eso acá van desactivados.
 *
 * Requiere servir por http(s): con file:// fallan los import.
 */

  import * as Protocol from './protocol.js';
  import * as Transport from './transport.js';
  import * as Csv from './csv.js';
  import * as PresetsStore from './presets-store.js';
  import * as ProductData from './products.js';
  window.Protocol = Protocol;
  window.Transport = Transport;
  window.Csv = Csv;
  window.PresetsStore = PresetsStore;
  // PRODUCTS, PRESET_TABS, LATEST_FW, FACTORY_CMDS/CARDS, TIP_CONTENT, DEV_* : se
  // exponen como globales sueltos para no reescribir los ~27 usos del script clásico.
  // Transicional — al modularizar la UI se hará import directo.
  Object.assign(window, ProductData);

// ═══════════════════════════════════════════════════════
// SUPABASE AUTH
// ═══════════════════════════════════════════════════════
const SUPA_URL  = 'https://lhpewyblvjijpmcxzcod.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocGV3eWJsdmppanBtY3h6Y29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzYzNDMsImV4cCI6MjA5MzYxMjM0M30.K5LKmwNOj0gI9UbzxAmozTu3X2eyvP6H2wcFt-s68lE';
const supa = supabase.createClient(SUPA_URL, SUPA_ANON);
let currentUser = null;

const AUTH_REDIRECT = window.location.href.split('?')[0].split('#')[0];

function updateAuthBtn() {
  const name  = currentUser ? (currentUser.user_metadata?.full_name?.split(' ')[0] || currentUser.email.split('@')[0]) : null;
  const label = currentUser ? '👤 ' + name : '👤 Cuenta';
  const btn   = document.getElementById('btnAuth');
  if (btn) btn.textContent = label;
  const drwLbl = document.getElementById('drwAuthLbl');
  if (drwLbl) drwLbl.textContent = currentUser ? name : 'Cuenta';
  // Header del drawer
  const greet = document.getElementById('drwHeadGreet');
  if (greet) {
    if (currentUser) {
      greet.innerHTML = `Hola, <em>${esc(name)}</em>`;
    } else {
      greet.innerHTML = `<button class="btn pri sm" onclick="closeDrawer();openAuthModal()">Iniciar sesión</button>`;
    }
  }
}

function openAuthModal() {
  renderAuthModal('login');
  openModal('authModal');
}

function renderAuthModal(view = 'login') {
  const body  = document.getElementById('authModalBody');
  const title = document.getElementById('authModalTitle');

  if (currentUser) {
    title.textContent = 'Mi cuenta';
    body.innerHTML = `
      <p class="auth-info">✅ Sesión iniciada como:<br><strong>${esc(currentUser.email)}</strong></p>
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

async function signInWithPassword() {
  const email = document.getElementById('authEmail')?.value?.trim();
  const pass  = document.getElementById('authPass')?.value;
  if (!email || !pass) { toast('⚠️', 'Completá email y contraseña'); return; }
  const btn = document.querySelector('.auth-submit');
  btn.disabled = true; btn.textContent = 'Ingresando…';
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) {
    toast('❌', error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message);
    btn.disabled = false; btn.textContent = 'Ingresar';
  } else {
    closeModal('authModal');
    toast('👋', '¡Bienvenido!');
  }
}

async function signUpWithPassword() {
  const email = document.getElementById('authEmail')?.value?.trim();
  const pass  = document.getElementById('authPass')?.value;
  if (!email || !pass) { toast('⚠️', 'Completá email y contraseña'); return; }
  if (pass.length < 6) { toast('⚠️', 'La contraseña debe tener al menos 6 caracteres'); return; }
  const btn = document.querySelector('.auth-submit');
  btn.disabled = true; btn.textContent = 'Creando cuenta…';
  const { error } = await supa.auth.signUp({
    email, password: pass,
    options: { emailRedirectTo: AUTH_REDIRECT }
  });
  if (error) {
    toast('❌', error.message);
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  } else {
    renderAuthModal('link-sent');
  }
}

async function signInWithGoogle() {
  await supa.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT }
  });
}

async function sendResetLink() {
  const email = document.getElementById('authEmail')?.value?.trim();
  if (!email) { toast('⚠️', 'Ingresá tu email'); return; }
  const btn = document.querySelector('.auth-submit');
  btn.disabled = true; btn.textContent = 'Enviando…';
  const { error } = await supa.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: AUTH_REDIRECT }
  });
  if (error) {
    toast('❌', error.message);
    btn.disabled = false; btn.textContent = 'Enviar enlace';
  } else {
    renderAuthModal('link-sent');
  }
}

async function signOut() {
  await supa.auth.signOut();
  // La limpieza de localStorage y renderCustom() la maneja onAuthStateChange(SIGNED_OUT)
  closeModal('authModal');
  toast('👋', 'Sesión cerrada. Tus configuraciones quedan guardadas en tu cuenta.');
}

// ── SYNC PRESETS ─────────────────────────────────────────
// El almacenamiento (localStorage + upsert incremental a Supabase) vive en
// src/presets-store.js (window.PresetsStore). Acá solo el pegamento con la UI.
async function fetchSupaPresets() {
  const { rows, error } = await window.PresetsStore.fetchCloud(supa);
  if (error) addLog('Error al leer presets de la nube: ' + error, 'w');
  return rows;
}

async function syncPresetsToCloud(list) {
  if (!currentUser) return;
  const { error } = await window.PresetsStore.pushToCloud(supa, currentUser.id, list);
  if (error) addLog('Error al sincronizar con la nube: ' + error, 'w');
}

function showImportDialog(localPresets, supaPresets) {
  const body = document.getElementById('importModalBody');
  const localCount = localPresets.length;
  const supaCount  = supaPresets.length;
  body.innerHTML = `
    <p class="auth-info">
      Tenés <strong>${localCount} configuración${localCount !== 1 ? 'es' : ''}</strong>
      guardada${localCount !== 1 ? 's' : ''} en este navegador.<br>
      ${supaCount > 0
        ? `Tu cuenta ya tiene <strong>${supaCount} configuración${supaCount !== 1 ? 'es' : ''}</strong>.`
        : 'Tu cuenta todavía no tiene configuraciones guardadas.'}
    </p>
    <p class="auth-info">¿Qué querés hacer con las configuraciones locales?</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn pri sm" onclick="importChoice('merge')">
        Agregar las locales a mi cuenta
      </button>
      <button class="btn ghost sm" onclick="importChoice('cloud')">
        Descartar las locales, usar solo las de mi cuenta
      </button>
    </div>`;
  openModal('importModal');
}

async function importChoice(choice) {
  closeModal('importModal');
  if (choice === 'merge') {
    // Combinar nube + local (sin duplicar por nombre). reconcileIds hace que los
    // locales que ya existen en la nube adopten su id, así el upsert no duplica.
    const localPresets = loadCustom();
    const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
    window.PresetsStore.reconcileIds(localPresets, cloudRows);
    const cloudIds = new Set(cloudRows.map(p => p.id));
    const merged   = [...cloudRows, ...localPresets.filter(p => !cloudIds.has(p.id))];
    window.PresetsStore.saveLocal(merged);
    await syncPresetsToCloud(merged);
    renderCustom();
    toast('☁️', `${merged.length} configuración${merged.length !== 1 ? 'es' : ''} en tu cuenta`);
  } else {
    // Usar solo las de la nube
    const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
    window.PresetsStore.saveLocal(cloudRows);
    renderCustom();
    toast('☁️', cloudRows.length > 0
      ? `${cloudRows.length} configuración${cloudRows.length !== 1 ? 'es' : ''} cargadas desde tu cuenta`
      : 'No tenés configuraciones guardadas en tu cuenta todavía');
  }
}

// PRODUCTS y PRESET_TABS → src/products.js (window.* vía <script type="module">)

// ── ESTADO ──────────────────────────────────────────────
let prod      = null;
let connType  = 'usb';  // 'usb' | 'ble'
let connected = false;
let osMode    = 'win'; // 'win' | 'mac' — se resuelve en init() (lee localStorage a salvo de excepciones)
let activePresetTab = null; // tabId activo en presetsModal
let _conn = null;   // handle de transporte activo { send, close } (USB o BLE) — src/transport.js
let devCfg    = mkCfg();
let capActive = null;
const capHandlers = {};
// (STORAGE_KEY y el acceso a localStorage viven en src/presets-store.js)

// PRODUCTS, PRESET_TABS, LATEST_FW, FACTORY_CMDS/CARDS, TIP_CONTENT y los mapas
// DEV_* viven en src/products.js — window.* vía el <script type="module"> de arriba.

// Resolver para la promesa de WHO
let _whoResolve = null;

function mkCfg() { return {orient:null, vel:null, acel:null, fmode:null, btns:{}}; }

// ── SELECCIÓN DE PRODUCTO ────────────────────────────────
function selectProd(id) {
  const p = PRODUCTS[id];
  if (!p) return;
  prod = p;
  document.querySelectorAll('.dev-opt:not(.disabled)').forEach(el => el.classList.remove('active'));
  const opt = document.getElementById('opt-' + id);
  if (opt) opt.classList.add('active');
  // También activar la copia en el modal de conexión
  const optM = document.getElementById('opt-' + id + '-m');
  if (optM) optM.classList.add('active');

  // Habilitar paso 2 (drawer)
  const step2 = document.getElementById('sbConnType');
  if (step2) { step2.style.opacity = ''; step2.style.pointerEvents = ''; }
  // Habilitar paso 3 (drawer)
  const step3 = document.getElementById('sbConn');
  if (step3) { step3.style.opacity = ''; step3.style.pointerEvents = ''; }
  // Habilitar pasos en connModal
  _connStepEnable(2); _connStepEnable(3);

  document.getElementById('mainTitle').textContent = p.cardTitle;

  // Layout centrado para disButton y disHub
  document.getElementById('secBtns').classList.toggle('prod-centered', !!p.centeredLayout);

  // Título y ícono de la sección flechas/externos
  const arrowTitle = document.getElementById('arrowSectionTitle');
  const arrowIcon  = document.getElementById('arrowSectionIcon');
  if (arrowTitle) arrowTitle.textContent = p.arrowSectionTitle || 'Modo de Flechas';
  if (arrowIcon)  arrowIcon.textContent  = p.arrowSectionIcon  || '⬆️';
  const arrowModeLabel = document.getElementById('arrowModeLabel');
  if (arrowModeLabel) arrowModeLabel.textContent = p.arrowSectionTitle
    ? 'Las ' + p.arrowSectionTitle.toLowerCase() + ' funcionan como:'
    : 'Las flechas funcionan como:';

  // Mostrar/ocultar sección flechas
  document.getElementById('secArrows').style.display = p.hasArrows ? '' : 'none';

  setBanner('conn');
  if (p.dishubLayout) buildDishubGrid('mainGrid', p.mainBtns);
  else buildGrid('mainGrid', p.mainBtns);
  buildGrid('arrowGrid', p.hasArrows ? p.arrowBtns : []);
  // Auto-seleccionar tab del dispositivo
  const devTab = _tabForProd(p.id);
  if (devTab) activePresetTab = devTab.tabId;
  // Si el modal está abierto, refrescar; si no, solo pre-popular la grid (para cuando abra)
  const presetsOpen = document.getElementById('presetsModal')?.style.display !== 'none';
  if (presetsOpen) renderPresetTabs();
  else buildFactoryPresets(p.presets);
  renderCustom();
  // Re-evaluar botones ahora que prod está seteado (setConnected se llamó antes que WHO)
  setSections(connected);
  addLog('Producto seleccionado: ' + p.name);
}

// ── SELECCIÓN TIPO CONEXIÓN ──────────────────────────────
function selectConnType(type) {
  if (type === 'ble' && isIOS()) return; // bloqueado en iOS
  connType = type;
  // Sincronizar en drawer
  const usbEl = document.getElementById('ct-usb');
  const bleEl = document.getElementById('ct-ble');
  if (usbEl) usbEl.classList.toggle('active', type === 'usb');
  if (bleEl) bleEl.classList.toggle('active', type === 'ble');
  const bh = document.getElementById('bleHint');
  if (bh) bh.style.display = type === 'ble' ? '' : 'none';
  // Sincronizar en modal
  const usbM = document.getElementById('ct-usb-m');
  const bleM = document.getElementById('ct-ble-m');
  if (usbM) usbM.classList.toggle('active', type === 'usb');
  if (bleM) bleM.classList.toggle('active', type === 'ble');
  const bhM = document.getElementById('bleHintM');
  if (bhM) bhM.style.display = type === 'ble' ? '' : 'none';
}

// ── MODO DE MODIFICADORES (Windows / Mac) ────────────────
// Se autodetecta al cargar (isMacOS) y se recuerda en este navegador.
// Solo afecta a presets con modificador "principal" (hoy: std_copy).
// El editor manual de botones ya expone Ctrl y GUI/⌘ por separado, sin ambigüedad —
// por eso el control de cambio vive en el panel Avanzado de cada botón, junto a esos checkboxes.
function selectOsMode(mode) {
  osMode = mode;
  try { localStorage.setItem('displus_os_mode', mode); } catch(_) {}
  // Re-etiquetar el checkbox "GUI" (mg_${code}) y la nota de modo en el panel Avanzado
  // de cada botón, y refrescar el modal de configuración si está abierto.
  document.querySelectorAll('.mod-gui-lbl').forEach(el => { el.textContent = mode === 'mac' ? '⌘ Cmd' : 'Win'; });
  document.querySelectorAll('.mod-os-name').forEach(el => { el.textContent = mode === 'mac' ? '⌘ (Mac)' : 'Ctrl (Windows)'; });
  const cfgModal = document.getElementById('cfgModal');
  if (cfgModal && cfgModal.style.display !== 'none') renderCfgModal();
}

// (primaryMod / sustitución de %P% en presets: ahora en src/protocol.js — window.Protocol.resolvePreset)

// Cambio manual desde el panel Avanzado de un botón — requiere confirmación porque
// solo corresponde si el dispositivo se va a usar en una computadora con otro SO
// distinto al que se está usando ahora mismo para configurarlo.
function confirmToggleOsMode(e) {
  if (e) e.preventDefault();
  const next = osMode === 'mac' ? 'win' : 'mac';
  const nextLbl = next === 'mac' ? 'Mac (⌘)' : 'Windows (Ctrl)';
  const ok = confirm(
    'Esto va a hacer que los atajos con modificador principal (Copiar/Pegar) usen ' + nextLbl + '.\n\n' +
    'Cambiá esto SOLO si vas a usar el dispositivo en una computadora con un sistema operativo ' +
    'distinto al que estás usando ahora para configurarlo. Si es la misma computadora, dejalo como está.'
  );
  if (ok) selectOsMode(next);
}

// ── BANNER ───────────────────────────────────────────────
function setBanner(state) {
  // Banner eliminado — la status bar y el drawer comunican el estado
}

// ── HABILITAR / DESHABILITAR ─────────────────────────────
function setSections(on) {
  ['secBtns'].forEach(id =>
    document.getElementById(id).classList.toggle('sec-off', !on));
  // secArrows solo se habilita si el producto tiene flechas
  if (prod && prod.hasArrows)
    document.getElementById('secArrows').classList.toggle('sec-off', !on);
  const btnSave = document.getElementById('btnSave');
  if (btnSave) btnSave.disabled = !on;
  const btnReset = document.getElementById('btnReset');
  if (btnReset) btnReset.disabled = !on;
  document.getElementById('btnSaveCustom').disabled = !on;
  document.getElementById('connSub').style.display  = on ? 'flex' : 'none';
  const logInput = document.getElementById('logCmdInput');
  const btnLogSend = document.getElementById('btnLogSend');
  if (logInput)   logInput.disabled   = !on;
  if (btnLogSend) btnLogSend.disabled = !on;
  // Botones del menú lateral
  const drwCfg     = document.getElementById('drwBtnCfg');
  const drwReset   = document.getElementById('drwBtnReset');
  // Solo habilitar si hay conexión Y producto reconocido
  if (drwCfg)   drwCfg.disabled   = !on || !prod;
  if (drwReset) drwReset.disabled = !on || !prod;
}

// ── GRILLAS ───────────────────────────────────────────────
function buildDishubGrid(containerId, buttons) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  c.classList.add('dishub-grid');

  // Row A: BR y BA
  const rowA = document.createElement('div');
  rowA.className = 'dishub-row dishub-row-a';
  buttons.filter(b => b.group === 'A').forEach(b => rowA.appendChild(mkCard(b.code, b.label, b.color, b.note)));
  c.appendChild(rowA);

  // Sección conectores centrales
  if (prod && prod.hasCenterConnectors) c.appendChild(buildDishubCenterSection());

  // Row B: BN + conectores centrales (ocultos por defecto) + BC
  const rowB = document.createElement('div');
  rowB.id = 'dishubRowB';
  rowB.className = 'dishub-row dishub-row-b';
  const bBtns = buttons.filter(b => b.group === 'B');
  const bn = bBtns.find(b => b.code === 'BN');
  const bc = bBtns.find(b => b.code === 'BC');
  if (bn) rowB.appendChild(mkCard(bn.code, bn.label, bn.color, bn.note));
  if (prod && prod.centerBtns) {
    const centerWrap = document.createElement('div');
    centerWrap.id = 'dishubCenterCards';
    centerWrap.className = 'dishub-center-cards';
    prod.centerBtns.forEach(b => centerWrap.appendChild(mkCard(b.code, b.label, b.color, b.note)));
    rowB.appendChild(centerWrap);
  }
  if (bc) rowB.appendChild(mkCard(bc.code, bc.label, bc.color, bc.note));
  c.appendChild(rowB);
}

function buildDishubCenterSection() {
  const sec = document.createElement('div');
  sec.id = 'dishubCenterSec';
  sec.className = 'dishub-center-sec';
  sec.innerHTML = `
    <div class="arrow-row">
      <div class="arrow-sel">
        <div class="field" style="margin:0">
          <label class="lbl">Los conectores centrales funcionan como:</label>
          <select id="dishubCenterMode" onchange="onDishubCenterMode()">
            <option value="1">Mover el cursor del mouse</option>
            <option value="2">Teclas de flecha del teclado (↑↓←→)</option>
            <option value="0">Acción individual por cada conector</option>
          </select>
        </div>
      </div>
      <div class="arrow-panel">
        <div class="arrow-div"></div>
        <div class="arrow-body">
          <div class="two-col" style="margin-bottom:9px">
            <div class="field" style="margin:0">
              <label class="lbl">Orientación</label>
              <select id="dishubOrient">
                <option value="0">Normal (0°)</option>
                <option value="1">Girado derecha (90°)</option>
                <option value="2">Girado izquierda (-90°)</option>
                <option value="3">Invertido (180°)</option>
              </select>
            </div>
            <div class="field" style="margin:0" id="dishubVelWrap">
              <label class="lbl">Velocidad del cursor</label>
              <input type="number" id="dishubVel" min="1" max="50" value="25">
            </div>
          </div>
          <div class="field" style="margin:0 0 9px" id="dishubAcelWrap">
            <label class="tog-row">
              <span class="tog">
                <input type="checkbox" id="dishubAcel">
                <span class="tog-track"></span>
                <span class="tog-thumb"></span>
              </span>
              <span class="tog-lbl">Aceleración gradual</span>
            </label>
            <div class="hint">El cursor acelera al mantener el conector presionado.</div>
          </div>
          <button class="btn suc sm" onclick="applyDishubCenter()">Aplicar</button>
        </div>
      </div>
    </div>`;
  return sec;
}

function buildGrid(containerId, buttons) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  c.classList.remove('dishub-grid');
  buttons.forEach(b => c.appendChild(mkCard(b.code, b.label, b.color, b.note)));
}

function mkCard(code, label, color, note) {
  const d = document.createElement('div');
  d.className = 'btn-card'; d.id = 'card-' + code;
  d.innerHTML = `
    <div class="btn-main">
      <div class="btn-card-head">
        <div class="btn-dot" style="background:${color}"></div>
        <div class="btn-card-title">${label}${note ? `<span class="btn-card-note">${note}</span>` : ''}</div>
        <div class="btn-summary" id="sum_${code}">—</div>
      </div>
      <div class="btn-fields">
        <div class="field" style="margin:0">
          <label class="lbl">Funciona como</label>
          <select id="t_${code}" onchange="onType('${code}')">
            <option value="K">Teclado</option>
            <option value="M">Mouse</option>
            <option value="X">Desactivado</option>
          </select>
        </div>
        <div id="act_${code}">
          <div id="kb_${code}">
            <div class="field" style="margin:0">
              <label class="lbl">Tecla</label>
              ${isTouchDevice()
                ? `<input type="text" id="k_${code}" placeholder="Tocá y escribí la tecla" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                    oninput="captureFromInput('${code}', event)">`
                : `<input type="text" id="k_${code}" placeholder="Clic aquí y presione la tecla" readonly style="cursor:pointer"
                    onfocus="startCap('${code}')" onblur="stopCap('${code}')">`}
              <div class="hint" id="kh_${code}">Dejar vacío = solo modificadores.</div>
              ${isTouchDevice() ? `<div class="key-chips">${SPECIAL_KEY_CHIPS.map(k =>
                `<button type="button" class="key-chip" onclick="setCapturedKey('${code}','${k.name}')">${k.label}</button>`
              ).join('')}</div>` : ''}
            </div>
          </div>
          <div id="mo_${code}" style="display:none">
            <div class="field" style="margin:0">
              <label class="lbl">Acción del mouse</label>
              <select id="mact_${code}">
                <option value="1">Clic izquierdo</option>
                <option value="1D">Doble clic izquierdo</option>
                <option value="1M">Mantener clic izquierdo (toggle)</option>
                <option value="2">Clic derecho</option>
                <option value="4">Clic central</option>
                <option value="SU">Scroll ↑</option>
                <option value="SD">Scroll ↓</option>
              </select>
            </div>
          </div>
        </div>
        <button class="btn-adv-toggle" id="advtog_${code}" onclick="toggleAdv('${code}')">Avanzado</button>
      </div>
      <div class="btn-apply-wrap"><button class="btn suc sm" onclick="applyBtn('${code}')">Aplicar</button></div>
    </div>
    <div class="btn-adv" id="adv_${code}">
      <div class="field" style="margin:0">
        <label class="lbl">Se activa</label>
        <select id="m_${code}">
          <option value="P">Al presionar</option>
          <option value="R">Al soltar</option>
          <option value="H">Pulsación larga (1 seg)</option>
          <option value="O">Una vez por pulsación</option>
        </select>
      </div>
      <div class="field" style="margin:0">
        <label class="lbl">Debounce (ms)</label>
        <input type="number" id="d_${code}" min="0" max="5000" value="0" step="50">
      </div>
      <div id="kb_mods_${code}">
        <div class="field" style="margin:0">
          <label class="lbl">Modificadores</label>
          <div class="mods-grid">
            <label class="mod-cb"><input type="checkbox" id="mc_${code}"><span>Ctrl</span></label>
            <label class="mod-cb"><input type="checkbox" id="ms_${code}"><span>Shift</span></label>
            <label class="mod-cb"><input type="checkbox" id="ma_${code}"><span>Alt</span></label>
            <label class="mod-cb"><input type="checkbox" id="mg_${code}"><span class="mod-gui-lbl">${osMode === 'mac' ? '⌘ Cmd' : 'Win'}</span></label>
          </div>
          <div class="hint mod-os-row">
            <span class="mod-os-txt">Los atajos con modificador principal (Copiar/Pegar) usan <b class="mod-os-name">${osMode === 'mac' ? '⌘ (Mac)' : 'Ctrl (Windows)'}</b>, detectado automáticamente.</span>
            <a href="#" class="mod-os-link" onclick="confirmToggleOsMode(event)">Cambiar</a>
          </div>
        </div>
      </div>
    </div>`;
  return d;
}

function toggleAdv(code) {
  const adv = document.getElementById('adv_' + code);
  const tog = document.getElementById('advtog_' + code);
  if (!adv) return;
  const open = adv.classList.toggle('open');
  tog.classList.toggle('open', open);
}

function updateSummary(code) {
  const el = document.getElementById('sum_' + code);
  if (!el) return;
  const t = document.getElementById('t_' + code)?.value;
  if (t === 'X') { el.textContent = 'Desactivado'; return; }
  if (t === 'M') {
    const txt = document.getElementById('mact_' + code)?.selectedOptions[0]?.text || '';
    el.textContent = txt;
    return;
  }
  const k = document.getElementById('k_' + code)?.value || '';
  const mods = ['mc','ms','ma','mg'].filter(p => document.getElementById(p+'_'+code)?.checked)
    .map(p => ({mc:'Ctrl',ms:'Shift',ma:'Alt',mg:osMode==='mac'?'⌘':'Win'}[p]));
  const parts = [...mods, k].filter(Boolean);
  el.textContent = parts.length ? parts.join('+') : 'sin tecla';
}

function onType(code) {
  const t = document.getElementById('t_' + code).value;
  document.getElementById('act_' + code).style.display = t === 'X' ? 'none' : '';
  if (t !== 'X') {
    document.getElementById('kb_' + code).style.display = t === 'K' ? '' : 'none';
    document.getElementById('mo_' + code).style.display = t === 'M' ? '' : 'none';
    const mods = document.getElementById('kb_mods_' + code);
    if (mods) mods.style.display = t === 'K' ? '' : 'none';
  }
}

// ── CAPTURA DE TECLAS ────────────────────────────────────
const SKEYS = {
  ' ':'SPACE','Enter':'ENTER','Tab':'TAB','Escape':'ESC',
  'Backspace':'BACKSPACE','Delete':'DELETE','Insert':'INSERT',
  'Home':'HOME','End':'END','PageUp':'PAGE_UP','PageDown':'PAGE_DOWN',
  'ArrowUp':'UP_ARROW','ArrowDown':'DOWN_ARROW',
  'ArrowLeft':'LEFT_ARROW','ArrowRight':'RIGHT_ARROW',
  'F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6',
  'F7':'F7','F8':'F8','F9':'F9','F10':'F10','F11':'F11','F12':'F12',
};

// Chips de teclas especiales para mobile/touch: el teclado en pantalla no tiene
// flechas, F1-F12, Esc, etc. — y tampoco dispara keydown de forma confiable.
const SPECIAL_KEY_CHIPS = [
  {name:'SPACE',label:'Espacio'}, {name:'ENTER',label:'Enter'}, {name:'TAB',label:'Tab'},
  {name:'ESC',label:'Esc'}, {name:'BACKSPACE',label:'⌫'}, {name:'DELETE',label:'Del'},
  {name:'UP_ARROW',label:'↑'}, {name:'DOWN_ARROW',label:'↓'}, {name:'LEFT_ARROW',label:'←'}, {name:'RIGHT_ARROW',label:'→'},
  {name:'HOME',label:'Home'}, {name:'END',label:'End'},
  {name:'F1',label:'F1'}, {name:'F2',label:'F2'}, {name:'F3',label:'F3'}, {name:'F4',label:'F4'},
];

// Fija el valor capturado en el input y muestra la confirmación — usado tanto por
// captura de teclado físico (desktop) como por los chips y el input táctil (mobile).
function setCapturedKey(code, name) {
  const inp = document.getElementById('k_' + code);
  const hint = document.getElementById('kh_' + code);
  if (!inp || !hint) return;
  inp.value = name;
  inp.classList.remove('cap-on');
  hint.textContent = '✓ "' + name + '" capturada'; hint.className = 'hint ok';
  setTimeout(() => { hint.textContent = 'Dejar vacío = solo modificadores.'; hint.className = 'hint'; }, 2200);
}

// Captura en mobile: el teclado en pantalla dispara "input", no "keydown" de forma
// confiable. Nos quedamos con el último carácter tipeado (así solo queda 1).
function captureFromInput(code, e) {
  const raw = e.target.value;
  if (!raw) return; // el usuario borró el campo — queda vacío = solo modificadores
  setCapturedKey(code, raw.slice(-1).toLowerCase());
}

function startCap(code) {
  // Cancelar cualquier captura activa anterior
  if (capActive && capActive !== code) stopCap(capActive);
  capActive = code;
  const inp = document.getElementById('k_' + code);
  const hint = document.getElementById('kh_' + code);
  inp.classList.add('cap-on');
  hint.textContent = '⌨️ Presione la tecla…'; hint.className = 'hint cap';
  // Remover handler anterior si existía, para evitar duplicados
  if (capHandlers[code]) {
    document.removeEventListener('keydown', capHandlers[code], true);
  }
  capHandlers[code] = e => {
    if (capActive !== code) return;
    if (['Control','Shift','Alt','Meta'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const name = SKEYS[e.key] ?? (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    setCapturedKey(code, name);
    capActive = null;
  };
  document.addEventListener('keydown', capHandlers[code], true);
}

function stopCap(code) {
  if (capActive !== code) return;
  capActive = null;
  const inp = document.getElementById('k_' + code);
  const hint = document.getElementById('kh_' + code);
  inp.classList.remove('cap-on');
  if (hint.classList.contains('cap')) { hint.textContent = 'Dejar vacío = solo modificadores.'; hint.className = 'hint'; }
}

// ── APLICAR BOTÓN ────────────────────────────────────────
// El armado del comando CFG: vive en src/protocol.js (window.Protocol), testeado
// en tests/protocol.test.js. Acá solo se leen los valores del DOM.
async function applyBtn(code) {
  const el = id => document.getElementById(id);
  const tipo = el('t_' + code).value;
  const cmd = window.Protocol.buildButtonCfg({
    code,
    tipo,
    modo:        el('m_' + code).value,
    debounce:    el('d_' + code).value,
    mouseAction: el('mact_' + code)?.value,
    key:         el('k_' + code)?.value,
    ctrl:        el('mc_' + code)?.checked,
    shift:       el('ms_' + code)?.checked,
    alt:         el('ma_' + code)?.checked,
    gui:         el('mg_' + code)?.checked,
  });
  const ok = await send(cmd);
  if (ok) { toast('✅', code + ' configurado'); updateSummary(code); }
}

// ── MODO DE FLECHAS ──────────────────────────────────────
function onArrowMode() {
  const m = parseInt(document.getElementById('arrowMode').value);
  const showCursorCfg = (m === 0 || m === 1);
  document.getElementById('velWrap').style.display  = showCursorCfg ? '' : 'none';
  document.getElementById('acelWrap').style.display = showCursorCfg ? '' : 'none';
  document.getElementById('arrowInd').style.display = m === 0 ? '' : 'none';
}

async function applyArrows() {
  const el = id => document.getElementById(id);
  const cmds = window.Protocol.buildArrowCommands({
    fmode:  el('arrowMode').value,
    orient: el('orient').value,
    vel:    el('vel').value,
    acel:   el('acel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Flechas configuradas');
}

function onDishubCenterMode() {
  const m = parseInt(document.getElementById('dishubCenterMode').value);
  const showCursorCfg = (m === 0 || m === 1);
  const el = id => document.getElementById(id);
  if (el('dishubVelWrap'))  el('dishubVelWrap').style.display  = showCursorCfg ? '' : 'none';
  if (el('dishubAcelWrap')) el('dishubAcelWrap').style.display = showCursorCfg ? '' : 'none';
  const centerWrap = document.getElementById('dishubCenterCards');
  if (centerWrap) centerWrap.classList.toggle('open', m === 0);
}

async function applyDishubCenter() {
  const el = id => document.getElementById(id);
  const cmds = window.Protocol.buildArrowCommands({
    fmode:  el('dishubCenterMode').value,
    orient: el('dishubOrient').value,
    vel:    el('dishubVel').value,
    acel:   el('dishubAcel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Conectores centrales configurados');
}

// ── PRESETS DE FÁBRICA ───────────────────────────────────
// FACTORY_CMDS, FACTORY_CARDS, TIP_CONTENT → src/products.js (window.*)

// ── TABS DE DISPOSITIVO EN MODAL PRESETS ────────────────
function _tabForProd(prodId) {
  return PRESET_TABS.find(t => t.prodIds.includes(prodId)) || null;
}

function renderPresetTabs() {
  const container = document.getElementById('presetTabs');
  if (!container) return;
  const devTab = prod ? _tabForProd(prod.id) : null;
  // Fallback solo si no hay tab activa todavía
  if (!activePresetTab) {
    activePresetTab = devTab ? devTab.tabId : PRESET_TABS[0].tabId;
  }
  container.innerHTML = '';
  PRESET_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'preset-tab' +
      (tab.tabId === activePresetTab ? ' active' : '') +
      (devTab && tab.tabId === devTab.tabId ? ' dev-match' : '');
    btn.textContent = tab.label;
    if (devTab && tab.tabId === devTab.tabId) btn.title = 'Dispositivo conectado';
    btn.onclick = () => switchPresetTab(tab.tabId);
    container.appendChild(btn);
  });
  if (devTab) {
    const hint = document.createElement('span');
    hint.className = 'preset-tab-hint';
    hint.textContent = '● Presets EpE visibles solo para ' + devTab.label + ' (dispositivo conectado)';
    container.appendChild(hint);
  }
  // Renderizar contenido para el tab activo
  _refreshPresetContent();
}

function switchPresetTab(tabId) {
  activePresetTab = tabId;
  renderPresetTabs();
}

function _refreshPresetContent() {
  const tab = PRESET_TABS.find(t => t.tabId === activePresetTab);
  if (!tab) return;
  // Factory presets: unir presets de todos los productos del grupo
  const factoryIds = [...new Set(tab.prodIds.flatMap(pid => PRODUCTS[pid]?.presets || []))];
  _buildFactoryPresetsRaw(factoryIds);
  renderCustom();
  if (currentUser) loadSharedPresets();
}

function _buildFactoryPresetsRaw(ids) {
  const grid    = document.getElementById('factoryGrid');
  const section = grid ? grid.closest('.presets-modal-section') : null;
  if (!grid) return;
  grid.innerHTML = '';
  // Filtrar solo IDs con FACTORY_CARDS definido
  const validIds = ids.filter(id => !!FACTORY_CARDS[id]);
  // Si hay dispositivo conectado y la tab activa no es la suya, ocultar Presets EpE
  const devTab2    = prod ? _tabForProd(prod.id) : null;
  const activeTab2 = PRESET_TABS.find(t => t.tabId === activePresetTab);
  if (connected && devTab2 && activeTab2 && devTab2.tabId !== activeTab2.tabId) {
    if (section) section.style.display = 'none';
    return;
  }
  if (!validIds.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  const devTab    = prod ? _tabForProd(prod.id) : null;
  const activeTab = PRESET_TABS.find(t => t.tabId === activePresetTab);
  const canApply  = !connected || (devTab && activeTab && devTab.tabId === activeTab.tabId);
  validIds.forEach(id => {
    const c = FACTORY_CARDS[id];
    const div = document.createElement('div');
    div.className = 'preset-card' + (canApply ? '' : ' preset-locked');
    div.setAttribute('data-tip-id', c.tipId);
    div.innerHTML = `<span class="preset-icon">${c.icon}</span><span class="preset-name">${c.name}</span><span class="preset-sub">${c.sub}</span>`;
    div.addEventListener('click', () => applyPreset(id));
    grid.appendChild(div);
  });
  initPresetTooltips();
}

function buildFactoryPresets(ids) {
  // Mantener compatibilidad: si el modal no está abierto, solo guardar para cuando abra
  _buildFactoryPresetsRaw(ids);
}

async function applyPreset(id) {
  const cmds = FACTORY_CMDS[id]; if (!cmds) return;
  if (!connected) { openModal('noDeviceModal'); return; }
  // Validar que el preset es compatible con el dispositivo conectado
  const devTab = prod ? _tabForProd(prod.id) : null;
  const activeTab = PRESET_TABS.find(t => t.tabId === activePresetTab);
  if (devTab && activeTab && devTab.tabId !== activeTab.tabId) {
    toast('⚠️', 'Este preset es para ' + activeTab.label + ', pero tenés conectado un ' + prod.name);
    return;
  }
  for (const c of window.Protocol.resolvePreset(cmds, osMode)) await send(c);
  toast('⚡', 'Configuración aplicada');
  closeModal('presetsModal');
}

// ── CUSTOM PRESETS ───────────────────────────────────────
function loadCustom() {
  return window.PresetsStore.loadLocal();
}
function saveCustomList(list) {
  window.PresetsStore.saveLocal(list);
  syncPresetsToCloud(list); // sync en background, sin bloquear UI (no-op si no hay sesión)
}

function renderCustom() {
  const all  = loadCustom();
  const tab  = PRESET_TABS.find(t => t.tabId === activePresetTab);
  const list = tab
    ? all.filter(p => !p.prodId || tab.prodIds.includes(p.prodId))
    : all;
  const grid = document.getElementById('customGrid');
  const none = document.getElementById('noCustom');
  if (!grid) return;
  grid.innerHTML = '';
  if (!list.length) {
    none.style.display = 'block';
    none.textContent   = tab
      ? 'No hay configuraciones guardadas para ' + tab.label + '.'
      : 'Conectá un dispositivo para ver tus configuraciones.';
    return;
  }
  none.style.display = 'none';
  list.forEach((p) => {
    const realIdx   = all.indexOf(p);
    const prodLabel = PRODUCTS[p.prodId] ? PRODUCTS[p.prodId].name : '';
    const k         = _reg(p);
    const card      = document.createElement('div');
    card.className  = 'custom-card';
    card.innerHTML  = `
      <button class="custom-del" title="Eliminar" onclick="delCustom(${realIdx},event)">✕</button>
      <div class="custom-name">⭐ ${esc(p.name)}</div>
      <div class="custom-date">${p.date}${prodLabel ? ' · ' + prodLabel : ''}</div>
      ${p.notes ? `<div class="custom-notes">${esc(p.notes)}</div>` : ''}
      <div class="custom-actions" onclick="event.stopPropagation()">
        <button class="btn pri sm"   onclick="applyCustom(_PR['${k}'])">Aplicar</button>
        <button class="btn ghost sm" onclick="openEditPreset(${realIdx})">✏️ Editar</button>
        <button class="btn ghost sm" onclick="openShareModal(_PR['${k}'])">↗ Compartir</button>
        <button class="btn ghost sm" onclick="downloadCSV(_PR['${k}'])">⬇ CSV</button>
      </div>`;
    grid.appendChild(card);
  });
}

// ── REGISTRO DE PRESETS (evita JSON inline en onclick) ───
const _PR = {}; // id → preset object
let   _prIdx = 0;
function _reg(p) { const k = 'p' + (_prIdx++); _PR[k] = p; return k; }

// ── COMPARTIR / CSV ──────────────────────────────────────

let _sharePreset = null;

function openShareModal(p) {
  _sharePreset = p;
  document.getElementById('sharePresetName').textContent = _sharePreset.name;
  document.getElementById('shareEmail').value = '';
  const msg = document.getElementById('shareMsg');
  msg.style.display = 'none'; msg.textContent = '';
  openModal('shareModal');
}

async function shareWithUser() {
  if (!currentUser) { toast('⚠️','Necesitás estar logueado para compartir'); return; }
  const email = document.getElementById('shareEmail').value.trim().toLowerCase();
  if (!email) { document.getElementById('shareEmail').focus(); return; }
  if (email === currentUser.email) { showShareMsg('No podés compartir contigo mismo.', 'warn'); return; }

  // Buscar recipient_id via función RPC (ver instrucciones en README)
  const { data, error: ue } = await supa.rpc('get_user_id_by_email', { p_email: email });
  if (ue || !data) {
    showShareMsg('❌ No encontramos ninguna cuenta con ese email. <button class="btn ghost sm" style="margin-top:6px" onclick="downloadCSV(JSON.stringify(_sharePreset))">⬇ Descargar CSV</button>', 'warn');
    return;
  }

  const { error } = await supa.from('shared_presets').insert({
    recipient_id: data,
    sender_email: currentUser.email,
    sender_name:  currentUser.user_metadata?.full_name || currentUser.email,
    name:         _sharePreset.name,
    date:         _sharePreset.date,
    prod_id:      _sharePreset.prodId || null,
    cfg:          _sharePreset.cfg,
    notes:        _sharePreset.notes || null,
    is_community: false
  });
  if (error) { showShareMsg('Error al enviar: ' + error.message, 'error'); return; }
  showShareMsg('✅ ¡Enviado! El usuario verá el preset la próxima vez que abra sus configuraciones.', 'ok');
  setTimeout(() => closeModal('shareModal'), 2000);
}

async function shareWithCommunity() {
  if (!currentUser) { toast('⚠️','Necesitás estar logueado para compartir'); return; }
  if (!confirm('¿Querés compartir "' + _sharePreset.name + '" con toda la comunidad? Será visible para todos los usuarios.')) return;
  const { error } = await supa.from('shared_presets').insert({
    recipient_id: null,
    sender_email: currentUser.email,
    sender_name:  currentUser.user_metadata?.full_name || currentUser.email,
    name:         _sharePreset.name,
    date:         _sharePreset.date,
    prod_id:      _sharePreset.prodId || null,
    cfg:          _sharePreset.cfg,
    notes:        _sharePreset.notes || null,
    is_community: true
  });
  if (error) { showShareMsg('Error: ' + error.message, 'error'); return; }
  showShareMsg('✅ ¡Compartido con la comunidad!', 'ok');
  setTimeout(() => closeModal('shareModal'), 1800);
}

function showShareMsg(html, type) {
  const el = document.getElementById('shareMsg');
  el.innerHTML = html;
  el.style.display = 'block';
  el.style.color = type === 'ok' ? 'var(--grn)' : type === 'warn' ? 'var(--acc)' : 'var(--red)';
}

// Serialización/parseo CSV: src/csv.js (window.Csv). Acá solo el <a download> y el <input file>.
function downloadCSV(p) {
  const csv = window.Csv.presetToCsv(p);
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = (p.name || 'preset').replace(/[^a-z0-9]/gi,'_') + '.csv';
  a.click();
}

function importCSV() {
  const inp = document.createElement('input');
  inp.type  = 'file'; inp.accept = '.csv';
  inp.onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const { presets, error } = window.Csv.parsePresetsCsv(await file.text());
    if (error) { toast('⚠️', error); return; }
    const existing = loadCustom();
    const names = new Set(existing.map(p => p.name));
    let added = 0;
    for (const p of presets) {
      if (names.has(p.name)) continue;   // no duplicar por nombre
      existing.push(p); names.add(p.name); added++;
    }
    saveCustomList(existing);
    renderCustom();
    toast('⬆️', added + ' configuración' + (added !== 1 ? 'es' : '') + ' importada' + (added !== 1 ? 's' : ''));
  };
  inp.click();
}

// ── PRESETS COMPARTIDOS Y COMUNIDAD ─────────────────────

async function loadSharedPresets() {
  if (!currentUser) return;
  const { data, error } = await supa.from('shared_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { addLog('Error al cargar compartidos: ' + error.message, 'w'); return; }

  const mine      = (data || []).filter(p => p.recipient_id === currentUser.id && !p.is_community);
  const community = (data || []).filter(p => p.is_community);

  renderSharedGrid('sharedGrid',    'sectionShared',    mine,      false);
  renderSharedGrid('communityGrid', 'sectionCommunity', community, true);
}

function renderSharedGrid(gridId, sectionId, list, isCommunity) {
  const section = document.getElementById(sectionId);
  const grid    = document.getElementById(gridId);
  // Filtrar por tab activa
  const tab = PRESET_TABS.find(t => t.tabId === activePresetTab);
  const items = tab ? list.filter(p => !p.prod_id || tab.prodIds.includes(p.prod_id)) : list;
  if (!items.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = '';
  const myEmail = currentUser?.email || '';
  items.forEach(p => {
    const prodLabel = PRODUCTS[p.prod_id] ? PRODUCTS[p.prod_id].name : '';
    const mapped    = { name: p.name, date: p.date, prodId: p.prod_id, cfg: p.cfg, notes: p.notes };
    const k         = _reg(mapped);
    const canDel    = !isCommunity || p.sender_email === myEmail;
    const card      = document.createElement('div');
    card.className  = 'custom-card ' + (isCommunity ? 'community' : 'shared');
    card.innerHTML  = `
      ${canDel ? `<button class="custom-del" title="Eliminar" onclick="delShared('${p.id}',${isCommunity},event)">✕</button>` : ''}
      <div class="custom-name">${isCommunity ? '🌐' : '📨'} ${esc(p.name)}</div>
      <div class="custom-date">${p.date||''}${prodLabel ? ' · ' + prodLabel : ''}</div>
      <div class="custom-sender">Por: ${esc(p.sender_name || p.sender_email)}</div>
      ${p.notes ? `<div class="custom-notes">${esc(p.notes)}</div>` : ''}
      <div class="custom-actions" onclick="event.stopPropagation()">
        <button class="btn pri sm"   onclick="applyCustom(_PR['${k}'])">Aplicar</button>
        <button class="btn ghost sm" onclick="saveSharedAsOwn(_PR['${k}'])">💾 Guardar</button>
        <button class="btn ghost sm" onclick="openShareModal(_PR['${k}'])">↗ Reenviar</button>
        <button class="btn ghost sm" onclick="downloadCSV(_PR['${k}'])">⬇ CSV</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function delShared(id, isCommunity, e) {
  e.stopPropagation();
  const msg = isCommunity
    ? '¿Eliminar este preset? La comunidad ya no podrá verlo.'
    : '¿Eliminar este preset compartido?';
  if (!confirm(msg)) return;
  const { error } = await supa.from('shared_presets').delete().eq('id', id);
  if (error) { addLog('Error al eliminar shared preset: ' + error.message, 'w'); toast('⚠️', 'No se pudo eliminar: ' + error.message); return; }
  toast('🗑️', 'Preset eliminado');
  loadSharedPresets();
}

function saveSharedAsOwn(p) {
  const list = loadCustom();
  if (list.find(x => x.name === p.name)) { toast('⚠️', 'Ya tenés una configuración con ese nombre'); return; }
  list.push({ name: p.name, date: p.date || new Date().toLocaleDateString('es-AR'), prodId: p.prodId||null, cfg: p.cfg, notes: p.notes||'' });
  saveCustomList(list);
  renderCustom();
  toast('⭐', '"' + p.name + '" guardada en tus configuraciones');
}

let _editIdx = null;

function openEditPreset(idx) {
  const list = loadCustom();
  const p    = list[idx]; if (!p) return;
  _editIdx   = idx;
  document.getElementById('editPresetName').value  = p.name  || '';
  document.getElementById('editPresetNotes').value = p.notes || '';
  document.getElementById('editNotesCount').textContent = (p.notes || '').length + ' / 300';
  document.getElementById('editPresetNotes').oninput = function() {
    document.getElementById('editNotesCount').textContent = this.value.length + ' / 300';
  };
  openModal('editPresetModal');
  setTimeout(() => document.getElementById('editPresetName').focus(), 100);
}

function confirmEditPreset() {
  const name  = document.getElementById('editPresetName').value.trim();
  const notes = document.getElementById('editPresetNotes').value.trim();
  if (!name) { document.getElementById('editPresetName').focus(); return; }
  const list  = loadCustom();
  if (!list[_editIdx]) return;
  list[_editIdx].name  = name;
  list[_editIdx].notes = notes;
  saveCustomList(list);
  renderCustom();
  closeModal('editPresetModal');
  toast('✏️', '"' + name + '" actualizada');
}

function openSaveModal() {
  document.getElementById('customName').value = '';
  document.getElementById('customNotes').value = '';
  document.getElementById('notesCount').textContent = '0 / 300';
  openModal('saveModal');
  setTimeout(() => document.getElementById('customName').focus(), 100);
  document.getElementById('customNotes').oninput = function() {
    document.getElementById('notesCount').textContent = this.value.length + ' / 300';
  };
}

async function confirmSave() {
  const name  = document.getElementById('customName').value.trim();
  const notes = document.getElementById('customNotes').value.trim();
  if (!name) { document.getElementById('customName').focus(); return; }
  devCfg = mkCfg();
  await send('GETALL');
  await new Promise(r => setTimeout(r, 2400));
  const list = loadCustom();
  list.push({ name, date: new Date().toLocaleDateString('es-AR'), prodId: prod ? prod.id : null, cfg: JSON.parse(JSON.stringify(devCfg)), notes });
  saveCustomList(list);
  renderCustom();
  closeModal('saveModal');
  toast('💾', '"' + name + '" guardada');
}

async function applyCustom(p) {
  if (!connected) { openModal('noDeviceModal'); return; }
  // Validar compatibilidad con dispositivo conectado
  if (p.prodId && prod) {
    const presetTab = _tabForProd(p.prodId);
    const devTab    = _tabForProd(prod.id);
    if (presetTab && devTab && presetTab.tabId !== devTab.tabId) {
      toast('⚠️', 'Este preset es para ' + (PRODUCTS[p.prodId]?.name || p.prodId) + ', pero tenés conectado un ' + prod.name);
      return;
    }
  }
  const cfg = p.cfg; if (!cfg) return;
  // Traducción cfg → comandos: src/protocol.js (window.Protocol.cfgToCommands), testeado.
  for (const c of window.Protocol.cfgToCommands(cfg)) await send(c);
  toast('⭐', '"' + p.name + '" aplicada');
  closeModal('presetsModal');
}

function delCustom(idx, e) {
  e.stopPropagation();
  const list = loadCustom();
  if (!confirm('¿Eliminar "' + (list[idx]?.name||'') + '"?')) return;
  list.splice(idx,1); saveCustomList(list); renderCustom();
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── GUARDAR / RESET / PING ───────────────────────────────
async function saveConfig()  { if (await send('SAVE')) toast('💾','Guardado en dispositivo'); }
async function resetDevice() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  if (await send('RESET')) toast('🔄','Valores restaurados');
}
async function pingDevice() { if (await send('PING')) toast('✅','El dispositivo responde'); }

// ── GETALL + PARSE ───────────────────────────────────────
async function getAllConfig() {
  devCfg = mkCfg(); await send('GETALL'); setTimeout(applyDevCfgToCards, 2400);
}

function parseLine(line) {
  if (!window.Protocol) return; // el módulo de protocolo aún no cargó (o falló el import)
  const who = window.Protocol.parseWho(line);
  if (who) {
    if (_whoResolve) { _whoResolve(who); _whoResolve = null; }
    return;
  }
  window.Protocol.parseDeviceLine(line, devCfg); // vuelca ORIENT/VEL/ACEL/FMODE/BTN en devCfg
}

// ── MODAL DE BIENVENIDA AL DISPOSITIVO ──────────────────
// DEV_IMAGES, DEV_WELCOME, WHO_TO_PROD (mapas de nombre WHO) → src/products.js

function updateStatusBar(model, version) {
  const key     = model ? model.toLowerCase().replace(/[\s]/g,'') : '';
  const imgSrc  = DEV_IMAGES[key] || '';
  const sbImg   = document.getElementById('sbDevImg');
  const sbName  = document.getElementById('sbDevName');
  const sbVer   = document.getElementById('sbFwVersion');
  const sbBadge = document.getElementById('sbConnType2');
  if (sbImg)  { sbImg.src = imgSrc; sbImg.style.display = imgSrc ? '' : 'none'; }
  if (sbName) sbName.textContent = model ? '¡Hola, ' + model + '!' : '';
  if (sbVer)  sbVer.textContent  = version || '';
  if (sbBadge) sbBadge.textContent = connType.toUpperCase();
}

function showWelcomeDev(model, version) {
  const key  = model.toLowerCase().replace(/[\s]/g,'');
  const img  = document.getElementById('welcomeDevImg');
  const ttl  = document.getElementById('welcomeDevTitle');
  const ver  = document.getElementById('welcomeDevVersion');
  if (img) {
    img.style.animation = 'none';
    img.src = DEV_IMAGES[key] || '';
    requestAnimationFrame(() => { img.style.animation = ''; });
  }
  if (ttl) ttl.textContent = DEV_WELCOME[key] || '¡Hola, ' + model + '!';
  if (ver) ver.textContent = version ? 'Firmware ' + version : '';
  // Actualizar status bar también
  updateStatusBar(model, version);
  openModal('welcomeDevModal');
  setTimeout(() => closeModal('welcomeDevModal'), 2500);
}

// ── POST-CONEXIÓN: WHO → selección automática → GETALL ──
async function postConnect() {
  // Enviar WHO y esperar respuesta hasta 800ms
  const whoPromise = new Promise(resolve => {
    _whoResolve = resolve;
    setTimeout(() => { if (_whoResolve) { _whoResolve(null); _whoResolve = null; } }, 800);
  });
  await send('WHO');
  const who = await whoPromise;

  if (who && who.model) {
    // Autodetección exitosa
    const prodKey = WHO_TO_PROD[who.model.toLowerCase().replace(/[\s]/g,'')];
    if (prodKey && PRODUCTS[prodKey]) selectProd(prodKey);
    showWelcomeDev(who.model, who.version);

    // Mostrar versión en status bar
    const vEl = document.getElementById('sbFwVersion');
    if (vEl) vEl.textContent = who.version || '';

    // Comparar con versión más reciente conocida
    const latest = LATEST_FW[who.model];
    if (latest && who.version) {
      const cur    = parseInt((who.version || '').replace(/\D/g,''));
      const latNum = parseInt(latest.replace(/\D/g,''));
      if (cur < latNum) {
        toast('⬆️', `Para tener las últimas funcionalidades, actualizá tu ${who.model}. Visitá la sección Actualizaciones para saber más.`);
        addLog(`Firmware desactualizado: ${who.version} → última versión conocida: ${latest}`, 'w');
      }
    }
  } else {
    // Firmware viejo — sin WHO: pedir selección manual de producto
    const vEl = document.getElementById('sbFwVersion');
    if (vEl) vEl.textContent = '';
    openModal('selectProdModal');
    addLog('El dispositivo no respondió WHO — firmware sin soporte de autodetección.', 'w');
  }

  // GETALL solo si el dispositivo fue reconocido
  if (prod) {
    devCfg = mkCfg();
    await send('GETALL');
    setTimeout(applyDevCfgToCards, 2400);
  }
}

function renderCfgModal() {
  const ORI = ['Normal (0°)','Girado derecha','Girado izquierda','Invertido (180°)'];
  const FM  = {0:'acción individual', 1:'mueven el cursor', 2:'teclas ↑↓←→'};
  const TN  = {0:'Mouse',1:'Teclado',2:'Desactivado'};
  const MN  = {0:'al presionar',1:'al soltar',2:'pulsación larga'};
  const MOU = {1:'clic izq.',2:'clic der.',4:'clic central',8:'scroll ↑',16:'scroll ↓'};
  const hl  = t => '<span class="hl">' + t + '</span>';
  let h = '';
  if (prod && prod.hasArrows) {
    h += '<div class="cfg-sec"><div class="cfg-sec-title">⬆️ Flechas</div>';
    h += '<div class="cfg-row">Las flechas ' + hl(FM[devCfg.fmode]||'—') + '. Orientación: ' + hl(ORI[devCfg.orient]||'—') + '.</div>';
    if (devCfg.fmode===0||devCfg.fmode===1) h += '<div class="cfg-row">Velocidad ' + hl(devCfg.vel||'—') + ', ' + hl(devCfg.acel===1?'con aceleración':'velocidad constante') + '.</div>';
    h += '</div>';
  }
  if (prod) {
    const codeToIdx = {BR:0,BA:1,BN:2,BC:3,FU:4,FD:5,FL:6,FR:7};
    const allBtns = [
      ...prod.mainBtns,
      ...(prod.hasArrows && devCfg.fmode===0 ? prod.arrowBtns : []),
      ...(prod.hasCenterConnectors && devCfg.fmode===0 ? prod.centerBtns : []),
    ];
    h += '<div class="cfg-sec"><div class="cfg-sec-title">🎯 Botones</div>';
    allBtns.forEach(({code,label}) => {
      const c = devCfg.btns[String(codeToIdx[code])];
      if (!c) { h += '<div class="cfg-row"><b>' + label + '</b>: sin datos.</div>'; return; }
      if (c.tipo===2) { h += '<div class="cfg-row"><b>' + label + '</b>: ' + hl('desactivado') + '.</div>'; return; }
      let row = '<b>' + label + '</b>: ' + hl(TN[c.tipo]) + ', ' + hl(MN[c.modo]);
      if (c.tipo===0) {
        const dc=(c.flags&1)?'doble ':''; const mc=(c.flags&2)?' (toggle)':'';
        row += ' — ' + hl(dc + (MOU[c.accion]||'#'+c.accion) + mc);
      } else {
        const ch = c.accion>31&&c.accion<127 ? String.fromCharCode(c.accion) : '#'+c.accion;
        const mm=[]; if(c.mods&1)mm.push('Ctrl'); if(c.mods&2)mm.push('Shift'); if(c.mods&4)mm.push('Alt'); if(c.mods&8)mm.push(osMode==='mac'?'⌘':'Win');
        row += ' — tecla ' + hl(ch) + (mm.length?' + '+hl(mm.join('+')):'');
      }
      if (c.debounce>0) row += ', debounce ' + hl(c.debounce+'ms');
      h += '<div class="cfg-row">' + row + '.</div>';
    });
    h += '</div>';
  }
  document.getElementById('cfgDisplay').innerHTML = h;
  openModal('cfgModal');
}

// ── CONEXIÓN ─────────────────────────────────────────────
async function toggleConn() { connected ? await disconnect() : await connectDevice(); }

async function connectDevice() {
  if (!window.Protocol || !window.Transport) {
    toast('❌', 'Módulos no cargados. Recargá la página servida por http(s) (no file://).');
    addLog('window.Protocol / window.Transport no disponibles — ¿se abrió con file://?', 'w');
    return;
  }
  if (connType === 'ble') { await connectBLE(); }
  else                   { await connectUSB(); }
}

// USB ─────────────────────────────────────────────────────
// La mecánica del transporte (Web Serial nativo + polyfill WebUSB, bucle de
// lectura, framing por '\n') vive en src/transport.js. Acá solo se enganchan
// los callbacks a la UI y se maneja el resultado.
async function connectUSB() {
  try {
    _conn = await window.Transport.connectSerial({
      log: addLog,
      onLine: (line) => { addLog(line, 'in'); parseLine(line); },
      onClosed: (err) => {
        if (connected) {
          addLog('Conexión USB interrumpida: ' + (err?.message || ''), 'w');
          disconnect(true);
          toast('⚠️', 'El dispositivo USB se desconectó');
        }
      },
    });
    setConnected(true);
    await postConnect();
  } catch(e) {
    if (e.name === 'NotFoundError') return; // el usuario cerró el selector sin elegir
    if (e.code === 'NO_SERIAL') {
      if (isIOS()) toast('❌','USB no disponible en iOS/iPadOS. Configurá desde una PC/Mac por cable.');
      else         toast('❌','USB no disponible. Usá Chrome o Edge en PC, o Chrome en Android con cable OTG.');
      return;
    }
    addLog('Error USB: ' + e.message, 'w');
    toast('❌', e.message);
  }
}

// BLE ─────────────────────────────────────────────────────
// La conexión BLE (Nordic UART, diagnóstico de conflicto HID en Windows) vive
// en src/transport.js → window.Transport.connectBle.

// Detectar iOS/iPadOS (incluye Chrome/otros en iOS, todos usan WKWebView)
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS en modo escritorio
}

// Detectar macOS (para sugerir el modo de modificadores ⌘/Ctrl por defecto)
function isMacOS() {
  return (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent).includes('Mac') && !isIOS();
}

// Detectar dispositivos táctiles sin teclado físico confiable (para la captura de tecla)
function isTouchDevice() {
  return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
}

async function connectBLE() {
  if (isIOS()) {
    toast('❌', 'BLE no disponible en iOS/iPadOS. Usá USB desde una PC o Mac.');
    addLog('iOS/iPadOS: Web Bluetooth no está soportado por Apple en ningún navegador.', 'w');
    addLog('→ Conectá el dispositivo por USB a una computadora para configurarlo.', 'w');
    return;
  }
  try {
    _conn = await window.Transport.connectBle({
      log: addLog,
      toast: toast,
      onLine: (line) => { addLog(line, 'in'); parseLine(line); },
      onClosed: () => {
        if (connected) {
          addLog('Dispositivo BLE desconectado', 'w');
          disconnect(true);
          toast('⚠️', 'El dispositivo Bluetooth se desconectó');
        }
      },
    });
    if (!_conn) return; // problema de acceso ya diagnosticado en el Registro
    setConnected(true);
    await postConnect();
  } catch(e) {
    if (e.name === 'NotFoundError' || e.name === 'AbortError') return; // usuario canceló
    addLog('Error BLE [' + e.name + ']: ' + e.message, 'w');
    if (e.name === 'SecurityError') {
      addLog('→ Causa probable: el dispositivo está emparejado al OS como HID.', 'w');
      addLog('  Chrome no puede acceder a dispositivos HID vía GATT en Windows.', 'w');
      addLog('  Solución: desemparejar el dispositivo del OS y volver a intentar.', 'w');
    }
    toast('❌', e.message || e.name);
  }
}

// Desconectar ─────────────────────────────────────────────
async function disconnect(physical = false) {
  const was = connected; connected = false;
  // El handle de src/transport.js (USB o BLE) hace toda la limpieza del enlace.
  try { if (_conn) await _conn.close(); } catch(_){}
  _conn = null;
  if (was) setConnected(false, physical);
}

// Enviar ──────────────────────────────────────────────────
async function send(cmd) {
  if (!connected || !_conn) { toast('❌','Sin conexión activa'); return false; }
  try {
    await _conn.send(cmd);   // USB o BLE — el handle sabe cómo (chunking BLE incluido)
    addLog(cmd, 'out');
    await new Promise(r => setTimeout(r, 90));
    return true;
  } catch(e) {
    addLog('Error al enviar: ' + e.message, 'w');
    await disconnect(true);
    toast('⚠️', 'El dispositivo se desconectó');
    return false;
  }
}

function setConnected(val, physical = false) {
  connected = val;
  ['sdot','sdot2'].forEach(id => { const el=document.getElementById(id); if(el) el.className='sdot'+(val?' on':''); });
  ['stxt','stxt2'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=val?'Conectado':'Desconectado'; });
  const btn = document.getElementById('btnConn');
  btn.textContent = val ? 'Desconectar' : 'Conectar';
  btn.className = 'btn sm' + (val ? ' ghost' : ' pri');
  setSections(val);
  setBanner(val ? 'ok' : (prod ? 'conn' : 'none'));
  // Status bar
  const sb = document.getElementById('statusBar');
  if (sb) sb.style.display = val ? '' : 'none';
  if (!val) {
    // Limpiar status bar al desconectar
    updateStatusBar('', '');
    // Resetear tab activa para que al reconectar se auto-seleccione correctamente
    activePresetTab = null;
    // Refrescar modal de presets si está abierto
    const pm = document.getElementById('presetsModal');
    if (pm && pm.style.display !== 'none') renderPresetTabs();
  }
  // Drawer: hide setup when connected
  const setup = document.getElementById('drwSetup');
  if (setup) setup.style.display = val ? 'none' : '';
  if (val) { closeDrawer(); closeModal('connModal'); }
  // Botón Conectar rápido en topbar
  const cq = document.getElementById('btnConnQuick');
  if (cq) {
    cq.textContent = val ? 'Desconectar' : 'Conectar →';
    cq.className = 'btn-conn-quick' + (val ? ' connected' : '');
    cq.onclick = val ? toggleConn : openConnModal;
  }
  // Actualizar botón dentro del connModal si está abierto
  const btnM = document.getElementById('btnConnM');
  if (btnM) {
    btnM.textContent = val ? 'Desconectar' : 'Conectar';
    btnM.className = 'btn sm' + (val ? ' ghost' : ' pri');
    btnM.style.width = '100%';
  }
  const subM = document.getElementById('connSubM');
  if (subM) subM.style.display = val ? 'flex' : 'none';
  if (val) { addLog('Conectado (' + connType.toUpperCase() + '): ' + (prod ? prod.name : '—')); onArrowMode(); }
  else addLog(physical ? 'Desconexión física detectada' : 'Desconectado', physical ? 'w' : '');
}

// ── MODALS ────────────────────────────────────────────────
function openModal(id)  {
  document.getElementById(id).style.display='flex';
  if (id === 'presetsModal') {
    renderPresetTabs();   // builds tabs, factory presets, and triggers loadSharedPresets via _refreshPresetContent
  }
}
function closeModal(id) { document.getElementById(id).style.display='none'; }
function closeBd(e,id)  { if (e.target===document.getElementById(id)) closeModal(id); }

// ── LOG ───────────────────────────────────────────────────
function addLog(msg, dir='') {
  const p = document.getElementById('logPanel');
  const n = new Date();
  const ts = [n.getHours(),n.getMinutes(),n.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');
  const sym = dir==='out'?'↗':dir==='in'?'↙':dir==='w'?'⚠':'·';
  const cls = dir==='out'?'lo':dir==='in'?'li':dir==='w'?'lw':'';
  const e = document.createElement('div'); e.className='le';
  e.innerHTML='<span class="lt">'+ts+'</span><span class="'+cls+'">'+sym+'</span><span class="lm">'+msg+'</span>';
  p.appendChild(e); p.scrollTop = p.scrollHeight;
}
function clearLog() { document.getElementById('logPanel').innerHTML=''; }

// Canal de comandos crudos: reusa send() (misma escritura RX ya usada por la UI estructurada)
async function sendLogCmd() {
  const inp = document.getElementById('logCmdInput');
  const cmd = inp.value.trim();
  if (!cmd || !connected) return;
  const ok = await send(cmd);
  if (ok) inp.value = '';
}

// ── TOASTS ────────────────────────────────────────────────
function toast(ico, msg) {
  const c = document.getElementById('toasts');
  const t = document.createElement('div'); t.className='toast';
  t.innerHTML='<span class="t-ico">'+ico+'</span><span class="t-msg">'+msg+'</span>';
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),320); }, 3200);
}

// ── TOUR ─────────────────────────────────────────────────
let tStep=0, tActive=false;
const TOUR = [
  {sel:'.btn-burger', pos:'right', title:'Menú principal',
   body:'Abrí el menú ☰ para elegir el producto, conectar el dispositivo y acceder a todas las funciones: configuraciones rápidas, formación, comunidad y más.'},
  {sel:'#btnConnQuick', pos:'bottom', title:'Conectar el dispositivo',
   body:'Una vez seleccionado el producto en el menú, presioná este botón para iniciar la conexión. En USB el navegador muestra un selector de puertos; en Bluetooth buscará dispositivos cercanos.'},
  {sel:'#secArrows', pos:'left', title:'Modo de las flechas',
   body:'Solo disMouse. Elegí si las flechas mueven el cursor del mouse, emulan las teclas de dirección del teclado, o configurá cada flecha por separado con una acción distinta.'},
  {sel:'#secBtns', pos:'left', title:'Configurar cada botón',
   body:'Cada botón puede emular una tecla del teclado, un clic de mouse, doble clic, scroll o desactivarse. Los cambios se aplican al instante al dispositivo conectado.'},
  {sel:'#drwBtnPresets', pos:'right', title:'Configuraciones rápidas',
   body:'Aplicá configuraciones prediseñadas para Asterics, Cboard, juegos y más — sin necesidad de conectar el dispositivo para explorarlas. También podés guardar tus propias configuraciones con un nombre y una nota explicativa.'},
  {sel:'#btnAuth', selMobile:'#drwAuthLbl', pos:'bottom', title:'Comunidad EpE',
   body:'Iniciá sesión para desbloquear las funciones de comunidad: guardá tus configuraciones en la nube, compartílas con colegas por email, o publicalas para que toda la comunidad EpE pueda usarlas. También podés importar y exportar configuraciones en CSV.'},
];

function showWelcome() {
  if (localStorage.getItem('displus_tour_skip') === '1') return;
  document.getElementById('twBd').style.display='block';
  document.getElementById('twCard').style.display='flex';
}
function startTour() {
  document.getElementById('twBd').style.display='none';
  document.getElementById('twCard').style.display='none';
  tStep=0; tActive=true;
  document.getElementById('tourBd').style.display='block';
  renderStep();
}
function skipTour()      { endTour(); }
function neverShowTour() { localStorage.setItem('displus_tour_skip','1'); endTour(); }
function restartTour() {
  endTour();
  setTimeout(()=>{ document.getElementById('twBd').style.display='block'; document.getElementById('twCard').style.display='flex'; }, 50);
}
function nextStep() {
  // Paso 3 (flechas) solo aplica a disMouse
  if (tStep === 2 && prod && !prod.hasArrows) { tStep++; }
  if (tStep < TOUR.length-1) { tStep++; renderStep(); }
  else { endTour(); toast('🎉','¡Recorrido completado!'); }
}
function prevStep() { if (tStep>0) { tStep--; renderStep(); } }

function renderStep() {
  const s = TOUR[tStep];
  // Si este paso apunta a secArrows y el producto no tiene flechas, saltar
  if (s.sel === '#secArrows' && prod && !prod.hasArrows) { nextStep(); return; }
  // En mobile usar selector alternativo si existe
  const isMobile = window.innerWidth <= 600;
  const sel = (isMobile && s.selMobile) ? s.selMobile : s.sel;
  // Pasos que requieren drawer abierto
  const needsDrawer = sel === '#drwBtnPresets' || sel === '#drwAuthLbl';
  if (needsDrawer) openDrawer(); else if (!isMobile) closeDrawer();
  const el = document.querySelector(sel);
  document.getElementById('tBadge').textContent = tStep+1;
  document.getElementById('tTitle').textContent = s.title;
  document.getElementById('tBody').textContent  = s.body;
  document.getElementById('tProg').textContent  = (tStep+1) + ' de ' + TOUR.length;
  document.getElementById('tPrev').style.display = tStep>0?'':' none';
  document.getElementById('tNext').textContent   = tStep===TOUR.length-1?'Finalizar':'Siguiente';
  const spot = document.getElementById('tourSpot');
  const tip  = document.getElementById('tourTip');
  if (!el) { spot.style.display='none'; tip.style.display='none'; return; }
  el.scrollIntoView({behavior:'smooth', block:'nearest'});
  setTimeout(() => {
    const r = el.getBoundingClientRect(); const p=6;
    spot.style.cssText='display:block;top:'+(r.top-p)+'px;left:'+(r.left-p)+'px;width:'+(r.width+p*2)+'px;height:'+(r.height+p*2)+'px';
    tip.style.display='block';
    requestAnimationFrame(() => placeTip(tip, el.getBoundingClientRect(), s.pos));
  }, 380);
}

function placeTip(tip, r, pref) {
  const w=296, h=tip.offsetHeight, g=14, m=12;
  const vw=innerWidth, vh=innerHeight;
  for (const pos of [...new Set([pref,'right','left','bottom','top'])]) {
    let l,t;
    if(pos==='right'){l=r.right+g;t=r.top;}
    else if(pos==='left'){l=r.left-w-g;t=r.top;}
    else if(pos==='bottom'){l=r.left+r.width/2-w/2;t=r.bottom+g;}
    else{l=r.left+r.width/2-w/2;t=r.top-h-g;}
    if(l>=m&&l+w<=vw-m&&t>=m&&t+h<=vh-m){tip.style.left=l+'px';tip.style.top=t+'px';return;}
  }
  let l=pref==='right'?r.right+g:pref==='left'?r.left-w-g:r.left+r.width/2-w/2;
  let t=(pref==='bottom'||pref==='right'||pref==='left')?r.top:r.top-h-g;
  tip.style.left=Math.max(m,Math.min(l,vw-w-m))+'px';
  tip.style.top=Math.max(m,Math.min(t,vh-h-m))+'px';
}

function endTour() {
  tActive=false;
  ['tourBd','tourSpot','tourTip','twBd','twCard'].forEach(id=>document.getElementById(id).style.display='none');
  closeDrawer();
}
window.addEventListener('resize', ()=>{ if (tActive) renderStep(); });

// ── TOOLTIP GLOBAL DE PRESETS ────────────────────────────
// Llamado desde buildFactoryPresets tras crear las cards.
// Las cards ya tienen listener de click para applyPreset;
// aquí solo agregamos hover para el tooltip global.
function initPresetTooltips() {
  const gt = document.getElementById('globalTip');
  let hideTimer = null;

  document.querySelectorAll('.preset-card[data-tip-id]').forEach(card => {
    card.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      const id = card.getAttribute('data-tip-id');
      const html = TIP_CONTENT[id];
      if (!html) return;
      gt.innerHTML = html.includes('%PLBL%') ? html.replaceAll('%PLBL%', osMode === 'mac' ? '⌘' : 'Ctrl') : html;
      gt.style.display = 'block';
      positionTip(card);
    });
    card.addEventListener('mousemove', () => positionTip(card));
    card.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => { gt.style.display = 'none'; }, 80);
    });
  });

  function positionTip(card) {
    const r=card.getBoundingClientRect(), tw=gt.offsetWidth;
    const vw=window.innerWidth, margin=10;
    let left=r.left+r.width/2-tw/2, top=r.top-gt.offsetHeight-10;
    if (top < margin) top = r.bottom + 10;
    left = Math.max(margin, Math.min(left, vw-tw-margin));
    gt.style.left=left+'px'; gt.style.top=top+'px';
    const al=r.left+r.width/2-left;
    gt.style.setProperty('--arrow-left', Math.max(16,Math.min(al,tw-16))+'px');
  }
}

// ── DRAWER ───────────────────────────────────────────────
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drwOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drwOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function toggleDrawer() {
  document.getElementById('drawer').classList.contains('open') ? closeDrawer() : openDrawer();
}

// ── CONN MODAL ───────────────────────────────────────────
function openConnModal() {
  // Con WHO, el producto se detecta solo → pasos 2 y 3 siempre habilitados
  _connStepEnable(2); _connStepEnable(3);

  // Sincronizar producto si ya hay uno seleccionado
  document.querySelectorAll('#devListModal .dev-opt:not(.disabled)').forEach(el => el.classList.remove('active'));
  if (prod) {
    const id = 'opt-' + prod.id + '-m';
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
  // Sincronizar tipo de conexión
  ['usb','ble'].forEach(t => {
    const el = document.getElementById('ct-'+t+'-m');
    if (el) el.classList.toggle('active', connType === t);
  });
  // Si hay BLE: mostrar hints
  if (isIOS()) {
    const ib = document.getElementById('iosBlockM');
    if (ib) ib.style.display = '';
    const ctb = document.getElementById('ct-ble-m');
    if (ctb) { ctb.classList.add('ct-disabled'); ctb.querySelector('.ct-sub').textContent='No disponible'; }
  }
  // btnConn del modal
  const btnM = document.getElementById('btnConnM');
  if (btnM) {
    btnM.textContent = connected ? 'Desconectar' : 'Conectar';
    btnM.className = 'btn sm' + (connected ? ' ghost' : ' pri');
    btnM.style.width = '100%';
  }
  const sub = document.getElementById('connSubM');
  if (sub) sub.style.display = connected ? 'flex' : 'none';
  openModal('connModal');
}

function _connStepEnable(n) {
  const el = document.getElementById('cstep' + n);
  if (!el) return;
  el.style.opacity = '';
  el.style.pointerEvents = '';
  el.classList.add('active');
}
function _connStepDisable(n) {
  const el = document.getElementById('cstep' + n);
  if (!el) return;
  el.style.opacity = '.4';
  el.style.pointerEvents = 'none';
  el.classList.remove('active');
}

// ── LEER CONFIGURACIÓN → TARJETAS ────────────────────────
// Mapa inverso código numérico → nombre de tecla (incluye tabla legacy):
// src/protocol.js → window.Protocol.REV_KEY

function applyDevCfgToCards() {
  if (!prod) return;
  const codeToIdx = {BR:0,BA:1,BN:2,BC:3,FU:4,FD:5,FL:6,FR:7};
  const allBtns = [
    ...prod.mainBtns,
    ...(prod.hasArrows ? prod.arrowBtns : []),
    ...(prod.hasCenterConnectors && devCfg.fmode === 0 ? prod.centerBtns : []),
  ];

  // Mapa modo numérico → selector value
  const MODO_MAP = {0:'P', 1:'R', 2:'H', 3:'O'};
  // Mapa mods bitmask → checkboxes
  const MODS_BITS = [{bit:1,id:'mc'},{bit:2,id:'ms'},{bit:4,id:'ma'},{bit:8,id:'mg'}];

  allBtns.forEach(({code}) => {
    const idx = String(codeToIdx[code]);
    const c = devCfg.btns[idx];
    if (!c) return;

    const tSel = document.getElementById('t_' + code);
    const mSel = document.getElementById('m_' + code);
    const dInp = document.getElementById('d_' + code);
    if (!tSel) return;

    // Tipo
    if (c.tipo === 2) {
      tSel.value = 'X';
    } else if (c.tipo === 0) {
      tSel.value = 'M';
    } else {
      tSel.value = 'K';
    }
    onType(code);

    // Modo de activación
    if (mSel) mSel.value = MODO_MAP[c.modo] ?? 'P';

    // Debounce
    if (dInp) dInp.value = c.debounce ?? 0;

    if (c.tipo === 0) {
      // Mouse
      const mActSel = document.getElementById('mact_' + code);
      if (mActSel) {
        const hasDouble = (c.flags & 1);
        const hasToggle = (c.flags & 2);
        if (c.accion === 8 || c.accion === 16) {
          mActSel.value = c.accion === 8 ? 'SU' : 'SD';
        } else if (hasDouble && c.accion === 1) {
          mActSel.value = '1D';
        } else if (hasToggle && c.accion === 1) {
          mActSel.value = '1M';
        } else {
          mActSel.value = String(c.accion);
          if (!mActSel.value) mActSel.value = '1'; // accion=0 u otro valor sin opción → default clic izquierdo
        }
      }
    } else if (c.tipo === 1) {
      // Teclado
      const kInp = document.getElementById('k_' + code);
      if (kInp) {
        const accion = String(c.accion);
        const revKey = window.Protocol.REV_KEY;
        if (revKey[accion]) {
          kInp.value = revKey[accion];
        } else if (c.accion > 31 && c.accion < 127) {
          kInp.value = String.fromCharCode(c.accion);
        } else if (c.accion > 0) {
          kInp.value = '#' + c.accion;
        } else {
          kInp.value = '';
        }
      }
      // Modificadores
      MODS_BITS.forEach(({bit, id}) => {
        const cb = document.getElementById(id + '_' + code);
        if (cb) cb.checked = !!(c.mods & bit);
      });
    }

    updateSummary(code);
  });

  // Flechas: aplicar si el producto las tiene
  if (prod.hasArrows) {
    const amSel = document.getElementById('arrowMode');
    const oriSel = document.getElementById('orient');
    const velInp = document.getElementById('vel');
    const acelCb = document.getElementById('acel');
    if (amSel && devCfg.fmode != null)  amSel.value = String(devCfg.fmode);
    if (oriSel && devCfg.orient != null) oriSel.value = String(devCfg.orient);
    if (velInp && devCfg.vel != null)    velInp.value = devCfg.vel;
    if (acelCb && devCfg.acel != null)   acelCb.checked = devCfg.acel === 1;
    onArrowMode();
  }

  // Conectores centrales: aplicar si el producto los tiene
  if (prod.hasCenterConnectors) {
    const cmSel = document.getElementById('dishubCenterMode');
    const oriSel = document.getElementById('dishubOrient');
    const velInp = document.getElementById('dishubVel');
    const acelCb = document.getElementById('dishubAcel');
    if (cmSel && devCfg.fmode != null)   cmSel.value   = String(devCfg.fmode);
    if (oriSel && devCfg.orient != null) oriSel.value  = String(devCfg.orient);
    if (velInp && devCfg.vel != null)    velInp.value  = devCfg.vel;
    if (acelCb && devCfg.acel != null)   acelCb.checked = devCfg.acel === 1;
    onDishubCenterMode();
  }

  toast('✅', 'Configuración cargada en las tarjetas');
}

// ── INIT ─────────────────────────────────────────────────
function init() {
  // Mover topbar y status-bar al inicio del app-shell (están antes en el DOM por limitaciones del HTML estático)
  const shell = document.getElementById('appShell');
  const topbar = document.getElementById('topbar');
  const statusBar = document.getElementById('statusBar');
  if (shell && topbar) shell.insertBefore(topbar, shell.firstChild);
  if (shell && statusBar) shell.insertBefore(statusBar, shell.children[1] || null);

  const def = PRODUCTS['dismouse'];
  buildGrid('mainGrid',  def.mainBtns);
  buildGrid('arrowGrid', def.arrowBtns);
  buildFactoryPresets(def.presets);
  setSections(false);
  setBanner('none');
  onArrowMode();
  renderCustom();
  let savedOsMode = null;
  try { savedOsMode = localStorage.getItem('displus_os_mode'); } catch(_) {}
  selectOsMode(savedOsMode || (isMacOS() ? 'mac' : 'win'));
  addLog('Configurador dis+ R014. Firmware R009 compatible.');
  // Bloquear BLE en iOS — Web Bluetooth no disponible en ningún browser iOS
  if (isIOS()) {
    const ctBle = document.getElementById('ct-ble');
    ctBle.classList.add('ct-disabled');
    ctBle.title = 'No disponible en iOS/iPadOS';
    ctBle.querySelector('.ct-sub').textContent = 'No disponible';
    document.getElementById('iosBlock').style.display = '';
    addLog('iOS/iPadOS detectado — opción BLE deshabilitada.', 'w');
  }
  setTimeout(showWelcome, 800);

  // Escape cierra drawer
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // Supabase: recuperar sesión activa y escuchar cambios
  // Usamos solo onAuthStateChange — incluye INITIAL_SESSION en v2, evita doble llamada
  supa.auth.onAuthStateChange((event, session) => {
    const prevUser = currentUser;
    currentUser = session?.user ?? null;
    updateAuthBtn();

    if (event === 'SIGNED_OUT') {
      // Limpiar presets locales para no dejar datos del usuario en el navegador
      window.PresetsStore.clearLocal();
      renderCustom();
      // Ocultar secciones compartidas
      document.getElementById('sectionShared').style.display    = 'none';
      document.getElementById('sectionCommunity').style.display = 'none';
    } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentUser && !prevUser) {
      // Login nuevo (no recarga con sesión ya activa desde antes)
      handleLoginSync();
      loadSharedPresets();
    }
  });
}

async function handleLoginSync() {
  const localPresets = loadCustom();
  const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
  if (localPresets.length > 0) {
    // Hay presets locales: preguntar qué hacer (merge / usar solo la nube)
    showImportDialog(localPresets, cloudRows);
  } else {
    // Sin presets locales: cargar los de la nube directamente
    window.PresetsStore.saveLocal(cloudRows);
    renderCustom();
    if (cloudRows.length > 0)
      toast('☁️', `${cloudRows.length} configuración${cloudRows.length !== 1 ? 'es' : ''} cargadas desde tu cuenta`);
  }
}

// init() usa PRODUCTS (de src/products.js, cargado por el <script type="module">
// diferido). Por eso se espera a DOMContentLoaded, que corre después de los módulos.

// ── Puente para los handlers inline del HTML (onclick="...") ─────────────────
// Transicional: al partir este archivo en src/ui/*.js, cada módulo hará
// addEventListener o re-exportará lo que su HTML necesite y esta lista se achica.
Object.assign(window, {
  applyArrows, applyBtn, applyCustom, applyDishubCenter, captureFromInput, clearLog,
  closeBd, closeDrawer, closeModal, confirmEditPreset, confirmSave, confirmToggleOsMode,
  delCustom, delShared, downloadCSV, getAllConfig, importCSV, importChoice,
  neverShowTour, nextStep, onArrowMode, onDishubCenterMode, onType, openAuthModal,
  openConnModal, openEditPreset, openModal, openShareModal, pingDevice, prevStep,
  renderAuthModal, resetDevice, restartTour, saveConfig, saveSharedAsOwn, selectConnType,
  selectProd, sendLogCmd, sendResetLink, setCapturedKey, shareWithCommunity, shareWithUser,
  signInWithGoogle, signInWithPassword, signOut, signUpWithPassword, skipTour, startCap,
  startTour, stopCap, toggleAdv, toggleConn, toggleDrawer,
  _PR,
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
