// JetArayan - Dynamic Category & Product Rendering for Arayan Dashboard (Module)
// This module loads categories and products from Firestore and renders them into arayanDashboard.html
// It also wires up event listeners to integrate with the existing ArayanDashboard class via window.dashboard

import { addDocument, getDocuments } from './firebase-firestore.js';

let currentLicenseKey = null;
let categories = [];
let productsByCategory = new Map();

// Utility: simple slugify for element ids and dataset keys
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-çğıöşü]/g, '') // keep common TR chars
    .replace(/-+/g, '-');
}

async function loadLicenseKey() {
  const result = await getDocuments('keys', {
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 1
  });

  if (result.success && result.data.length > 0) {
    currentLicenseKey = result.data[0].id;
  } else {
    const newKey = await addDocument('keys', {
      name: 'Default License',
      createdAt: new Date().toISOString(),
      isActive: true
    });
    if (!newKey.success) throw new Error('License key oluşturulamadı');
    currentLicenseKey = newKey.id;
  }
}

async function loadCategories() {
  const res = await getDocuments(`keys/${currentLicenseKey}/categories`, {
    orderBy: { field: 'createdAt', direction: 'asc' }
  });
  categories = res.success ? res.data : [];
}

async function loadProducts() {
  productsByCategory.clear();
  for (const cat of categories) {
    const res = await getDocuments(`keys/${currentLicenseKey}/categories/${cat.id}/products`, {
      orderBy: { field: 'createdAt', direction: 'asc' }
    });
    const items = res.success ? res.data : [];
    productsByCategory.set(cat.id, items);
  }
}

function renderUI() {
  const tabsContainer = document.querySelector('.modern-category-tabs');
  const gridContainer = document.querySelector('.modern-product-grid');
  if (!tabsContainer || !gridContainer) return;

  // Empty current content
  tabsContainer.innerHTML = '';
  gridContainer.innerHTML = '';

  // Build a mapping from slug to display name for cart rendering
  const nameMap = {};

  categories.forEach((cat, idx) => {
    const isActive = idx === 0;

    // Render category tab
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'modern-category-tab' + (isActive ? ' active' : '');
    tabBtn.dataset.category = cat.id;
    tabBtn.innerHTML = `
      <div class="tab-icon">
        <i class="fas fa-layer-group"></i>
      </div>
      <span class="tab-label">${cat.name || 'Kategori'}</span>
      <div class="tab-indicator"></div>
    `;
    tabsContainer.appendChild(tabBtn);

    // Render product group for this category
    const group = document.createElement('div');
    group.className = 'modern-product-group';
    group.dataset.category = cat.id;
    group.style.display = isActive ? 'grid' : 'none';

    const prods = productsByCategory.get(cat.id) || [];

    if (prods.length === 0) {
      group.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1">
          <i class="fas fa-box-open"></i>
          <p>Bu kategoride henüz ürün yok</p>
          <small>Ürün eklemek için "+ Ürün" sayfasını kullanın</small>
        </div>
      `;
    } else {
      group.innerHTML = prods.map(p => {
        const slug = slugify(p.name);
        const price = Number(p.price || 0);
        nameMap[slug] = p.name || slug;
        return `
          <div class="modern-product-card" data-product="${slug}" data-price="${price}">
            <div class="product-card-content">
              <div class="product-info">
                <h4 class="product-name">${p.name || ''}</h4>
                <p class="product-price">${price}₺</p>
              </div>
              <div class="product-actions">
                <button class="quantity-btn minus" type="button">
                  <i class="fas fa-minus"></i>
                </button>
                <span class="product-quantity" id="count-${slug}" style="display:none">0</span>
                <button class="quantity-btn plus" type="button">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
            <div class="product-ripple"></div>
          </div>
        `;
      }).join('');
    }

    gridContainer.appendChild(group);
  });

  // Expose map so dashboard can show readable names in cart
  window.productNameMap = nameMap;

  // Wire up events for dynamically created elements
  bindDynamicEvents();

  // Sync summary with current cart (if any)
  if (window.dashboard && typeof window.dashboard.updateOrderSummary === 'function') {
    window.dashboard.updateOrderSummary();
  }
}

function bindDynamicEvents() {
  // Category tab clicks
  document.querySelectorAll('.modern-category-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      if (window.dashboard && typeof window.dashboard.switchCategory === 'function') {
        window.dashboard.switchCategory(category);
      }
    });
  });

  // Plus buttons
  document.querySelectorAll('.modern-product-card .quantity-btn.plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = e.currentTarget.closest('.modern-product-card');
      const slug = card?.dataset.product;
      const price = card?.dataset.price;
      if (slug && window.dashboard && typeof window.dashboard.addToCart === 'function') {
        window.dashboard.addToCart(slug, price);
      }
    });
  });

  // Minus buttons
  document.querySelectorAll('.modern-product-card .quantity-btn.minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = e.currentTarget.closest('.modern-product-card');
      const slug = card?.dataset.product;
      if (slug && window.dashboard && typeof window.dashboard.changeQuantity === 'function') {
        window.dashboard.changeQuantity(slug, -1);
      }
    });
  });
}

async function init() {
  try {
    // Wait for dashboard to be ready and customer visible sections exist
    if (document.readyState === 'loading') {
      await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
    }

    await loadLicenseKey();
    await loadCategories();
    await loadProducts();
    renderUI();
  } catch (err) {
    console.error('ArayanProducts init error:', err);
  }
}

init();