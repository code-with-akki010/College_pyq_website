(function () {
  const STORAGE_KEY = "campusbytes-theme";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    return prefersDark.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);

    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
      button.setAttribute("title", `Switch to ${isDark ? "light" : "dark"} theme`);
      button.innerHTML = `<i class="fa-solid fa-${isDark ? "sun" : "moon"}"></i>`;
    });
  }

  function setupMobileNav() {
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (!navToggle || !navLinks) return;

    function setNavState(isOpen) {
      navLinks.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", `${isOpen ? "Close" : "Open"} navigation`);
      navToggle.innerHTML = `<i class="fa-solid fa-${isOpen ? "xmark" : "bars"}"></i>`;
    }

    navToggle.addEventListener("click", () => {
      setNavState(!navLinks.classList.contains("open"));
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setNavState(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        setNavState(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getInitialTheme());
    setupMobileNav();

    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
      });
    });
  });
})();
