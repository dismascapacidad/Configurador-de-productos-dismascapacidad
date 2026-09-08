// @ts-check
/**
 * Recorrido guiado (tour) y modal de bienvenida.
 * Se ofrece la primera vez (a menos que el usuario haya elegido "no mostrar").
 */
import { S } from './state.js';
import { toast } from './dom.js';
import { openDrawer, closeDrawer } from './drawer.js';

let tStep = 0;
let tActive = false;

const TOUR = [
  { sel: '.btn-burger', pos: 'right', title: 'Menú principal',
    body: 'Abrí el menú ☰ para elegir el producto, conectar el dispositivo y acceder a todas las funciones: configuraciones rápidas, formación, comunidad y más.' },
  { sel: '#btnConnQuick', pos: 'bottom', title: 'Conectar el dispositivo',
    body: 'Una vez seleccionado el producto en el menú, presioná este botón para iniciar la conexión. En USB el navegador muestra un selector de puertos; en Bluetooth buscará dispositivos cercanos.' },
  { sel: '#secArrows', pos: 'left', title: 'Modo de las flechas',
    body: 'Solo disMouse. Elegí si las flechas mueven el cursor del mouse, emulan las teclas de dirección del teclado, o configurá cada flecha por separado con una acción distinta.' },
  { sel: '#secBtns', pos: 'left', title: 'Configurar cada botón',
    body: 'Cada botón puede emular una tecla del teclado, un clic de mouse, doble clic, scroll o desactivarse. Los cambios se aplican al instante al dispositivo conectado.' },
  { sel: '#drwBtnPresets', pos: 'right', title: 'Configuraciones rápidas',
    body: 'Aplicá configuraciones prediseñadas para Asterics, Cboard, juegos y más — sin necesidad de conectar el dispositivo para explorarlas. También podés guardar tus propias configuraciones con un nombre y una nota explicativa.' },
  { sel: '#btnAuth', selMobile: '#drwAuthLbl', pos: 'bottom', title: 'Comunidad EpE',
    body: 'Iniciá sesión para desbloquear las funciones de comunidad: guardá tus configuraciones en la nube, compartílas con colegas por email, o publicalas para que toda la comunidad EpE pueda usarlas. También podés importar y exportar configuraciones en CSV.' },
];

export function showWelcome() {
  if (localStorage.getItem('displus_tour_skip') === '1') return;
  document.getElementById('twBd').style.display = 'block';
  document.getElementById('twCard').style.display = 'flex';
}

export function startTour() {
  document.getElementById('twBd').style.display = 'none';
  document.getElementById('twCard').style.display = 'none';
  tStep = 0;
  tActive = true;
  document.getElementById('tourBd').style.display = 'block';
  renderStep();
}

export function skipTour() {
  endTour();
}

export function neverShowTour() {
  localStorage.setItem('displus_tour_skip', '1');
  endTour();
}

export function restartTour() {
  endTour();
  setTimeout(() => {
    document.getElementById('twBd').style.display = 'block';
    document.getElementById('twCard').style.display = 'flex';
  }, 50);
}

export function nextStep() {
  // Paso 3 (flechas) solo aplica a disMouse
  if (tStep === 2 && S.prod && !S.prod.hasArrows) tStep++;
  if (tStep < TOUR.length - 1) {
    tStep++;
    renderStep();
  } else {
    endTour();
    toast('🎉', '¡Recorrido completado!');
  }
}

export function prevStep() {
  if (tStep > 0) {
    tStep--;
    renderStep();
  }
}

function renderStep() {
  const s = TOUR[tStep];
  // Si el paso apunta a secArrows y el producto no tiene flechas, saltarlo
  if (s.sel === '#secArrows' && S.prod && !S.prod.hasArrows) {
    nextStep();
    return;
  }
  const isMobile = window.innerWidth <= 600;
  const sel = isMobile && s.selMobile ? s.selMobile : s.sel;
  const needsDrawer = sel === '#drwBtnPresets' || sel === '#drwAuthLbl';
  if (needsDrawer) openDrawer();
  else if (!isMobile) closeDrawer();

  const el = document.querySelector(sel);
  document.getElementById('tBadge').textContent = String(tStep + 1);
  document.getElementById('tTitle').textContent = s.title;
  document.getElementById('tBody').textContent = s.body;
  document.getElementById('tProg').textContent = tStep + 1 + ' de ' + TOUR.length;
  document.getElementById('tPrev').style.display = tStep > 0 ? '' : ' none';
  document.getElementById('tNext').textContent = tStep === TOUR.length - 1 ? 'Finalizar' : 'Siguiente';

  const spot = document.getElementById('tourSpot');
  const tip = document.getElementById('tourTip');
  if (!el) {
    spot.style.display = 'none';
    tip.style.display = 'none';
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const p = 6;
    spot.style.cssText =
      'display:block;top:' + (r.top - p) + 'px;left:' + (r.left - p) +
      'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
    tip.style.display = 'block';
    requestAnimationFrame(() => placeTip(tip, el.getBoundingClientRect(), s.pos));
  }, 380);
}

function placeTip(tip, r, pref) {
  const w = 296;
  const h = tip.offsetHeight;
  const g = 14;
  const m = 12;
  const vw = innerWidth;
  const vh = innerHeight;
  for (const pos of [...new Set([pref, 'right', 'left', 'bottom', 'top'])]) {
    let l;
    let t;
    if (pos === 'right') { l = r.right + g; t = r.top; }
    else if (pos === 'left') { l = r.left - w - g; t = r.top; }
    else if (pos === 'bottom') { l = r.left + r.width / 2 - w / 2; t = r.bottom + g; }
    else { l = r.left + r.width / 2 - w / 2; t = r.top - h - g; }
    if (l >= m && l + w <= vw - m && t >= m && t + h <= vh - m) {
      tip.style.left = l + 'px';
      tip.style.top = t + 'px';
      return;
    }
  }
  const l = pref === 'right' ? r.right + g : pref === 'left' ? r.left - w - g : r.left + r.width / 2 - w / 2;
  const t = pref === 'bottom' || pref === 'right' || pref === 'left' ? r.top : r.top - h - g;
  tip.style.left = Math.max(m, Math.min(l, vw - w - m)) + 'px';
  tip.style.top = Math.max(m, Math.min(t, vh - h - m)) + 'px';
}

export function endTour() {
  tActive = false;
  ['tourBd', 'tourSpot', 'tourTip', 'twBd', 'twCard'].forEach(
    (id) => (document.getElementById(id).style.display = 'none'),
  );
  closeDrawer();
}

window.addEventListener('resize', () => {
  if (tActive) renderStep();
});
