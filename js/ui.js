import { SYSTEMS } from "./data/organs.js";

const el = (id) => document.getElementById(id);

export function initHamburger() {
  const btn = el("hamburger");
  const nav = el("primary-nav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });
  // close the mobile menu after any nav choice
  nav.addEventListener("click", (e) => {
    if (e.target.closest(".nav-link") && window.innerWidth <= 768) {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

export function initAbout() {
  const backdrop = el("about-backdrop");
  el("about-close").addEventListener("click", () => (backdrop.hidden = true));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") backdrop.hidden = true;
  });
  return {
    open: () => (backdrop.hidden = false),
  };
}

export function setActiveNav(key) {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    const isSystem = btn.dataset.system && btn.dataset.system === key;
    const isHome = btn.dataset.action === "home" && key === "home";
    btn.classList.toggle("is-active", isSystem || isHome);
    if (isSystem || isHome) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

export function renderLegend(activeSystemKeys) {
  const list = el("legend-list");
  list.innerHTML = "";
  activeSystemKeys.forEach((key) => {
    const sys = SYSTEMS[key];
    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch" style="background:${sys.color}"></span>${sys.label}`;
    list.appendChild(li);
  });
}

export function showInfo(organ) {
  el("info-empty").hidden = true;
  const content = el("info-content");
  content.hidden = false;

  el("info-system").textContent = SYSTEMS[organ.system].label + " system";
  el("info-name").textContent = organ.name;
  el("info-synonyms").textContent =
    organ.synonyms && organ.synonyms !== "—" ? `Also called: ${organ.synonyms}` : "";
  el("info-location").textContent = organ.location;
  el("info-size").textContent = organ.size;
  el("info-structure").textContent = organ.structure;
  el("info-function").textContent = organ.function;
  el("info-clinical").textContent = organ.clinical;

  content.scrollTop = 0;
}

export function clearInfo() {
  el("info-content").hidden = true;
  el("info-empty").hidden = false;
}

export function initInfoClose(onClose) {
  el("info-close").addEventListener("click", onClose);
}

export function hideLoading() {
  el("stage-loading").classList.add("is-hidden");
}

export function setCredit(credit) {
  if (!credit) return;
  const html =
    `3D scan: <a href="${credit.sourceUrl}" target="_blank" rel="noopener">"${credit.title}"</a> ` +
    `by <a href="${credit.authorUrl}" target="_blank" rel="noopener">${credit.author}</a>, ` +
    `licensed <a href="${credit.licenseUrl}" target="_blank" rel="noopener">${credit.license}</a>`;
  const footerTarget = el("model-credit");
  if (footerTarget) footerTarget.innerHTML = html;
  const aboutTarget = el("about-credit");
  if (aboutTarget) aboutTarget.innerHTML = html;
}
