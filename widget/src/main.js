import { initSupabase } from './supabase.js';
import { fetchAllData, submitOrder } from './api.js';
import { createStore } from './state.js';
import { calculatePrice } from './pricing.js';
import { CSS } from './styles.js';

class MerchConfigurator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.store = createStore();
  }

  async connectedCallback() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const attrUrl = this.getAttribute('supabase-url');
    const attrKey = this.getAttribute('supabase-key');
    const url = envUrl || attrUrl;
    const key = envKey || attrKey;

    if (!url || !key) {
      this.shadowRoot.innerHTML = `<p style="color:red">Missing Supabase config.</p>`;
      return;
    }

    try {
      initSupabase(url, key);
    } catch (err) {
      this.shadowRoot.innerHTML = `<p style="color:red">Invalid Supabase config: ${err.message}</p>`;
      return;
    }
    this.renderShell();
    await this.loadData();
  }

  renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="configurator">
        <div class="preview-panel">
          <div class="preview-placeholder">Выберите изделие</div>
        </div>
        <div class="config-panel">
          <div style="text-align:center;padding:40px;color:#999">Загрузка...</div>
        </div>
      </div>
    `;
  }

  async loadData() {
    try {
      const data = await fetchAllData();
      this.store.setData(data);
      this.renderConfigurator();
      this.store.subscribe(() => this.onStateChange());
    } catch (err) {
      this.shadowRoot.querySelector('.config-panel').innerHTML =
        `<p style="color:red;padding:20px">Ошибка загрузки: ${err.message}</p>`;
    }
  }

  renderConfigurator() {
    const data = this.store.getData();
    const panel = this.shadowRoot.querySelector('.config-panel');

    // Find "Без нанесения" default
    const noPrint = data.printMethods.find((m) => m.price === 0 || m.name === 'Без нанесения');
    if (noPrint) {
      this.store.update({ printFrontId: noPrint.id, printBackId: noPrint.id });
    }

    panel.innerHTML = `
      ${this._renderCategories(data.categories)}
      <div class="section hidden" data-section="fit">
        <div class="section-title">Фасон</div>
        <div class="buttons-row" data-fit-buttons></div>
      </div>
      <div class="section hidden" data-section="material">
        <div class="section-title">Материал</div>
        <div class="buttons-row" data-material-buttons></div>
      </div>
      <div class="section hidden" data-section="color">
        <div class="section-title">Цвет</div>
        <div class="color-swatches" data-color-swatches></div>
        <span class="color-name" data-color-name></span>
      </div>
      <div class="section hidden" data-section="print-front">
        <div class="section-title">Нанесение спереди</div>
        <div class="buttons-row" data-print-front-buttons></div>
      </div>
      <div class="section hidden" data-section="print-back">
        <div class="section-title">Нанесение сзади</div>
        <div class="buttons-row" data-print-back-buttons></div>
      </div>
      ${this._renderFooter()}
    `;

    this._bindCategoryEvents();
    this._bindFooterEvents();
  }

  /* ---- Render helpers ---- */

  _renderCategories(categories) {
    // Categories without variants get "coming soon"
    const variants = this.store.getData().productVariants;
    const cards = categories.map((c) => {
      const hasVariants = variants.some((v) => v.category_id === c.id);
      return `
        <div class="option-card ${hasVariants ? '' : 'coming-soon'}"
             data-category-id="${c.id}" ${hasVariants ? '' : 'data-disabled'}>
          ${c.image_url ? `<img src="${c.image_url}" alt="${c.name}">` : ''}
          <div class="name">${c.name}</div>
          ${hasVariants ? '' : '<div style="font-size:11px;color:#999;margin-top:4px">Скоро появится</div>'}
        </div>
      `;
    }).join('');

    return `
      <div class="section" data-section="category">
        <div class="section-title">Изделие</div>
        <div class="options-grid">${cards}</div>
      </div>
    `;
  }

  _renderFooter() {
    return `
      <div class="footer">
        <div class="quantity-row">
          <span class="quantity-label">Тираж:</span>
          <input type="number" class="quantity-input" value="100" min="1">
          <span class="quantity-label">шт.</span>
        </div>
        <div class="min-qty-hint" data-min-qty-hint style="display:none"></div>
        <div class="price-row">
          <span class="price-unit">Цена за шт: <strong data-unit-price>—</strong></span>
          <span class="price-total" data-total-price>—</span>
        </div>
        <button class="submit-btn" disabled>Оставить заявку</button>
      </div>
    `;
  }

  /* ---- Event binding ---- */

  _bindCategoryEvents() {
    this.shadowRoot.querySelectorAll('[data-category-id]').forEach((el) => {
      if (el.hasAttribute('data-disabled')) return;
      el.addEventListener('click', () => {
        this.store.selectCategory(Number(el.dataset.categoryId));
      });
    });
  }

  _bindFooterEvents() {
    const qtyInput = this.shadowRoot.querySelector('.quantity-input');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        this.store.update({ quantity: Math.max(1, parseInt(qtyInput.value) || 1) });
      });
    }
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this._showOrderModal());
    }
  }

  /* ---- State change handler ---- */

  onStateChange() {
    const state = this.store.getState();
    const data = this.store.getData();
    const shadow = this.shadowRoot;

    // Category highlighting
    shadow.querySelectorAll('[data-category-id]').forEach((el) => {
      el.classList.toggle('selected', Number(el.dataset.categoryId) === state.categoryId);
    });

    // Preview image
    const previewPanel = shadow.querySelector('.preview-panel');
    const cat = data.categories.find((c) => c.id === state.categoryId);
    if (cat && cat.image_url) {
      previewPanel.innerHTML = `<img src="${cat.image_url}" alt="${cat.name}">`;
    } else {
      previewPanel.innerHTML = '<div class="preview-placeholder">Выберите изделие</div>';
    }

    // Fit section
    this._updateFitSection(state);

    // Material section
    this._updateMaterialSection(state);

    // Color section
    this._updateColorSection(state);

    // Print sections
    this._updatePrintSection(state, 'print-front', 'printFrontId', 'data-print-front-buttons');
    this._updatePrintSection(state, 'print-back', 'printBackId', 'data-print-back-buttons');

    // Price
    this._updatePrice(state, data);
  }

  _updateFitSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="fit"]');
    const container = this.shadowRoot.querySelector('[data-fit-buttons]');
    if (!state.categoryId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const fits = this.store.getAvailableFits();
    container.innerHTML = fits.map((f) =>
      `<button class="option-btn ${f.id === state.fitId ? 'selected' : ''}" data-fit-id="${f.id}">${f.name}</button>`
    ).join('');
    container.querySelectorAll('[data-fit-id]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.selectFit(Number(btn.dataset.fitId)));
    });
  }

  _updateMaterialSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="material"]');
    const container = this.shadowRoot.querySelector('[data-material-buttons]');
    if (!state.fitId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const materials = this.store.getAvailableMaterials();
    container.innerHTML = materials.map((m) =>
      `<button class="material-btn ${m.id === state.materialId ? 'selected' : ''}" data-material-id="${m.id}">
        ${m.name}
        ${m.description ? `<div class="mat-desc">${m.description}</div>` : ''}
      </button>`
    ).join('');
    container.querySelectorAll('[data-material-id]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.selectMaterial(Number(btn.dataset.materialId)));
    });
  }

  _updateColorSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="color"]');
    const container = this.shadowRoot.querySelector('[data-color-swatches]');
    const nameEl = this.shadowRoot.querySelector('[data-color-name]');
    const colors = this.store.getAvailableColors();
    if (!state.materialId || colors.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    container.innerHTML = colors.map((c) =>
      `<div class="color-swatch ${c.id === state.colorId ? 'selected' : ''}"
           data-color-id="${c.id}" data-color-name="${c.color_name}"
           style="background:${c.hex_code}" title="${c.color_name}"></div>`
    ).join('');
    const sel = colors.find((c) => c.id === state.colorId);
    nameEl.textContent = sel ? sel.color_name : '';
    container.querySelectorAll('[data-color-id]').forEach((el) => {
      el.addEventListener('click', () => {
        this.store.update({ colorId: Number(el.dataset.colorId) });
      });
    });
  }

  _updatePrintSection(state, sectionName, stateKey, containerAttr) {
    const section = this.shadowRoot.querySelector(`[data-section="${sectionName}"]`);
    const container = this.shadowRoot.querySelector(`[${containerAttr}]`);
    if (!state.materialId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const methods = this.store.getData().printMethods;
    const selectedId = state[stateKey];
    container.innerHTML = methods.map((m) =>
      `<button class="print-btn ${m.id === selectedId ? 'selected' : ''}" data-print-id="${m.id}" data-section-key="${stateKey}">
        ${m.name}${Number(m.price) > 0 ? `<span class="price-badge">+${Number(m.price)}₽</span>` : ''}
      </button>`
    ).join('');
    container.querySelectorAll('[data-print-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.update({ [btn.dataset.sectionKey]: Number(btn.dataset.printId) });
      });
    });
  }

  _updatePrice(state, data) {
    const basePrice = this.store.getBasePrice();
    const frontPrice = this.store.getPrintPrice(state.printFrontId);
    const backPrice = this.store.getPrintPrice(state.printBackId);

    const { unitPrice, total, multiplier } = calculatePrice({
      basePrice,
      frontPrintPrice: frontPrice,
      backPrintPrice: backPrice,
      quantity: state.quantity,
      tiers: data.quantityTiers,
    });

    const unitEl = this.shadowRoot.querySelector('[data-unit-price]');
    const totalEl = this.shadowRoot.querySelector('[data-total-price]');
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    const hintEl = this.shadowRoot.querySelector('[data-min-qty-hint]');

    if (basePrice > 0) {
      unitEl.textContent = `${unitPrice.toLocaleString('ru-RU')} ₽`;
      totalEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
    } else {
      unitEl.textContent = '—';
      totalEl.textContent = '—';
    }

    // Enable submit only when full selection made
    const canSubmit = state.categoryId && state.fitId && state.materialId && basePrice > 0;
    submitBtn.disabled = !canSubmit;

    // Min qty hint
    if (state.quantity < 10 && hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = 'При заказе менее 10 шт. действует повышенный коэффициент ×2.0';
    } else if (hintEl) {
      hintEl.style.display = 'none';
    }
  }

  /* ---- Order modal ---- */

  _showOrderModal() {
    const state = this.store.getState();
    if (!state.categoryId) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Оставить заявку</h2>
        <div class="modal-field">
          <label>Имя *</label>
          <input type="text" data-field="name" required>
        </div>
        <div class="modal-field">
          <label>Телефон или Email *</label>
          <input type="text" data-field="contact" required>
        </div>
        <div class="modal-field">
          <label>Комментарий</label>
          <textarea data-field="comment"></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-cancel">Отмена</button>
          <button class="modal-submit">Отправить</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(overlay);

    overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.modal-submit').addEventListener('click', async () => {
      const name = overlay.querySelector('[data-field="name"]').value.trim();
      const contact = overlay.querySelector('[data-field="contact"]').value.trim();
      const comment = overlay.querySelector('[data-field="comment"]').value.trim();

      if (!name || !contact) {
        alert('Заполните имя и контакт');
        return;
      }

      const data = this.store.getData();
      const basePrice = this.store.getBasePrice();
      const frontPrice = this.store.getPrintPrice(state.printFrontId);
      const backPrice = this.store.getPrintPrice(state.printBackId);
      const { unitPrice, total, multiplier } = calculatePrice({
        basePrice,
        frontPrintPrice: frontPrice,
        backPrintPrice: backPrice,
        quantity: state.quantity,
        tiers: data.quantityTiers,
      });

      try {
        await submitOrder({
          customer_name: name,
          customer_contact: contact,
          customer_comment: comment || null,
          configuration: {
            category_id: state.categoryId,
            fit_id: state.fitId,
            material_id: state.materialId,
            color_id: state.colorId,
            print_front_id: state.printFrontId,
            print_back_id: state.printBackId,
            quantity: state.quantity,
            unit_price: unitPrice,
            multiplier,
          },
          quantity: state.quantity,
          calculated_price: total,
        });

        overlay.querySelector('.modal').innerHTML = `
          <div class="success-msg">
            <h2>Заявка отправлена!</h2>
            <p style="color:#999">Мы свяжемся с вами в ближайшее время.</p>
            <button class="submit-btn" style="margin-top:20px;width:auto;padding:12px 32px">Закрыть</button>
          </div>
        `;
        overlay.querySelector('.submit-btn').addEventListener('click', () => overlay.remove());
      } catch (err) {
        alert('Ошибка отправки: ' + err.message);
      }
    });
  }
}

customElements.define('merch-configurator', MerchConfigurator);
