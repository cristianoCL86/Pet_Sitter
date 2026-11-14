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
    $("historyList").innerHTML = history.length ? history.slice().reverse().map(entry =>
      `<article class="history-entry"><time>${entry.date}</time><p>${escapeHtml(entry.description || "Sin descripción.")}</p><small>${entry.pets.map(p=>p.name).join(" · ")}</small></article>`
    ).join("") : '<p class="empty-state">Todavía no hay publicaciones guardadas en esta demostración.</p>';
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  $("saveEntry").addEventListener("click", () => {
    if (!window.PetSitterAPI.isAuthenticated()) {
      showLogin("Tu sesión no está activa. Inicia sesión nuevamente.");
      return;
    }
    const entry = {
      date: $("entryDate").value,
      description: $("dayDescription").value.trim(),
      pets: pets.map(p => ({ name:p.name, ...state.get(p.id) })),
      photoCount: photoFiles.length
    };
    if (!entry.date) { $("saveMessage").textContent = "Selecciona una fecha."; return; }
    history.push(entry);
    renderHistory();
    $("saveMessage").textContent = "Registro agregado a la demostración local. Todavía no se guarda en la nube.";
  });
  renderPets();
})();
