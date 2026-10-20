/**
 * Apresentação Executiva — navegação por slides
 */
(() => {
  "use strict";

  const SPLINE_VIEWER_SRC = "https://unpkg.com/@splinetool/viewer@1.12.13/build/spline-viewer.js";
  const SPLINE_SCENE_URL = "https://prod.spline.design/03bthj2GJ0HDxTps/scene.splinecode";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const numberFormat = new Intl.NumberFormat("pt-BR", { useGrouping: false });
  const pad = (n) => String(n).padStart(2, "0");

  const slides = Array.from(document.querySelectorAll(".slide"));
  const total = slides.length;
  const progressBar = document.querySelector(".progress span");
  const counterCurrent = document.querySelector("[data-counter-current]");
  const counterTotal = document.querySelector("[data-counter-total]");
  const topbarLabel = document.querySelector("[data-topbar-label]");
  const dotsNav = document.querySelector(".dots");
  const prevBtn = document.querySelector('.controls [data-action="prev"]');
  const nextBtn = document.querySelector('.controls [data-action="next"]');
  const fullscreenBtn = document.querySelector('[data-action="fullscreen"]');

  let current = -1;

  counterTotal.textContent = pad(total);

  const dots = slides.map((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.dataset.label = slide.dataset.label;
    dot.setAttribute("aria-label", `Ir para: ${slide.dataset.label}`);
    dot.addEventListener("click", () => goTo(index));
    dotsNav.appendChild(dot);
    return dot;
  });

  // ============================================
  // Navegação
  // ============================================
  function goTo(index) {
    index = Math.max(0, Math.min(total - 1, index));
    if (index === current) return;

    const previous = current;
    current = index;

    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.classList.toggle("is-before", i < index);
      slide.setAttribute("aria-hidden", String(!active));
      slide.inert = !active;
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
      if (i === index) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });

    progressBar.style.setProperty("--progress", (index + 1) / total);
    counterCurrent.textContent = pad(index + 1);
    topbarLabel.textContent = slides[index].dataset.label;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;
    document.body.classList.toggle("on-cover", index === 0);
    history.replaceState(null, "", `#${index + 1}`);

    slides[index].scrollTop = 0;
    if (previous >= 0) stopCounters(slides[previous]);
    runCounters(slides[index]);

    if (index === 0) mountSpline();
    else unmountSpline();
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "next") next();
    else if (action === "prev") prev();
    else if (action === "fullscreen") toggleFullscreen();
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const onButton = event.target.closest && event.target.closest("button");

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        event.preventDefault();
        next();
        break;
      case " ":
        if (onButton) return;
        event.preventDefault();
        event.shiftKey ? prev() : next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        event.preventDefault();
        prev();
        break;
      case "Home":
        event.preventDefault();
        goTo(0);
        break;
      case "End":
        event.preventDefault();
        goTo(total - 1);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
    }
  });

  // Em telas pequenas o slide pode ter rolagem interna: só troca de slide ao chegar na borda
  function canScroll(slide, direction) {
    const max = slide.scrollHeight - slide.clientHeight;
    if (max <= 2) return false;
    return direction > 0 ? slide.scrollTop < max - 2 : slide.scrollTop > 2;
  }

  // Um gesto de roda/trackpad (incluindo a inércia) = um slide
  let wheelLocked = false;
  let wheelTimer = 0;
  window.addEventListener(
    "wheel",
    (event) => {
      const direction = Math.sign(event.deltaY);
      if (!direction || canScroll(slides[current], direction)) return;

      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => (wheelLocked = false), 220);

      if (wheelLocked || Math.abs(event.deltaY) < 20) return;
      wheelLocked = true;
      direction > 0 ? next() : prev();
    },
    { passive: true }
  );

  let touchX = 0;
  let touchY = 0;
  let touchTime = 0;
  window.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      touchX = touch.clientX;
      touchY = touch.clientY;
      touchTime = Date.now();
    },
    { passive: true }
  );
  window.addEventListener(
    "touchend",
    (event) => {
      if (Date.now() - touchTime > 800) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchX;
      const dy = touch.clientY - touchY;

      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        dx < 0 ? next() : prev();
      } else if (Math.abs(dy) > 80 && !canScroll(slides[current], dy < 0 ? 1 : -1)) {
        dy < 0 ? next() : prev();
      }
    },
    { passive: true }
  );

  // ============================================
  // Tela cheia
  // ============================================
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  document.addEventListener("fullscreenchange", () => {
    const icon = fullscreenBtn.querySelector("i");
    const isFull = Boolean(document.fullscreenElement);
    icon.className = isFull ? "ph ph-corners-in" : "ph ph-corners-out";
    fullscreenBtn.setAttribute("aria-label", isFull ? "Sair da tela cheia" : "Tela cheia");
  });

  // ============================================
  // Contadores animados
  // ============================================
  function runCounters(slide) {
    slide.querySelectorAll("[data-count]").forEach((el, i) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const render = (value) => (el.textContent = numberFormat.format(value) + suffix);

      if (reduceMotion) {
        render(target);
        return;
      }

      render(0);
      const duration = 1400;
      el._counterTimer = setTimeout(() => {
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 4);
          render(Math.round(target * eased));
          if (progress < 1) el._counterFrame = requestAnimationFrame(tick);
        };
        el._counterFrame = requestAnimationFrame(tick);
      }, 450 + i * 120);
    });
  }

  function stopCounters(slide) {
    slide.querySelectorAll("[data-count]").forEach((el) => {
      clearTimeout(el._counterTimer);
      cancelAnimationFrame(el._counterFrame);
    });
  }

  // ============================================
  // 3D da capa (Spline)
  // Só existe enquanto a capa está visível: fora dela o WebGL é
  // descarregado, que era a principal causa dos travamentos.
  // ============================================
  const cover3d = document.getElementById("cover3d");
  let splineModule = null;
  let viewer = null;
  let unmountTimer = 0;

  function mountSpline() {
    clearTimeout(unmountTimer);
    if (reduceMotion || !cover3d || viewer) return;

    splineModule = splineModule || import(SPLINE_VIEWER_SRC).catch(() => null);

    const instance = document.createElement("spline-viewer");
    instance.setAttribute("url", SPLINE_SCENE_URL);
    viewer = instance;

    const reveal = () => {
      if (viewer !== instance) return;
      hideSplineLogo(instance);
      cover3d.classList.add("is-ready");
    };

    instance.addEventListener("load-complete", reveal, { once: true });
    cover3d.appendChild(instance);

    [600, 1500, 3000].forEach((ms) => setTimeout(() => viewer === instance && hideSplineLogo(instance), ms));
    setTimeout(reveal, 5000);
  }

  function unmountSpline() {
    if (!viewer) return;
    clearTimeout(unmountTimer);
    unmountTimer = setTimeout(() => {
      cover3d.classList.remove("is-ready");
      viewer.remove();
      viewer = null;
    }, 900);
  }

  function hideSplineLogo(instance) {
    const root = instance.shadowRoot;
    if (!root || root.getElementById("hide-spline-logo")) return;
    const style = document.createElement("style");
    style.id = "hide-spline-logo";
    style.textContent = "#logo, a[href*='spline.design'] { display: none !important; }";
    root.appendChild(style);
  }

  // ============================================
  // Início
  // ============================================
  const fromHash = parseInt(location.hash.slice(1), 10) - 1;
  const startIndex = Number.isInteger(fromHash) ? fromHash : 0;
  requestAnimationFrame(() => requestAnimationFrame(() => goTo(startIndex)));
})();
