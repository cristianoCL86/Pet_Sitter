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
  showLogin();

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
      history.push({
        ...entry,
        entryId: saved && saved.entryId ? saved.entryId : "",
        createdAt: saved && saved.createdAt ? saved.createdAt : new Date().toISOString()
      });
      renderHistory();
      saveMessage.textContent = "Publicación guardada correctamente en la nube. Las fotografías aún no se han cargado.";
    } catch (error) {
      saveMessage.textContent = error.message || "No fue posible guardar la publicación.";
    } finally {
      saveButton.disabled = false;
    }
  });
  renderPets();
})();
