// Configuración del backend. No colocar secretos ni tokens en este archivo.
// La URL de Apps Script se configurará al desplegar el backend.
window.PET_SITTER_API_URL = "";
window.PetSitterAPI = {
  isConfigured() { return Boolean(window.PET_SITTER_API_URL); },
  async listEntries(familyToken) {
    if (!this.isConfigured()) return [];
    const url = new URL(window.PET_SITTER_API_URL);
    url.searchParams.set("action", "list");
    url.searchParams.set("family", familyToken);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("No fue posible consultar la bitácora.");
    return response.json();
  },
  async createEntry(payload, sitterToken) {
    if (!this.isConfigured()) throw new Error("El backend aún no está configurado. Esta versión funciona en modo demostración.");
    const response = await fetch(window.PET_SITTER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "create", token: sitterToken, payload })
    });
    if (!response.ok) throw new Error("No fue posible guardar la publicación.");
    return response.json();
  }
};