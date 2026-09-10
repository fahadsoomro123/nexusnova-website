// Compatibility entry retained because existing APK/OTA manifests still load v31.
// V31 no longer owns viewport geometry. Exactly one layout owner is allowed now.
import './travel-phone-layout-v32.js';

// Temporary phone-visible OTA delivery proof. Remove after Fahad confirms it appears.
const NX_OTA_PROOF_ID = 'nx-ota-proof-34';
function mountNxOtaProof() {
  if (document.getElementById(NX_OTA_PROOF_ID) || !document.body) return;
  const badge = document.createElement('div');
  badge.id = NX_OTA_PROOF_ID;
  badge.textContent = 'OTA TEST 34';
  badge.setAttribute('aria-label', 'NexusNova OTA delivery proof 34');
  Object.assign(badge.style, {
    position: 'fixed',
    top: '78px',
    right: '8px',
    zIndex: '2147483647',
    padding: '5px 8px',
    borderRadius: '999px',
    background: '#16c784',
    color: '#04110b',
    font: '700 11px/1.2 system-ui, sans-serif',
    letterSpacing: '.04em',
    boxShadow: '0 0 0 1px rgba(255,255,255,.55), 0 4px 14px rgba(0,0,0,.35)',
    pointerEvents: 'none'
  });
  document.body.appendChild(badge);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountNxOtaProof, { once: true });
} else {
  mountNxOtaProof();
}
