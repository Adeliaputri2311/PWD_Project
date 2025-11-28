/* script.js - Bella Mode
   Features:
   - Hamburger menu toggle
   - Cart: add, remove, update qty, render, save to localStorage
   - Checkout (simple)
   - Contact form handling (simple feedback)
*/

(function () {
  "use strict";

  const STORAGE_KEY = "bellaCart_v1";

  // ----------------- Utility -----------------
  function formatIDR(number) {
    // Pastikan menghitung digit-by-digit aritmatika tidak perlu di sini,
    // cukup gunakan built-in formatter.
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
  }

  function $(selector) { return document.querySelector(selector); }
  function $all(selector) { return Array.from(document.querySelectorAll(selector)); }

  // ----------------- Hamburger Menu -----------------
  function initHamburger() {
    const hamb = $("#hamburger");
    const nav = $("#navMenu");
    if (!hamb || !nav) return;

    hamb.addEventListener("click", () => {
      nav.classList.toggle("show");
      hamb.classList.toggle("open");
    });

    // optional: close menu when clicking link
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        nav.classList.remove("show");
        hamb.classList.remove("open");
      }
    });
  }

  // ----------------- Cart Logic -----------------
  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { items: [] };
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return { items: [] };
      return data;
    } catch (e) {
      console.error("Gagal membaca cart dari localStorage:", e);
      return { items: [] };
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Gagal menyimpan cart ke localStorage:", e);
    }
  }

  function findItem(cart, name) {
    return cart.items.find(i => i.name === name);
  }

  function addToCart(name, price, qty = 1) {
    // memastikan price integer
    price = Number(price) || 0;
    qty = Number(qty) || 1;
    const cart = loadCart();
    const existing = findItem(cart, name);
    if (existing) {
      existing.qty = Number(existing.qty) + qty;
    } else {
      cart.items.push({ name, price, qty });
    }
    saveCart(cart);
    renderCart();
    showToast(`"${name}" ditambahkan ke keranjang.`);
  }

  // Expose addToCart global for inline onclick usage in HTML
  window.addToCart = addToCart;

  function updateCartCount() {
    const cart = loadCart();
    const count = cart.items.reduce((acc, it) => acc + Number(it.qty), 0);
    const el = $("#cartCount");
    if (el) el.textContent = String(count);
  }

  // Render cart table (assumes <tbody> in cart page has id="cartItems")
  function renderCart() {
    updateCartCount();
    const cart = loadCart();
    const tbody = document.querySelector("#cartItems tbody") || $("#cartItems");
    const totalPriceEl = $("#totalPrice");

    if (!tbody) return; // not on cart page

    // Clear existing
    tbody.innerHTML = "";

    if (cart.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Keranjang kosong</td></tr>`;
      if (totalPriceEl) totalPriceEl.textContent = formatIDR(0);
      return;
    }

    let grandTotal = 0;

    cart.items.forEach((item, idx) => {
      const name = String(item.name);
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      const total = price * qty;
      grandTotal += total;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="width:56px;height:56px;background:#f0f0f0;border-radius:8px;display:inline-block;flex:0 0 56px;overflow:hidden;">
              <!-- optional: product thumbnail could be inserted here if you store it -->
            </div>
            <div>
              <strong>${escapeHtml(name)}</strong><br>
              <small style="color:#777;">${formatIDR(price)}</small>
            </div>
          </div>
        </td>
        <td>${formatIDR(price)}</td>
        <td>
          <div style="display:flex;gap:8px;align-items:center;justify-content:center">
            <button class="qty-btn" data-idx="${idx}" data-action="decrease">-</button>
            <input class="qty-input" data-idx="${idx}" value="${qty}" style="width:48px;text-align:center;padding:6px;border-radius:6px;border:1px solid #ddd" />
            <button class="qty-btn" data-idx="${idx}" data-action="increase">+</button>
          </div>
        </td>
        <td>${formatIDR(total)}</td>
        <td>
          <button class="btn-remove" data-idx="${idx}">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (totalPriceEl) totalPriceEl.textContent = formatIDR(grandTotal);

    // Attach listeners for qty buttons, inputs and remove buttons
    $all(".qty-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = Number(btn.dataset.idx);
        const action = btn.dataset.action;
        changeQuantityByIndex(idx, action === "increase" ? 1 : -1);
      });
    });

    $all(".qty-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const idx = Number(input.dataset.idx);
        let v = Number(input.value);
        v = Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
        setQuantityByIndex(idx, v);
      });
    });

    $all(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        removeItemByIndex(idx);
      });
    });
  }

  function changeQuantityByIndex(idx, delta) {
    const cart = loadCart();
    if (!cart.items[idx]) return;
    const newQty = Number(cart.items[idx].qty) + delta;
    if (newQty <= 0) {
      // confirm removal
      const ok = confirm("Jumlah menjadi 0. Hapus item dari keranjang?");
      if (ok) {
        cart.items.splice(idx, 1);
      } else {
        return;
      }
    } else {
      cart.items[idx].qty = newQty;
    }
    saveCart(cart);
    renderCart();
  }

  function setQuantityByIndex(idx, qty) {
    const cart = loadCart();
    if (!cart.items[idx]) return;
    if (qty <= 0) {
      const ok = confirm("Masukkan jumlah valid (>0). Hapus item?");
      if (ok) {
        cart.items.splice(idx, 1);
      } else {
        return;
      }
    } else {
      cart.items[idx].qty = qty;
    }
    saveCart(cart);
    renderCart();
  }

  function removeItemByIndex(idx) {
    const cart = loadCart();
    if (!cart.items[idx]) return;
    const item = cart.items[idx];
    const ok = confirm(`Hapus "${item.name}" dari keranjang?`);
    if (!ok) return;
    cart.items.splice(idx, 1);
    saveCart(cart);
    renderCart();
    showToast(`"${item.name}" dihapus dari keranjang.`);
  }

  function clearCart() {
    saveCart({ items: [] });
    renderCart();
  }

  // ----------------- Checkout -----------------
  function checkout() {
    const cart = loadCart();
    if (!cart.items || cart.items.length === 0) {
      alert("Keranjang kosong.");
      return;
    }

    const total = cart.items.reduce((acc, it) => acc + (Number(it.price) * Number(it.qty)), 0);
    const ok = confirm(`Total pembayaran ${formatIDR(total)}. Lanjutkan checkout?`);
    if (!ok) return;

    // Here you'd post order to server. We'll simulate success:
    clearCart();
    alert("Terima kasih! Pesanan Anda berhasil diproses (simulasi).");
  }

  // ----------------- Misc UI Helpers -----------------
  function showToast(message, duration = 2200) {
    // simple ephemeral toast
    let toast = document.getElementById("__bella_toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "__bella_toast";
      toast.style.position = "fixed";
      toast.style.right = "20px";
      toast.style.bottom = "20px";
      toast.style.padding = "12px 16px";
      toast.style.background = "#222";
      toast.style.color = "#fff";
      toast.style.borderRadius = "10px";
      toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
      toast.style.zIndex = 3000;
      toast.style.fontSize = "14px";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    clearTimeout(toast.__timeout);
    toast.__timeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, duration);
  }

  // Simple HTML escape for product names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ----------------- Contact Form -----------------
  function initContactForm() {
    const form = document.querySelector(".contact-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // Simple UI feedback — in production, send to server
      const name = form.querySelector('input[type="text"]')?.value || "";
      showToast(`Terima kasih ${name || ""}! Pesan Anda telah dikirim.`, 2500);
      form.reset();
    });
  }

  // ----------------- Init product buttons (in pages that don't use inline onclick) -----------------
  function initProductButtons() {
    // Buttons that already have onclick (global addToCart) will work.
    // We'll also attach to .btn-add-cart elements for progressive enhancement.
    $all(".btn-add-cart").forEach(btn => {
      // If inline onclick present, skip to avoid double-binding
      if (btn.hasAttribute("data-bella-bound")) return;
      btn.addEventListener("click", (e) => {
        // try to read product name & price from DOM structure
        const card = btn.closest(".product-card");
        let name = "Produk";
        let price = 0;
        if (card) {
          const nm = card.querySelector(".product-name");
          const pr = card.querySelector(".product-price");
          if (nm) name = nm.textContent.trim();
          if (pr) {
            // remove non-digit characters
            const digits = pr.textContent.replace(/[^\d]/g, "");
            price = Number(digits) || 0;
          }
        }
        addToCart(name, price, 1);
      });
      btn.setAttribute("data-bella-bound", "1");
    });
  }

  // ----------------- Bind checkout button -----------------
  function initCheckoutButton() {
    const btn = $("#checkoutBtn");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      checkout();
    });
  }

  // ----------------- On DOM Ready -----------------
  document.addEventListener("DOMContentLoaded", () => {
    initHamburger();
    renderCart();
    initContactForm();
    initProductButtons();
    initCheckoutButton();

    // Accessibility: mark nav links as focusable when shown
    const nav = $("#navMenu");
    if (nav) {
      nav.addEventListener("transitionend", () => {
        // no-op but could be used for further accessibility logic
      });
    }

    // close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      const nav = $("#navMenu");
      const hamb = $("#hamburger");
      if (!nav || !hamb) return;
      if (!nav.contains(e.target) && !hamb.contains(e.target)) {
        nav.classList.remove("show");
        hamb.classList.remove("open");
      }
    });
  });

  // Expose some helpers for debugging in console (optional)
  window._bella = {
    loadCart,
    saveCart,
    renderCart,
    clearCart,
    addToCart,
  };

})();
