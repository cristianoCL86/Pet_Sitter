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
    $("petsContainer").innerHTML = pets.map(pet => {
      state.set(pet.id, { walkMorning:false, walkAfternoon:false, medicine:false, food:"0%", water:"0%" });
      return `<article class="pet-card" data-pet="${pet.id}">
        <h3><span>${pet.emoji}</span>${pet.name}</h3>
        <label class="check-row">Paseo mañana <input type="checkbox" data-field="walkMorning"></label>
        <label class="check-row">Paseo tarde <input type="checkbox" data-field="walkAfternoon"></label>
        <label class="check-row">Medicinas administradas <input type="checkbox" data-field="medicine"></label>
        <div class="metric"><label>Comida</label><select data-field="food">${levels.map(v=>`<option>${v}</option>`).join("")}</select></div>
        <div class="metric"><label>Agua</label><select data-field="water">${levels.map(v=>`<option>${v}</option>`).join("")}</select></div>
      </article>`;
    }).join("");
    $("petsContainer").addEventListener("change", event => {
      const card = event.target.closest("[data-pet]");
      if (!card) return;
      const pet = state.get(card.dataset.pet);
      const field = event.target.dataset.field;
      if (field) pet[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
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
      value === true || String(value).toLowerCase() === "true" ? "Sí" : "No";

    const petIcon = name => {
      const normalized = String(name || "").toLowerCase();
      return normalized === "lulu" ? "🐶" : normalized === "maya" ? "🐩" : "🐾";
    };

    const petTheme = name => {
      const normalized = String(name || "").toLowerCase();
      return normalized === "lulu" ? "lulu" : normalized === "maya" ? "maya" : "default";
    };

    $("historyList").innerHTML = ordered.length ? ordered.map(entry => `
      <article class="history-entry">
        <header class="history-entry-head">
          <div class="history-date-icon" aria-hidden="true">📅</div>
          <div>
            <span class="history-family-label">Familia</span>
            <h3 class="history-family-title">Lulu y Maya</h3>
            <time>${escapeHtml(entry.date)}</time>
          </div>
        </header>

        <div class="history-description">
          <span class="history-description-icon" aria-hidden="true">📝</span>
          <p>${escapeHtml(entry.description || "Sin descripción.")}</p>
        </div>

        <section class="family-history-group">
          <div class="family-history-heading">
            <span aria-hidden="true">🏡</span>
            <div>
              <h4>Familia Lulu y Maya</h4>
              <small>Resumen del cuidado</small>
            </div>
          </div>

          <div class="family-pets-grid">
            ${(entry.pets || []).map(p => {
              const name = p.name || p.pet_name || "Mascota";
              const theme = petTheme(name);
              return `
                <section class="history-pet history-pet--${theme}">
                  <div class="history-pet-heading">
                    <span class="history-pet-avatar" aria-hidden="true">${petIcon(name)}</span>
                    <div>
                      <h5>${escapeHtml(name)}</h5>
                      <small>Ficha de cuidado</small>
                    </div>
                  </div>

                  <div class="pet-care-grid">
                    <div class="pet-care-item">
                      <span class="pet-care-icon" aria-hidden="true">🌅</span>
                      <span class="pet-care-label">Paseo mañana</span>
                      <strong>${checkLabel(p.walkMorning)}</strong>
                    </div>
                    <div class="pet-care-item">
                      <span class="pet-care-icon" aria-hidden="true">🌇</span>
                      <span class="pet-care-label">Paseo tarde</span>
                      <strong>${checkLabel(p.walkAfternoon)}</strong>
                    </div>
                    <div class="pet-care-item">
                      <span class="pet-care-icon" aria-hidden="true">💊</span>
                      <span class="pet-care-label">Medicamentos</span>
                      <strong>${checkLabel(p.medicine)}</strong>
                    </div>
                    <div class="pet-care-item">
                      <span class="pet-care-icon" aria-hidden="true">🍖</span>
                      <span class="pet-care-label">Comida</span>
                      <strong>${escapeHtml(p.food ?? "Sin registro")}</strong>
                    </div>
                    <div class="pet-care-item">
                      <span class="pet-care-icon" aria-hidden="true">💧</span>
                      <span class="pet-care-label">Agua</span>
                      <strong>${escapeHtml(p.water ?? "Sin registro")}</strong>
                    </div>
                  </div>
                </section>
              `;
            }).join("")}
          </div>
        </section>
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
