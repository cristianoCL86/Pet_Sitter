( () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const loginForm = $("loginForm");
  const loginPanel = $("loginPanel");
  const appContent = $("appContent");
  const loginMessage = $("loginMessage");
  const loginButton = $("loginButton");
  const logoutButton = $("logoutButton");
  const sessionLabel = $("sessionLabel");
  const familyView = new URLSearchParams(window.location.search).get("view") === "family";
  let familyReadToken = "";

  if (familyView && window.location.hash.length > 1) {
    try {
      familyReadToken = decodeURIComponent(window.location.hash.slice(1));
    } catch (_) {
      familyReadToken = "";
    }
    // Mantener el token en el fragmento para permitir recargar y reutilizar el enlace privado.
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    appContent.hidden = true;
    logoutButton.hidden = true;
    sessionLabel.hidden = true;
    loginMessage.textContent = message;
    $("loginPassword").value = "";
  }

  function showApp(session) {
    loginPanel.hidden = true;
    appContent.hidden = false;
    logoutButton.hidden = false;
    sessionLabel.hidden = false;
    sessionLabel.textContent = session.displayName || "Sesión activa";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginMessage.textContent = "Comprobando credenciales…";
    try {
      const session = await window.PetSitterAPI.login(
        $("loginUsername").value,
        $("loginPassword").value
      );
      showApp(session);
      await loadHistory();
    } catch (error) {
      showLogin(error.message || "No fue posible iniciar sesión.");
    } finally {
      loginButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await window.PetSitterAPI.logout();
      showLogin("Sesión cerrada.");
    } catch (error) {
      showLogin("La sesión se cerró en este navegador. No se pudo confirmar la revocación en el servidor.");
    } finally {
      logoutButton.disabled = false;
    }
  });

  // La sesión vive solo en memoria; al recargar la página se solicita acceso otra vez.
  if (!familyView) showLogin();

  const today = new Date();
  $("entryDate").value = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  const levels = ["0%","25%","50%","75%","100%"];
  const pets = window.PET_CATALOG || [];
  const state = new Map();
  const photoFiles = [];
  const history = [];

  function renderPets() {
    $("petsContainer").innerHTML = `
      <div class="family-form-banner">
        <div class="family-form-mark">🏡</div>
        <div class="family-form-copy">
          <span>REGISTRO FAMILIAR</span>
          <strong>Familia Lulu y Maya</strong>
          <small>Completa una ficha para cada perrita</small>
        </div>
        <span class="family-form-count">${pets.length} fichas</span>
      </div>
      ${pets.map(pet => {
        state.set(pet.id, { walkMorning:false, peeMorning:false, poopMorning:false, walkAfternoon:false, peeAfternoon:false, poopAfternoon:false, medicine:false, food:"0%", water:"0%" });
        const theme = pet.id === "lulu" ? "lulu" : pet.id === "maya" ? "maya" : "default";
        const description = pet.id === "lulu" ? "Perrita café" : pet.id === "maya" ? "Perrita blanca" : "Ficha individual";
        return `<article class="pet-card pet-card--${theme}" data-pet="${pet.id}">
          <header class="pet-card-head">
            <span class="pet-card-avatar">${pet.emoji}</span>
            <div class="pet-card-title">
              <h3>${escapeHtml(pet.name)}</h3>
              <small>${description}</small>
            </div>
            <span class="pet-card-tag">Cuidado diario</span>
          </header>

          <div class="pet-slider-row">
            <div class="pet-slider-title"><label for="water-${pet.id}">💧 Agua disponible</label><output id="water-value-${pet.id}">0%</output></div>
            <input id="water-${pet.id}" class="pet-range" type="range" min="0" max="100" step="25" value="0" data-field="water" data-output="water-value-${pet.id}">
            <div class="pet-range-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          <div class="pet-slider-row">
            <div class="pet-slider-title"><label for="food-${pet.id}">🍖 Comida consumida</label><output id="food-value-${pet.id}">0%</output></div>
            <input id="food-${pet.id}" class="pet-range" type="range" min="0" max="100" step="25" value="0" data-field="food" data-output="food-value-${pet.id}">
            <div class="pet-range-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          <label class="pet-toggle">
            <span><span class="pet-toggle-icon">💊</span><span><strong>Medicamento administrado</strong><small>Marcar si recibió su medicamento</small></span></span>
            <input type="checkbox" data-field="medicine"><span class="pet-toggle-control"></span>
          </label>

          <div class="pet-walk-details">
            <section class="pet-walk-card" data-walk-period="Morning">
              <label class="pet-walk-option">
                <span><span>🌅</span><strong>Paseo de mañana</strong></span>
                <input type="checkbox" data-field="walkMorning"><span class="pet-check-control">✓</span>
              </label>
              <div class="pet-needs-row">
                <span class="pet-needs-caption">Necesidades</span>
                <label class="pet-need-option"><input type="checkbox" data-field="peeMorning" disabled><span>💧 Pipí</span></label>
                <label class="pet-need-option"><input type="checkbox" data-field="poopMorning" disabled><span>💩 Popó</span></label>
              </div>
            </section>
            <section class="pet-walk-card" data-walk-period="Afternoon">
              <label class="pet-walk-option">
                <span><span>🌇</span><strong>Paseo de tarde</strong></span>
                <input type="checkbox" data-field="walkAfternoon"><span class="pet-check-control">✓</span>
              </label>
              <div class="pet-needs-row">
                <span class="pet-needs-caption">Necesidades</span>
                <label class="pet-need-option"><input type="checkbox" data-field="peeAfternoon" disabled><span>💧 Pipí</span></label>
                <label class="pet-need-option"><input type="checkbox" data-field="poopAfternoon" disabled><span>💩 Popó</span></label>
              </div>
            </section>
          </div>
        </article>`;
      }).join("")}
    `;

    const updatePetState = event => {
      const card = event.target.closest("[data-pet]");
      if (!card) return;
      const pet = state.get(card.dataset.pet);
      const field = event.target.dataset.field;
      if (!field || !pet) return;
      if (event.target.type === "checkbox") {
        pet[field] = event.target.checked;
        if (field === "walkMorning" || field === "walkAfternoon") {
          const period = field === "walkMorning" ? "Morning" : "Afternoon";
          const walkCard = event.target.closest(".pet-walk-card");
          const needs = walkCard ? walkCard.querySelectorAll('[data-field="pee' + period + '"], [data-field="poop' + period + '"]') : [];
          needs.forEach(control => {
            control.disabled = !event.target.checked;
            if (!event.target.checked) {
              control.checked = false;
              pet[control.dataset.field] = false;
            }
          });
        }
      } else if (event.target.type === "range") {
        pet[field] = event.target.value + "%";
        const output = $(event.target.dataset.output);
        if (output) output.textContent = event.target.value + "%";
      }
    };

    $("petsContainer").addEventListener("input", event => {
      if (event.target.type === "range") updatePetState(event);
    });
    $("petsContainer").addEventListener("change", event => {
      if (event.target.type === "checkbox") updatePetState(event);
    });
  }
  $("dayDescription").addEventListener("input", e => $("charCount").textContent = e.target.value.length);
  async function compressPhotoToBase64(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      throw new Error("Uno de los archivos seleccionados no es una imagen.");
    }

    if (typeof createImageBitmap !== "function") {
      throw new Error("Este navegador no permite procesar las fotografías.");
    }

    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const maxDimension = 1600;

    if (Math.max(width, height) > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    let blob = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw new Error("No fue posible procesar una fotografía.");
      }

      context.drawImage(bitmap, 0, 0, width, height);
      const quality = Math.max(0.45, 0.82 - (attempt % 5) * 0.09);

      blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

      if (blob && blob.size <= 300000) break;

      if (attempt === 4 || attempt === 9) {
        width = Math.max(480, Math.round(width * 0.8));
        height = Math.max(480, Math.round(height * 0.8));
      }
    }

    bitmap.close();

    if (!blob || blob.size > 300000) {
      throw new Error("Una fotografía supera el tamaño permitido incluso después de comprimirla.");
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No fue posible leer una fotografía."));
      reader.readAsDataURL(blob);
    });

    return String(dataUrl).split(",")[1];
  }

  $("photos").addEventListener("change", e => {
    photoFiles.splice(0, photoFiles.length, ...Array.from(e.target.files || []));
    $("photoPreview").innerHTML = "";
    photoFiles.forEach(file => {
      const img = document.createElement("img");
      img.alt = "Vista previa de fotografía";
      img.src = URL.createObjectURL(file);
      $("photoPreview").appendChild(img);
    });
  });
  function renderHistory() {
    const ordered = history.slice().sort((a, b) => {
      const dateComparison = String(b.date).localeCompare(String(a.date));
      if (dateComparison !== 0) return dateComparison;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    const checkLabel = value =>
      value === true || String(value).toLowerCase() === "true";

    const petTheme = name => {
      const normalized = String(name || "").toLowerCase();
      return normalized === "lulu" ? "lulu" : normalized === "maya" ? "maya" : "default";
    };

    const percentValue = value => {
      const parsed = Number.parseInt(String(value || "0").replace("%", ""), 10);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    };

    const needsIcons = (pee, poop) =>
      (checkLabel(pee) ? '<span class="sim-need-icon" title="Hizo pipí">💦</span>' : '') +
      (checkLabel(poop) ? '<span class="sim-need-icon" title="Hizo popó">💩</span>' : '');

    const walkSummary = (period, done, pee, poop, label, icon) => {
      const performed = checkLabel(done);
      return `
        <div class="sim-walk-status ${performed ? "is-done" : "is-pending"}">
          <span class="sim-walk-label">${icon} ${label}: <strong>${performed ? "Realizado" : "Pendiente"}</strong></span>
          <span class="sim-needs-icons">${performed ? needsIcons(pee, poop) : ""}</span>
        </div>`;
    };

    $("historyList").innerHTML = ordered.length ? ordered.map(entry => `
      <article class="history-entry">
        <header class="history-entry-head">
          <div class="history-date-icon" aria-hidden="true">📅</div>
          <div>
            <span class="history-family-label">Familia Lulu y Maya</span>
            <h3 class="history-family-title">Bitácora diaria</h3>
            <time>${escapeHtml(entry.date)}</time>
          </div>
        </header>

        <section class="family-history-group">
          <div class="family-pets-grid">
            ${(entry.pets || []).map(p => {
              const name = p.name || p.pet_name || "Mascota";
              const theme = petTheme(name);
              const water = percentValue(p.water);
              const food = percentValue(p.food);
              const medicine = checkLabel(p.medicine);
              return `
                <section class="history-pet-sim history-pet-sim--${theme}">
                  <header class="sim-pet-heading">
                    <div class="sim-paw">🐾</div>
                    <div class="sim-pet-name">
                      <h5>${escapeHtml(name)}</h5>
                      
                    </div>
                  </header>

                  <div class="sim-vitals">
                    <div class="sim-gauge sim-gauge--water" style="--progress:${water}">
                      <div class="sim-gauge-center"><span>💧</span></div>
                      <span class="sim-gauge-label">${water}%</span>
                      <small>Agua</small>
                    </div>
                    <div class="sim-medicine ${medicine ? "is-given" : ""}" title="Medicamento ${medicine ? "administrado" : "no administrado"}">
                      <span>💊</span>
                      <i>${medicine ? "✓" : "–"}</i>
                    </div>
                    <div class="sim-gauge sim-gauge--food" style="--progress:${food}">
                      <div class="sim-gauge-center"><span>🥩</span></div>
                      <span class="sim-gauge-label">${food}%</span>
                      <small>Comida</small>
                    </div>
                  </div>

                  <div class="sim-walks">
                    ${walkSummary("Morning", p.walkMorning, p.peeMorning, p.poopMorning, "Paseo mañana", "🌅")}
                    ${walkSummary("Afternoon", p.walkAfternoon, p.peeAfternoon, p.poopAfternoon, "Paseo tarde", "🌇")}
                  </div>
                </section>
              `;
            }).join("")}
          </div>
        </section>
        ${entry.description ? `<div class="sim-description"><span>📝</span><p>${escapeHtml(entry.description)}</p></div>` : ""}
      </article>
    `).join("") : '<p class="empty-state">Todavía no hay publicaciones guardadas.</p>';
  }

  async function loadHistory() {
    const historyList = $("historyList");
    historyList.innerHTML = '<p class="empty-state">Cargando publicaciones…</p>';

    try {
      const entries = await window.PetSitterAPI.getEntries();
      history.splice(0, history.length, ...entries);
      renderHistory();
    } catch (error) {
      historyList.innerHTML = '<p class="empty-state">No fue posible cargar el historial. ' +
        escapeHtml(error.message || "Inténtalo nuevamente.") + '</p>';
    }
  }

  function showFamilyAccessError(message) {
    loginPanel.hidden = false;
    appContent.hidden = true;
    logoutButton.hidden = true;
    sessionLabel.hidden = true;
    loginForm.hidden = true;
    loginPanel.querySelector("h1").textContent = "Acceso familiar no disponible";
    loginPanel.querySelector(".login-intro").textContent = message;
    loginMessage.textContent = "Solicita al cuidador un enlace privado vigente.";
    const demoPill = document.querySelector(".demo-pill");
    if (demoPill) demoPill.hidden = true;
  }

  async function loadFamilyHistory(readToken) {
    const historyList = $("historyList");
    historyList.innerHTML = '<p class="empty-state">Cargando publicaciones…</p>';

    try {
      const entries = await window.PetSitterAPI.getFamilyEntries(readToken);
      history.splice(0, history.length, ...entries);
      renderHistory();
    } catch (error) {
      historyList.innerHTML = '<p class="empty-state">No fue posible cargar el historial familiar. ' +
        escapeHtml(error.message || "Verifica que el enlace siga vigente.") + '</p>';
    }
  }

  function showFamilyView() {
    loginPanel.hidden = true;
    appContent.hidden = false;
    logoutButton.hidden = true;
    sessionLabel.hidden = true;

    const welcome = appContent.querySelector(".welcome");
    if (welcome) welcome.hidden = true;

    appContent.querySelectorAll(":scope > .panel, :scope > .actions").forEach(element => {
      element.hidden = true;
    });

    const historyHeading = appContent.querySelector(".history .section-head");
    if (historyHeading) {
      const eyebrow = historyHeading.querySelector(".eyebrow");
      const heading = historyHeading.querySelector("h2");
      if (eyebrow) eyebrow.textContent = "ACCESO PRIVADO PARA LA FAMILIA";
      if (heading) heading.textContent = "Historial de Lulu y Maya";
    }

    const demoPill = document.querySelector(".demo-pill");
    if (demoPill) demoPill.hidden = true;
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  $("saveEntry").addEventListener("click", async () => {
    const saveButton = $("saveEntry");
    const saveMessage = $("saveMessage");

    if (!window.PetSitterAPI.isAuthenticated()) {
      showLogin("Tu sesión no está activa. Inicia sesión nuevamente.");
      return;
    }

    const entry = {
      date: $("entryDate").value,
      description: $("dayDescription").value.trim(),
      pets: pets.map(p => ({ name: p.name, ...state.get(p.id) }))
    };

    if (!entry.date) {
      saveMessage.textContent = "Selecciona una fecha.";
      return;
    }

    if (entry.description.length > 250) {
      saveMessage.textContent = "La descripción no puede superar los 250 caracteres.";
      return;
    }

    if (!entry.pets.length) {
      saveMessage.textContent = "No hay mascotas disponibles para registrar.";
      return;
    }

    saveButton.disabled = true;
    saveMessage.textContent = "Guardando publicación…";

    try {
      const saved = await window.PetSitterAPI.saveEntry(entry);
      const savedEntryId = saved && saved.entryId ? saved.entryId : "";

      let uploadedPhotos = 0;
      let photoError = "";

      if (photoFiles.length && !savedEntryId) {
        photoError = "La publicación se guardó, pero el servidor no devolvió su identificador para asociar las fotografías.";
      } else {
        for (const file of photoFiles) {
          try {
            const base64 = await compressPhotoToBase64(file);
            await window.PetSitterAPI.uploadPhoto(savedEntryId, base64, "image/jpeg");
            uploadedPhotos++;
          } catch (error) {
            photoError = error.message || "No fue posible cargar una de las fotografías.";
            break;
          }
        }
      }

      history.push({
        ...entry,
        entryId: savedEntryId,
        createdAt: saved && saved.createdAt ? saved.createdAt : new Date().toISOString()
      });
      renderHistory();

      if (!photoFiles.length) {
        saveMessage.textContent = "Publicación guardada correctamente en la nube.";
      } else if (!photoError && uploadedPhotos === photoFiles.length) {
        saveMessage.textContent = `Publicación y ${uploadedPhotos} fotografía(s) guardadas correctamente.`;
        photoFiles.length = 0;
        $("photos").value = "";
        $("photoPreview").innerHTML = "";
      } else {
        saveMessage.textContent = `Publicación guardada. Se cargaron ${uploadedPhotos} de ${photoFiles.length} fotografías. ${photoError}`;
      }
    } catch (error) {
      saveMessage.textContent = error.message || "No fue posible guardar la publicación.";
    } finally {
      saveButton.disabled = false;
    }
  });
  renderPets();

  if (familyView) {
    if (!familyReadToken) {
      showFamilyAccessError("El enlace privado está incompleto o no es válido.");
    } else {
      showFamilyView();
      loadFamilyHistory(familyReadToken);
    }
  }
})();
