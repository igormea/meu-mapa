'use strict';
/* ── ÍCONES DO RANVUS ──────────────────────────────────────
   Estilo "item de jogo": contorno escuro, cor forte, sombreado e um brilho.
   SVG (nítido em qualquer tela). Os degradês ficam num <defs> único no body,
   assim funcionam mesmo dentro de painéis escondidos.
   Uso: ic('casa') → '<svg class="ic">…</svg>'                                   */
const ICO_DEFS=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9a4"/><stop offset="1" stop-color="#c99a5b"/></linearGradient>
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b5b"/><stop offset="1" stop-color="#b3302a"/></linearGradient>
<linearGradient id="gLeather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4e"/><stop offset="1" stop-color="#7d4a24"/></linearGradient>
<linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8703f"/><stop offset="1" stop-color="#5e3518"/></linearGradient>
<linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa8ff"/><stop offset="1" stop-color="#2556b8"/></linearGradient>
<linearGradient id="gStone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8a1c6"/><stop offset="1" stop-color="#5d5680"/></linearGradient>
<linearGradient id="gSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef0f6"/><stop offset="1" stop-color="#7f87a3"/></linearGradient>
<linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe58a"/><stop offset=".55" stop-color="#f0b429"/><stop offset="1" stop-color="#a86a10"/></linearGradient>
<linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbeccb"/><stop offset="1" stop-color="#d9b77c"/></linearGradient>
<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ee08a"/><stop offset="1" stop-color="#2f8f4a"/></linearGradient>
<linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a978ff"/><stop offset="1" stop-color="#4b1fa0"/></linearGradient>
<radialGradient id="gPortal"><stop offset="0" stop-color="#e9b8ff"/><stop offset=".6" stop-color="#8a3df0"/><stop offset="1" stop-color="#3a1580"/></radialGradient>
<radialGradient id="gCrystal" cx=".35" cy=".3"><stop offset="0" stop-color="#e6fbff"/><stop offset=".5" stop-color="#4fd2ff"/><stop offset="1" stop-color="#1a5fb0"/></radialGradient>
</defs></svg>`;
const O='stroke="#1a1030" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
const HL=(d,w=2,o=.85)=>`<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
const ICO={
  mapa:`<g ${O}><path d="M4 11l11-4 18 5 11-4v29l-11 4-18-5-11 4z" fill="url(#gPaper)"/><path d="M15 7v29M33 12v29" fill="none" opacity=".6"/></g>
    <path d="M8 30c3-2 6-2 8 0s5 3 9 1" fill="none" stroke="#b3302a" stroke-width="2" stroke-dasharray="2 2.5" stroke-linecap="round"/>
    <path d="M23.5 17.5l5 5m0-5l-5 5" stroke="#d8433a" stroke-width="3" stroke-linecap="round"/>${HL('M7 13l6-2',2,.7)}`,
  mic:`<path d="M11 22a13 13 0 0026 0M24 35v6M17 42h14" fill="none" stroke="#1a1030" stroke-width="6" stroke-linecap="round"/>
    <path d="M11 22a13 13 0 0026 0M24 35v6M17 42h14" fill="none" stroke="#c8902a" stroke-width="2.6" stroke-linecap="round"/>
    <g ${O}><rect x="17" y="5" width="14" height="23" rx="7" fill="url(#gGold)"/></g>
    <path d="M20.5 12v9" stroke="#fff6c8" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="16" r="1.6" fill="#a86a10"/>`,
  trompa:`<g ${O}><path d="M6 19c9 0 17-4 25-12l3 2c-3 9-3 21 0 30l-3 2C23 33 15 29 6 29z" fill="url(#gGold)"/><path d="M6 19v10" fill="none"/></g>
    <path d="M12 21v6" stroke="#8a5a1a" stroke-width="2"/>${HL('M10 20.5c7-1 13-4 19-10')}
    <path d="M39 18c2 4 2 8 0 12M43 15c3 6 3 12 0 18" fill="none" stroke="#ffd34d" stroke-width="2.6" stroke-linecap="round"/>`,
  trompaOff:`<g ${O} opacity=".9"><path d="M6 19c9 0 17-4 25-12l3 2c-3 9-3 21 0 30l-3 2C23 33 15 29 6 29z" fill="url(#gStone)"/><path d="M6 19v10" fill="none"/></g>
    <path d="M38 18l7 12m0-12l-7 12" stroke="#e83a3a" stroke-width="3.4" stroke-linecap="round"/>`,
  casa:`<g ${O}><rect x="31" y="8" width="6" height="11" fill="#8a5a3a"/><path d="M10 22h28v19H10z" fill="url(#gWall)"/><path d="M5 24L24 8l19 16z" fill="url(#gRed)"/>
    <path d="M20 41V32a4 4 0 018 0v9z" fill="#7a4a2a"/><rect x="13" y="27" width="5" height="5" fill="#ffd86b"/></g>${HL('M12 22.5l12-10',2,.6)}<circle cx="34" cy="5" r="2.2" fill="#c8c0e0" opacity=".7"/>`,
  trabalho:`<g ${O}><path d="M17 15v-4a3 3 0 013-3h8a3 3 0 013 3v4" fill="none"/><rect x="6" y="15" width="36" height="25" rx="4" fill="url(#gLeather)"/><path d="M6 24h36" fill="none"/>
    <rect x="20" y="20" width="8" height="9" rx="1.5" fill="url(#gGold)"/></g>${HL('M9 18h30',2,.5)}`,
  carro:`<g ${O}><path d="M5 33v-7l5-2 5-8h16l7 8 5 2v7z" fill="url(#gBlue)"/><path d="M17 17h6v7h-10zM26 17h4l5 7h-9z" fill="#bfe6ff"/>
    <circle cx="14" cy="34" r="5" fill="#2a2440"/><circle cx="35" cy="34" r="5" fill="#2a2440"/></g>
    <circle cx="14" cy="34" r="1.6" fill="#c8c0e0"/><circle cx="35" cy="34" r="1.6" fill="#c8c0e0"/>${HL('M9 27h6',2,.6)}<circle cx="42" cy="28.5" r="1.4" fill="#ffd34d"/>`,
  bota:`<g ${O}><path d="M14 5h13l-1 18 10 4c3 1.2 5 4 5 7v6H9l1.5-12z" fill="url(#gLeather)"/><path d="M9 40h32v3H9z" fill="#4a2a14"/>
    <path d="M13 10h14" fill="none"/></g><path d="M16 14l8 0M16 18h8" stroke="#ffd34d" stroke-width="2" stroke-linecap="round"/>${HL('M17 8h7',2,.5)}`,
  bike:`<g ${O}><circle cx="12" cy="32" r="8" fill="#2a2440"/><circle cx="36" cy="32" r="8" fill="#2a2440"/><circle cx="12" cy="32" r="6" fill="none" stroke="#7f87a3" stroke-width="2"/><circle cx="36" cy="32" r="6" fill="none" stroke="#7f87a3" stroke-width="2"/>
    <path d="M12 32l8-14h12l4 14M20 18l7 14H12M17 13h6M30 12l2 6" fill="none" stroke="#1a1030" stroke-width="5"/></g>
    <path d="M12 32l8-14h12l4 14M20 18l7 14H12" fill="none" stroke="#3ccf6e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M17 13h6M30 12l2 6" stroke="#e6e9f2" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="32" r="1.8" fill="#c8c0e0"/><circle cx="36" cy="32" r="1.8" fill="#c8c0e0"/>`,
  bandeira:`<g ${O}><path d="M12 8h25l-6 8 6 8H12z" fill="url(#gRed)"/><path d="M12 43V5" fill="none" stroke="#1a1030" stroke-width="5"/></g>
    <path d="M12 43V5" stroke="#a8703f" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="5" r="2.6" fill="url(#gGold)" stroke="#1a1030" stroke-width="1.6"/>
    <path d="M7 43h10" stroke="#1a1030" stroke-width="3" stroke-linecap="round"/>${HL('M15 11h16',1.8,.55)}`,
  ampulheta:`<g ${O}><path d="M14 8h20c0 9-8 11-8 16s8 7 8 16H14c0-9 8-11 8-16s-8-7-8-16z" fill="#bfe6ff" fill-opacity=".35"/>
    <path d="M16.5 12h15c-1 4-4 6-7.5 8-3.5-2-6.5-4-7.5-8zM24 30c-3 1-6 4-7 8h14c-1-4-4-7-7-8z" fill="url(#gGold)" stroke-width="1.6"/>
    <rect x="9" y="4" width="30" height="5" rx="2" fill="url(#gWood)"/><rect x="9" y="39" width="30" height="5" rx="2" fill="url(#gWood)"/></g>`,
  bussola:`<g ${O}><circle cx="24" cy="24" r="19" fill="url(#gGold)"/><circle cx="24" cy="24" r="14" fill="#f8eed3"/>
    <path d="M24 11l4 13h-8z" fill="#e83a3a"/><path d="M24 37l-4-13h8z" fill="#4a5070"/></g><circle cx="24" cy="24" r="2.2" fill="#1a1030"/>${HL('M11 16a15 15 0 017-6',2,.7)}`,
  portal:`<g ${O}><path d="M8 43V22a16 16 0 0132 0v21z" fill="url(#gStone)"/><path d="M14 43V23a10 10 0 0120 0v20z" fill="url(#gPortal)"/></g>
    <path d="M24 24a4 4 0 11-4 4M24 24c4 0 6 3 6 6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>${HL('M11 18a14 14 0 018-7',2,.55)}`,
  torre:`<g ${O}><path d="M15 43l3-24h12l3 24z" fill="url(#gStone)"/><path d="M13 19h22v-8h-4v3h-4v-3h-6v3h-4v-3h-4z" fill="url(#gStone)"/>
    <path d="M19 29c3-3.5 7-3.5 10 0-3 3.5-7 3.5-10 0z" fill="#fff6c8"/></g><circle cx="24" cy="29" r="2.2" fill="#e83a3a"/>
    <path d="M24 4v4M17 6l2 3M31 6l-2 3" stroke="#ffd34d" stroke-width="2" stroke-linecap="round"/>`,
  elmo:`<g ${O}><path d="M24 2.5c4 2 6 5 6 9" fill="none" stroke="#1a1030" stroke-width="7"/></g><path d="M24 2.5c4 2 6 5 6 9" fill="none" stroke="#d8433a" stroke-width="4" stroke-linecap="round"/>
    <g ${O}><path d="M9 26a15 15 0 0130 0v14h-9v-8h-12v8H9z" fill="url(#gSteel)"/><path d="M17 31h14v-5H17z" fill="#1a1030"/><path d="M24 11v15" fill="none"/></g>${HL('M13 22a12 12 0 016-7',2.2)}`,
  talentos:`<g ${O}><path d="M24 3l10 14-10 26-10-26z" fill="url(#gCrystal)"/><path d="M14 17h20M24 3v40" fill="none" stroke-width="1.6" opacity=".7"/></g>
    ${HL('M19 16l4-8',2,.9)}<path d="M38 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM9 30l.8 2.2 2.2.8-2.2.8L9 36l-.8-2.2L6 33l2.2-.8z" fill="#fff6c8"/>`,
  bau:`<g ${O}><path d="M6 21a8 8 0 018-8h20a8 8 0 018 8v20H6z" fill="url(#gWood)"/><path d="M6 21h36" fill="none"/>
    <path d="M14 13v28M34 13v28" fill="none" stroke="#1a1030" stroke-width="5"/></g><path d="M14 13v28M34 13v28" stroke="#f0b429" stroke-width="2.6"/>
    <rect x="20" y="18" width="8" height="9" rx="1.5" fill="url(#gGold)" stroke="#1a1030" stroke-width="2"/>${HL('M10 18a6 6 0 014-3',2,.5)}`,
  pergaminho:`<g ${O}><path d="M12 8h26v28a5 5 0 01-5 5H12z" fill="url(#gPaper)"/><path d="M12 8a4 4 0 00-4 4v3h8v-3a4 4 0 00-4-4z" fill="#d9b77c"/>
    <path d="M28 41a5 5 0 005-5v-3H23v3a5 5 0 005 5" fill="#d9b77c"/></g>
    <path d="M18 16h14M18 21h14M18 26h9" stroke="#8a5a3a" stroke-width="2" stroke-linecap="round"/><circle cx="31" cy="33" r="3.4" fill="#d8433a" stroke="#1a1030" stroke-width="1.6"/>`,
  trofeu:`<g ${O}><path d="M13 6h22v9a11 11 0 01-22 0z" fill="url(#gGold)"/><path d="M13 9H6c0 7 3 10 8 10.5M35 9h7c0 7-3 10-8 10.5" fill="none"/>
    <path d="M21 26h6v7h-6z" fill="url(#gGold)"/><path d="M14 42h20l-2-9H16z" fill="url(#gWood)"/></g>
    ${HL('M17.5 9v6a7 7 0 002.5 5',2.2,.8)}<path d="M24 10l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#fff6c8"/>`,
  grimorio:`<g ${O}><path d="M10 6h27v35H10z" fill="url(#gViolet)"/><path d="M10 6c-3 0-4 1.5-4 3v31c0 1.5 1 3 4 3h27v-3" fill="#e8dcc0"/><path d="M10 6v34" fill="none"/></g>
    <path d="M16 6v35M31 6v35" stroke="#f0b429" stroke-width="2"/><circle cx="23.5" cy="20" r="5" fill="url(#gCrystal)" stroke="#1a1030" stroke-width="2"/>
    <path d="M18 31l2.5-3 2.5 3M24 31l2.5-3 2.5 3" stroke="#ffd34d" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  social:`<g ${O}><path d="M23 12l9-3 9 3v10c0 8-5 12-9 14-4-2-9-6-9-14z" fill="url(#gBlue)"/><path d="M5 15l10-3.5L25 15v11c0 9-5.5 13-10 15-4.5-2-10-6-10-15z" fill="url(#gRed)"/></g>
    <path d="M15 18v15M10 24h10" stroke="#ffd34d" stroke-width="2.4" stroke-linecap="round"/>${HL('M8.5 17l5-2',1.8,.6)}`,
  numeros:`<g ${O}><rect x="6" y="6" width="36" height="36" rx="4" fill="url(#gPaper)"/><rect x="12" y="26" width="6" height="11" fill="url(#gRed)"/>
    <rect x="21" y="18" width="6" height="19" fill="url(#gGold)"/><rect x="30" y="11" width="6" height="26" fill="url(#gGreen)"/></g>`,
  ajustes:`<g ${O}><path d="M24 4l3.2 5.2 6-1.6 1.2 6 5.6 2.8-2.6 5.6 2.6 5.6-5.6 2.8-1.2 6-6-1.6L24 44l-3.2-5.2-6 1.6-1.2-6-5.6-2.8L10.6 26 8 20.4l5.6-2.8 1.2-6 6 1.6z" fill="url(#gSteel)"/>
    <circle cx="24" cy="24" r="6.5" fill="#2a2440"/></g>${HL('M14 14a14 14 0 016-3',2,.7)}`,
  xp:`<g ${O}><path d="M24 4l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z" fill="url(#gGold)"/></g>${HL('M20 14l3-6',2,.8)}`,
  vida:`<g ${O}><path d="M24 41C10 32 5 24 5 17a9.5 9.5 0 0119-3 9.5 9.5 0 0119 3c0 7-5 15-19 24z" fill="url(#gRed)"/></g>${HL('M11 15a5 5 0 015-4',2.4,.75)}`,
  ataque:`<g ${O}><path d="M37 5l6 0 0 6-20 20-6-6z" fill="url(#gSteel)"/><path d="M12 26l10 10-3 3-10-10z" fill="url(#gGold)"/><path d="M13 35l-6 6" stroke-width="5"/><circle cx="6" cy="42" r="2.6" fill="url(#gGold)"/></g>${HL('M38 9L25 22',1.8,.8)}`,
  defesa:`<g ${O}><path d="M24 4l17 6v12c0 11-8 18-17 22C15 40 7 33 7 22V10z" fill="url(#gBlue)"/><path d="M24 9v30M12 20h24" fill="none" stroke="#ffd34d" stroke-width="3"/></g>${HL('M11 13l8-3',2,.6)}`,
  critico:`<g ${O}><path d="M24 3l4 11 11-5-5 11 11 4-11 4 5 11-11-5-4 11-4-11-11 5 5-11-11-4 11-4-5-11 11 5z" fill="url(#gGold)"/><circle cx="24" cy="24" r="6" fill="#ff6b5b"/></g>`,
  ouro:`<g ${O}><ellipse cx="24" cy="32" rx="16" ry="7" fill="#a86a10"/><path d="M8 26v6c0 4 7 7 16 7s16-3 16-7v-6" fill="url(#gGold)"/><ellipse cx="24" cy="26" rx="16" ry="7" fill="url(#gGold)"/>
    <ellipse cx="24" cy="16" rx="12" ry="5.5" fill="url(#gGold)"/></g><path d="M20 16h8" stroke="#a86a10" stroke-width="2" stroke-linecap="round"/>`,
  alcance:`<g ${O}><path d="M12 5c16 3 24 15 26 31" fill="none" stroke="#1a1030" stroke-width="6"/><path d="M12 5L38 36" fill="none" stroke-width="1.6"/></g>
    <path d="M12 5c16 3 24 15 26 31" fill="none" stroke="#a8703f" stroke-width="3" stroke-linecap="round"/><path d="M6 42L30 18" stroke="#e6e9f2" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M30 18l-2 7 9-9-7 2z" fill="#e6e9f2" stroke="#1a1030" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 42l3-7M6 42l7-3" stroke="#d8433a" stroke-width="2.4" stroke-linecap="round"/>`,
  honra:`<g ${O}><path d="M24 6v34M14 42h20M8 12h32" fill="none" stroke="#1a1030" stroke-width="5"/></g><path d="M24 6v34M14 42h20M8 12h32" stroke="#f0b429" stroke-width="2.6" stroke-linecap="round"/>
    <g ${O}><path d="M3 28l5-14 5 14a5 5 0 01-10 0zM35 28l5-14 5 14a5 5 0 01-10 0z" fill="url(#gGold)"/></g><circle cx="24" cy="6" r="2.6" fill="url(#gGold)" stroke="#1a1030" stroke-width="1.6"/>`,
  reinos:`<g ${O}><path d="M6 42V18h6v5h5v-5h6v5h2v-5h6v5h5v-5h6v24z" fill="url(#gStone)"/><path d="M20 42v-9a4 4 0 018 0v9z" fill="#2a2440"/>
    <path d="M24 18V5" fill="none"/></g><path d="M24 5h9l-2.5 3 2.5 3h-9z" fill="url(#gRed)" stroke="#1a1030" stroke-width="1.6" stroke-linejoin="round"/>`,
};
function ic(n,cls=''){const p=ICO[n];return p?`<svg class="ic ${cls}" viewBox="0 0 48 48" aria-hidden="true">${p}</svg>`:''}
document.body.insertAdjacentHTML('afterbegin',ICO_DEFS);
// marcadores no HTML: <i data-ic="casa"></i>
document.querySelectorAll('[data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic)});
