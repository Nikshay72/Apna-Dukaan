// products.js
// Handles the interactive product card section on the generated shop website.
// Features: add new card, upload photo, AI enhance choice popup, rename, delete.

(function () {
  "use strict";

  // ── CONFIG ──────────────────────────────────────────────────────────────
  const API_BASE = "";  // same origin — Flask serves both frontend and API

  // ── STATE ────────────────────────────────────────────────────────────────
  let products = [];    // Array of { id, name, image_url, enhanced, emoji, background_style }

  // ── INIT ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    loadExistingProducts();
    bindAddButton();
  });

  // ── LOAD EXISTING PRODUCTS FROM SESSION ──────────────────────────────────
  async function loadExistingProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const data = await res.json();
      if (data.success && data.products.length > 0) {
        data.products.forEach(p => addCardToGrid(p));
        products = data.products;
      }
    } catch (e) {
      // Silent fail — grid starts empty
    }
  }

  // ── BIND THE "+ ADD PRODUCT" BUTTON ──────────────────────────────────────
  function bindAddButton() {
    const btn = document.getElementById("add-product-btn");
    if (btn) btn.addEventListener("click", () => openUploadFlow());
  }

  // ── OPEN UPLOAD FLOW ─────────────────────────────────────────────────────
  // Creates a hidden file input, triggers it, then handles the upload
  function openUploadFlow() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async () => {
      const file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      // Ask for product name before uploading
      const name = await showNamePrompt();
      if (name === null) return; // user cancelled

      await uploadPhoto(file, name);
    });

    input.click();
  }

  // ── SHOW NAME PROMPT MODAL ───────────────────────────────────────────────
  function showNamePrompt() {
    return new Promise((resolve) => {
      const overlay = createOverlay();
      const box = document.createElement("div");
      box.className = "apd-modal";
      box.innerHTML = `
        <p class="apd-modal-title">Product ka naam kya hai?</p>
        <input class="apd-modal-input" type="text" placeholder="e.g. Banarasi Saree, Samosa, Chair..." maxlength="40" autofocus />
        <div class="apd-modal-actions">
          <button class="apd-btn-secondary" id="apd-cancel-name">Cancel</button>
          <button class="apd-btn-primary" id="apd-confirm-name">Next →</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const input = box.querySelector(".apd-modal-input");
      input.focus();

      box.querySelector("#apd-cancel-name").onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      box.querySelector("#apd-confirm-name").onclick = () => {
        const val = input.value.trim();
        document.body.removeChild(overlay);
        resolve(val || "My Product");
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") box.querySelector("#apd-confirm-name").click();
      });
    });
  }

  // ── UPLOAD PHOTO TO BACKEND ───────────────────────────────────────────────
  async function uploadPhoto(file, name) {
    // Show loading card
    const loadingCard = addLoadingCard();

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("name", name);

      const res = await fetch(`${API_BASE}/api/products/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      const data = await res.json();

      removeLoadingCard(loadingCard);

      if (!data.success) {
        showToast("Upload failed: " + data.error, "error");
        return;
      }

      // Add card to grid
      const product = {
        id: data.product_id,
        name: data.name,
        image_url: data.image_url,
        enhanced: false,
        emoji: "📷",
        background_style: "white"
      };
      products.push(product);
      addCardToGrid(product);

      // Ask owner: enhance with AI?
      showEnhanceChoice(data.product_id);

    } catch (e) {
      removeLoadingCard(loadingCard);
      showToast("Upload failed. Check your connection.", "error");
    }
  }

  // ── SHOW AI ENHANCE CHOICE POPUP ─────────────────────────────────────────
  function showEnhanceChoice(productId) {
    const overlay = createOverlay();
    const box = document.createElement("div");
    box.className = "apd-modal";
    box.innerHTML = `
      <div class="apd-enhance-icon">✨</div>
      <p class="apd-modal-title">AI se enhance karein?</p>
      <p class="apd-modal-sub">AI aapki photo ko analyze karke product ka naam aur presentation better karega. Original photo same rahegi.</p>
      <div class="apd-modal-actions">
        <button class="apd-btn-secondary" id="apd-skip-enhance">Skip, rakhne do</button>
        <button class="apd-btn-primary" id="apd-do-enhance">✨ Haan, enhance karo</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.querySelector("#apd-skip-enhance").onclick = () => {
      document.body.removeChild(overlay);
      showToast("Photo add ho gayi!", "success");
    };

    box.querySelector("#apd-do-enhance").onclick = async () => {
      document.body.removeChild(overlay);
      await runEnhancement(productId);
    };
  }

  // ── RUN AI ENHANCEMENT ───────────────────────────────────────────────────
  async function runEnhancement(productId) {
    const card = document.getElementById(`apd-card-${productId}`);
    if (card) {
      card.classList.add("apd-card-loading");
      const overlay = card.querySelector(".apd-card-overlay");
      if (overlay) overlay.textContent = "✨ AI analyze kar raha hai...";
    }

    try {
      const res = await fetch(`${API_BASE}/api/products/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product_id: productId })
      });
      const data = await res.json();

      if (!data.success) {
        showToast("Enhancement failed: " + data.error, "error");
        if (card) card.classList.remove("apd-card-loading");
        return;
      }

      // Update card in products array
      const p = products.find(x => x.id === productId);
      if (p) {
        p.enhanced = true;
        p.name = data.enhanced_name;
        p.emoji = data.emoji;
        p.background_style = data.background_style;
      }

      // Update the card in the DOM
      updateCardInDOM(productId, data);
      showToast("✨ Enhancement done! Product ab aur presentable lag raha hai.", "success");

    } catch (e) {
      showToast("Enhancement failed. Try again.", "error");
      if (card) card.classList.remove("apd-card-loading");
    }
  }

  // ── ADD CARD TO GRID ──────────────────────────────────────────────────────
  function addCardToGrid(product) {
    const grid = document.getElementById("apd-products-grid");
    if (!grid) return;

    const bgClass = {
      "white": "apd-bg-white",
      "gradient": "apd-bg-gradient",
      "warm": "apd-bg-warm"
    }[product.background_style] || "apd-bg-white";

    const card = document.createElement("div");
    card.className = `apd-product-card ${product.enhanced ? "apd-card-enhanced" : ""}`;
    card.id = `apd-card-${product.id}`;
    card.innerHTML = `
      <div class="apd-card-img-wrap ${bgClass}">
        <img src="${product.image_url}" alt="${product.name}" class="apd-card-img" />
        ${product.enhanced ? `<div class="apd-enhanced-badge">✨ Enhanced</div>` : ""}
        <div class="apd-card-actions">
          <button class="apd-card-btn apd-btn-rename" title="Naam badlo" onclick="window._apdRename('${product.id}')">✏️</button>
          <button class="apd-card-btn apd-btn-delete" title="Hatao" onclick="window._apdDelete('${product.id}')">🗑️</button>
        </div>
      </div>
      <div class="apd-card-name" id="apd-name-${product.id}">${product.emoji || ""} ${product.name}</div>`;

    grid.appendChild(card);
  }

  // ── ADD LOADING CARD ──────────────────────────────────────────────────────
  function addLoadingCard() {
    const grid = document.getElementById("apd-products-grid");
    if (!grid) return null;
    const card = document.createElement("div");
    card.className = "apd-product-card apd-card-placeholder apd-card-loading";
    card.innerHTML = `<div class="apd-placeholder-inner"><div class="apd-spinner"></div><span>Upload ho raha hai...</span></div>`;
    grid.appendChild(card);
    return card;
  }

  function removeLoadingCard(card) {
    if (card && card.parentNode) card.parentNode.removeChild(card);
  }

  // ── UPDATE CARD IN DOM AFTER ENHANCEMENT ──────────────────────────────────
  function updateCardInDOM(productId, data) {
    const card = document.getElementById(`apd-card-${productId}`);
    if (!card) return;

    card.classList.remove("apd-card-loading");
    card.classList.add("apd-card-enhanced");

    const bgClass = { "white": "apd-bg-white", "gradient": "apd-bg-gradient", "warm": "apd-bg-warm" }[data.background_style] || "apd-bg-white";
    const wrap = card.querySelector(".apd-card-img-wrap");
    if (wrap) {
      wrap.className = `apd-card-img-wrap ${bgClass}`;
      // Add enhanced badge if not already there
      if (!wrap.querySelector(".apd-enhanced-badge")) {
        const badge = document.createElement("div");
        badge.className = "apd-enhanced-badge";
        badge.textContent = "✨ Enhanced";
        wrap.appendChild(badge);
      }
      // Remove loading overlay
      const overlay = wrap.querySelector(".apd-card-overlay");
      if (overlay) overlay.remove();
    }

    const nameEl = document.getElementById(`apd-name-${productId}`);
    if (nameEl) nameEl.textContent = `${data.emoji || ""} ${data.enhanced_name}`;
  }

  // ── RENAME PRODUCT ────────────────────────────────────────────────────────
  window._apdRename = async function (productId) {
    const current = products.find(p => p.id === productId);
    const newName = prompt("Naya naam daalo:", current ? current.name : "");
    if (!newName || !newName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product_id: productId, name: newName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        const nameEl = document.getElementById(`apd-name-${productId}`);
        const p = products.find(x => x.id === productId);
        if (nameEl) nameEl.textContent = `${p ? p.emoji || "" : ""} ${newName.trim()}`;
        if (p) p.name = newName.trim();
        showToast("Naam update ho gaya!", "success");
      }
    } catch (e) {
      showToast("Rename failed.", "error");
    }
  };

  // ── DELETE PRODUCT ────────────────────────────────────────────────────────
  window._apdDelete = async function (productId) {
    if (!confirm("Kya aap is product ko hatana chahte hain?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        const card = document.getElementById(`apd-card-${productId}`);
        if (card) {
          card.style.transition = "opacity 0.25s, transform 0.25s";
          card.style.opacity = "0";
          card.style.transform = "scale(0.9)";
          setTimeout(() => card.remove(), 280);
        }
        products = products.filter(p => p.id !== productId);
        showToast("Product remove ho gaya.", "success");
      }
    } catch (e) {
      showToast("Delete failed.", "error");
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "apd-overlay";
    return overlay;
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `apd-toast apd-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("apd-toast-show"), 10);
    setTimeout(() => {
      toast.classList.remove("apd-toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

})();
