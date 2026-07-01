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
  if (themeColor) {
    themeColor.setAttribute("content", THEME_COLORS[theme]);
    if (themeColor.parentNode) {
      themeColor.remove();
      document.head.append(themeColor);
    }
  }
  if (colorScheme) colorScheme.setAttribute("content", theme);
}

function updateThemeSurface(theme) {
  const color = THEME_COLORS[theme];
  document.documentElement.style.backgroundColor = color;
  document.documentElement.style.colorScheme = theme;
  if (document.body) {
    document.body.style.backgroundColor = color;
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  updateThemeSurface(theme);
  updateThemeColor(theme);
  localStorage.setItem("theme", theme);
  updateThemeControls();
  document.dispatchEvent(new CustomEvent("site:themechange"));
}

function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) setTheme(stored);
  else {
    const theme = document.documentElement.dataset.theme || "light";
    updateThemeSurface(theme);
    updateThemeColor(theme);
    updateThemeControls();
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  });
}

function initNavToggle() {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".nav");
  if (!topbar || !toggle || !nav) return;

  function setOpen(open) {
    topbar.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  toggle.addEventListener("click", () => {
    setOpen(!topbar.classList.contains("nav-open"));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!topbar.classList.contains("nav-open") || topbar.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) setOpen(false);
  });
}

function initSite() {
  initTheme();
  initNavToggle();
}

document.addEventListener("DOMContentLoaded", initSite);
