// Cliente de autenticación Pet_Sitter.
// No colocar secretos compartidos ni contraseñas en este archivo.
// El token de sesión se mantiene solo en memoria mientras la página esté abierta.
(() => {
  "use strict";

  const API_URL = "https://pet-sitter-api.cristian-oviedo-l.workers.dev/";
  let currentSession = null;

  async function request(action, fields = {}) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...fields })
    });

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error("El servidor devolvió una respuesta no válida.");
    }

    if (!response.ok || !data || data.ok !== true) {
      throw new Error(data && typeof data.error === "string"
        ? data.error
        : "No fue posible completar la solicitud.");
    }
    return data;
  }

  window.PetSitterAPI = {
    isConfigured() {
      return Boolean(API_URL);
    },

    async health() {
      const data = await request("health");
      return { ok: true, service: data.service || "Pet_Sitter_API" };
    },

    async login(username, password) {
      if (typeof username !== "string" || typeof password !== "string" ||
          !username.trim() || !password) {
        throw new Error("Ingresa tu usuario y contraseña.");
      }

      const data = await request("login", {
        username: username.trim(),
        password
      });

      if (!data.session || typeof data.session.token !== "string" ||
          !data.session.token) {
        throw new Error("La respuesta de inicio de sesión no contiene una sesión válida.");
      }

      currentSession = {
        token: data.session.token,
        displayName: data.session.displayName || "",
        familyName: data.session.familyName || "",
        expiresAt: data.session.expiresAt || ""
      };

      return {
        displayName: currentSession.displayName,
        familyName: currentSession.familyName,
        expiresAt: currentSession.expiresAt
      };
    },

    isAuthenticated() {
      return Boolean(currentSession && currentSession.token);
    },

    getSessionInfo() {
      if (!currentSession) return null;
      return {
        displayName: currentSession.displayName,
        familyName: currentSession.familyName,
        expiresAt: currentSession.expiresAt
      };
    },

    async logout() {
      if (!currentSession) return { ok: true, revoked: false };

      const token = currentSession.token;
      currentSession = null;

      const data = await request("logout", { token });
      return { ok: true, revoked: data.revoked === true };
    }
  };
})();
