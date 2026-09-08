// @ts-check
/** Menú lateral (drawer): abrir / cerrar / alternar. */

export function openDrawer() {
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('drwOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeDrawer() {
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('drwOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

export function toggleDrawer() {
  document.getElementById('drawer')?.classList.contains('open') ? closeDrawer() : openDrawer();
}
