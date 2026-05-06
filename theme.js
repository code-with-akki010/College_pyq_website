(function () {
  const STORAGE_KEY = "campusbytes-theme";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  let toastContainer = null;

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

  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, options = {}) {
    if (!message) return;
    const type = options.type || "info";
    const duration = Number(options.duration) > 0 ? Number(options.duration) : 2800;
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-exclamation",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };

    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    const removeToast = () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 180);
    };

    const timer = setTimeout(removeToast, duration);
    toast.addEventListener("click", () => {
      clearTimeout(timer);
      removeToast();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getInitialTheme());
    setupMobileNav();
    ensureToastContainer();

    window.CampusBytesUI = {
      ...(window.CampusBytesUI || {}),
      showToast
    };

    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
        showToast(`Switched to ${nextTheme} theme`, { type: "info", duration: 1800 });
      });
    });
  });
})();
