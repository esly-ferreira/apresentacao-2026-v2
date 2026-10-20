/**
 * Apresentação Executiva — navegação por slides
 */
(() => {
  "use strict";

  const SPLINE_VIEWER_SRC = "https://cdn.spline.design/@splinetool/viewer@2.0.95/build/spline-viewer.js";
  const SPLINE_SCENE_URL = "https://prod.spline.design/HYpRiN6iBJkaZ8A9/scene.splinecode";

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
  let coverClassTimer = 0;

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
    clearTimeout(coverClassTimer);
    if (index === 0) document.body.classList.add("on-cover");
    else coverClassTimer = setTimeout(() => {
      if (current !== 0) document.body.classList.remove("on-cover");
    }, 700);
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

    if (document.body.classList.contains("person-open")) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePersonModal();
      }
      return;
    }

    const person = event.target.closest && event.target.closest(".person");
    if (person && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openPersonModal(person);
      return;
    }

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
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const render = (value) => (el.textContent = prefix + numberFormat.format(value) + suffix);

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
      pullCameraBack(instance);
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
    }, 1000);
  }

  function pullCameraBack(instance) {
    const spline = instance._spline;
    const orbit = spline?.controls?.orbitControls;
    if (!spline || !orbit || orbit._coverDolly) return;
    orbit._coverDolly = true;
    const current = orbit.spherical?.radius;
    if (current) orbit.maxDistance = Math.max(orbit.maxDistance || 0, current * 2);
    spline.setZoom(0.72);
  }

  function hideSplineLogo(instance) {
    const root = instance.shadowRoot;
    if (!root || root.getElementById("hide-spline-logo")) return;
    const style = document.createElement("style");
    style.id = "hide-spline-logo";
    style.textContent = "a[href*='spline.design'] { display: none !important; }";
    root.appendChild(style);
  }

  // ============================================
  // Fotos do time: sem arquivo, mantém a silhueta
  // ============================================
  document.querySelectorAll(".photo img").forEach((img) => {
    const drop = () => img.remove();
    if (img.complete && !img.naturalWidth) drop();
    else img.addEventListener("error", drop, { once: true });
  });

  document.querySelectorAll(".photo").forEach((photo) => {
    ["holo", "sheen"].forEach((name) => {
      const layer = document.createElement("span");
      layer.className = `photo-${name}`;
      layer.setAttribute("aria-hidden", "true");
      photo.prepend(layer);
    });
    ["glare", "shade"].forEach((name) => {
      const layer = document.createElement("span");
      layer.className = `photo-${name}`;
      layer.setAttribute("aria-hidden", "true");
      photo.append(layer);
    });

    if (reduceMotion) return;

    const reset = () => {
      photo.style.setProperty("--pc-active", "0");
      photo.style.setProperty("--pc-tilt", "0");
      photo.style.setProperty("--pc-reach", "0");
      photo.style.setProperty("--pc-rotate-x", "0deg");
      photo.style.setProperty("--pc-rotate-y", "0deg");
      photo.style.setProperty("--pc-shift-x", "0px");
      photo.style.setProperty("--pc-shift-y", "0px");
    };

    photo.addEventListener("pointermove", (event) => {
      const rect = photo.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const x = px * 2 - 1;
      const y = py * 2 - 1;
      const reach = Math.min(1, Math.hypot(x, y));
      photo.style.setProperty("--pc-light-x", `${(px * rect.width).toFixed(1)}px`);
      photo.style.setProperty("--pc-light-y", `${(py * rect.height).toFixed(1)}px`);
      photo.style.setProperty("--pc-pointer-x", `${(px * 100).toFixed(2)}%`);
      photo.style.setProperty("--pc-pointer-y", `${(py * 100).toFixed(2)}%`);
      photo.style.setProperty("--pc-band-x", `${(50 + x * 15).toFixed(2)}%`);
      photo.style.setProperty("--pc-band-y", `${(50 + y * 15).toFixed(2)}%`);
      photo.style.setProperty("--pc-rotate-x", `${(y * 4).toFixed(2)}deg`);
      photo.style.setProperty("--pc-rotate-y", `${(-x * 4).toFixed(2)}deg`);
      photo.style.setProperty("--pc-shift-x", `${(x * 3).toFixed(2)}px`);
      photo.style.setProperty("--pc-shift-y", `${(y * 3).toFixed(2)}px`);
      photo.style.setProperty("--pc-reach", reach.toFixed(3));
      photo.style.setProperty("--pc-tilt", reach.toFixed(3));
      photo.style.setProperty("--pc-active", "1");
    });
    photo.addEventListener("pointerleave", reset);
  });

  const personModal = document.querySelector(".person-modal");
  const personPanel = personModal.querySelector(".person-modal__panel");
  const modalPhotoBox = personModal.querySelector(".person-modal__photo");
  let personReturn = null;
  let photoToken = 0;

  function setModalPhoto(photo, name) {
    const modalPhoto = modalPhotoBox.querySelector("img");
    const token = ++photoToken;
    const thumb = photo?.getAttribute("src") ? photo.currentSrc || photo.src : "";
    const full = photo?.dataset.full || thumb;

    modalPhoto.onload = modalPhoto.onerror = null;
    modalPhoto.removeAttribute("src");
    modalPhoto.alt = name;

    if (!full) {
      modalPhotoBox.style.removeProperty("--thumb");
      modalPhotoBox.classList.remove("is-loading");
      modalPhoto.hidden = true;
      return;
    }

    modalPhotoBox.style.setProperty("--thumb", `url("${thumb.replace(/"/g, "%22")}")`);
    modalPhotoBox.classList.add("is-loading");
    modalPhoto.hidden = false;

    const reveal = () => {
      if (token !== photoToken) return;
      modalPhotoBox.classList.remove("is-loading");
    };
    modalPhoto.onload = () => {
      if (modalPhoto.decode) modalPhoto.decode().then(reveal, reveal);
      else reveal();
    };
    modalPhoto.onerror = () => {
      if (token !== photoToken) return;
      modalPhoto.hidden = true;
      modalPhotoBox.classList.remove("is-loading");
    };
    modalPhoto.src = full;
  }

  function openPersonModal(person) {
    const name = person.querySelector(".person-name")?.textContent.trim() || "";
    const role = person.querySelector(".person-role")?.textContent.trim() || "";
    const groupLabel = person.closest(".t-lead, .t-group")?.querySelector(".team-label");
    const sector = groupLabel ? groupLabel.childNodes[0].textContent.trim() : "";
    const photo = person.querySelector(".photo img");

    personModal.querySelector(".person-modal__sector").textContent = sector;
    personModal.querySelector(".person-modal__name").textContent = name;
    personModal.querySelector(".person-modal__role").textContent = role;

    const list = personModal.querySelector(".person-modal__list");
    list.replaceChildren();
    person.querySelectorAll(".person-duties li").forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.textContent.trim();
      list.append(li);
    });

    setModalPhoto(photo, name);

    personReturn = document.activeElement;
    personModal.hidden = false;
    document.body.classList.add("person-open");
    requestAnimationFrame(() => personModal.classList.add("is-open"));
    personModal.querySelector(".person-modal__close").focus();
  }

  function closePersonModal() {
    if (personModal.hidden) return;
    personModal.classList.remove("is-open");
    document.body.classList.remove("person-open");
    const finish = () => {
      personModal.hidden = true;
      if (personReturn && personReturn.focus) personReturn.focus();
    };
    if (reduceMotion) finish();
    else personPanel.addEventListener("transitionend", finish, { once: true });
  }

  personModal.querySelector(".person-modal__backdrop").addEventListener("click", closePersonModal);
  personModal.querySelector(".person-modal__close").addEventListener("click", closePersonModal);

  document.querySelectorAll(".person").forEach((person) => {
    person.tabIndex = 0;
    person.setAttribute("role", "button");
    const name = person.querySelector(".person-name")?.textContent.trim() || "pessoa do time";
    person.setAttribute("aria-label", `Ver detalhes de ${name}`);
    person.addEventListener("click", () => openPersonModal(person));

    const full = person.querySelector(".photo img")?.dataset.full;
    if (!full) return;
    const preload = () => {
      new Image().src = full;
    };
    person.addEventListener("pointerenter", preload, { once: true });
    person.addEventListener("focus", preload, { once: true });
  });

  // ============================================
  // Início
  // ============================================
  const fromHash = parseInt(location.hash.slice(1), 10) - 1;
  const startIndex = Number.isInteger(fromHash) ? fromHash : 0;
  requestAnimationFrame(() => requestAnimationFrame(() => goTo(startIndex)));
})();
