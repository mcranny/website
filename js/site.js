const THEME_COLORS = {
  dark: "#0a0a0b",
  light: "#fafaf8",
};

function updateThemeControls() {
  const dark = document.documentElement.dataset.theme === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const label = dark ? "Switch to light mode" : "Switch to dark mode";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function updateThemeColor(theme) {
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const colorScheme = document.querySelector('meta[name="color-scheme"]');
  if (themeColor) themeColor.setAttribute("content", THEME_COLORS[theme]);
  if (colorScheme) colorScheme.setAttribute("content", theme);
}

function updateThemeSurface(theme) {
  const color = THEME_COLORS[theme];
  document.documentElement.style.backgroundColor = color;
  document.documentElement.style.colorScheme = theme;
  if (document.body) document.body.style.backgroundColor = color;
}

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  updateThemeSurface(theme);
  updateThemeColor(theme);
  if (persist) {
    try { localStorage.setItem("theme", theme); } catch {}
  }
  updateThemeControls();
  document.dispatchEvent(new CustomEvent("site:themechange"));
}

function setTheme(theme) {
  applyTheme(theme, true);
}

function syncStoredTheme() {
  let stored;
  try { stored = localStorage.getItem("theme"); } catch { return; }
  const theme = stored === "dark" || stored === "light" ? stored : "light";
  if (theme !== document.documentElement.dataset.theme) applyTheme(theme, false);
}

function initTheme() {
  let stored;
  try { stored = localStorage.getItem("theme"); } catch {}
  const theme = stored === "dark" || stored === "light"
    ? stored
    : document.documentElement.dataset.theme || "light";
  document.documentElement.dataset.theme = theme;
  updateThemeSurface(theme);
  updateThemeColor(theme);
  updateThemeControls();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) syncStoredTheme();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "theme" || event.key === null) syncStoredTheme();
  });
}

function initNavigation() {
  const topbar = document.querySelector(".topbar");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".nav");
  const projects = document.querySelector(".nav-projects");
  const projectsToggle = document.querySelector("[data-projects-toggle]");
  if (!topbar || !navToggle || !nav) return;

  function setProjectsOpen(open) {
    if (!projects || !projectsToggle) return;
    projects.classList.toggle("open", open);
    projectsToggle.setAttribute("aria-expanded", String(open));
  }

  function setNavOpen(open) {
    topbar.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    if (!open) setProjectsOpen(false);
  }

  navToggle.addEventListener("click", () => {
    setNavOpen(!topbar.classList.contains("nav-open"));
  });

  projectsToggle?.addEventListener("click", () => {
    setProjectsOpen(!projects?.classList.contains("open"));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (topbar.contains(event.target)) return;
    setProjectsOpen(false);
    setNavOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const navWasOpen = topbar.classList.contains("nav-open");
    const projectsWasOpen = projects?.classList.contains("open");
    setProjectsOpen(false);
    setNavOpen(false);
    if (navWasOpen) navToggle.focus();
    else if (projectsWasOpen) projectsToggle?.focus();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) setNavOpen(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initTheme();
});
