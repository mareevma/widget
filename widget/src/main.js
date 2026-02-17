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
    // Get config from attributes
    const url = this.getAttribute('supabase-url');
    const key = this.getAttribute('supabase-key');

    if (!url || !key) {
      this.shadowRoot.innerHTML = '<p style="color:red">Missing supabase-url or supabase-key attributes</p>';
      return;
    }

    initSupabase(url, key);
    this.render();
    await this.loadData();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="configurator">
        <div class="preview-panel">
          <div class="preview-placeholder">Выберите изделие</div>
        </div>
        <div class="config-panel">
          <div class="loading" style="text-align:center;padding:40px;color:var(--text-secondary)">
            Загрузка...
          </div>
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
      const panel = this.shadowRoot.querySelector('.config-panel');
      panel.innerHTML = `<p style="color:red;padding:20px">Ошибка загрузки: ${err.message}</p>`;
    }
  }

  renderConfigurator() {
    const data = this.store.getData();
    const panel = this.shadowRoot.querySelector('.config-panel');

    let html = '';

    // Category section
    html += this.renderCategorySection(data.categories);

    // Dynamic sections
    for (const section of data.sections) {
      if (section.slug === 'color') {
        html += this.renderColorSection(section);
      } else if (section.slug === 'customization') {
        html += this.renderCustomizationSection(section, data.options.filter(o => o.section_id === section.id));
      } else {
        html += this.renderOptionSection(section);
      }
    }

    // Footer
    html += this.renderFooter();

    panel.innerHTML = html;
    this.bindEvents();
  }

  renderCategorySection(categories) {
    const cards = categories.map(c => `
      <div class="option-card" data-category-id="${c.id}">
        ${c.image_url ? `<img src="${c.image_url}" alt="${c.name}">` : ''}
        <div class="name">${c.name}</div>
      </div>
    `).join('');

    return `
      <div class="section" data-section="category">
        <div class="section-title">Изделие</div>
        <div class="options-grid">${cards}</div>
      </div>
    `;
  }

  renderOptionSection(section) {
    return `
      <div class="section" data-section="${section.slug}">
        <div class="section-title">${section.name}</div>
        <div class="buttons-row" data-section-id="${section.id}"></div>
      </div>
    `;
  }

  renderColorSection(section) {
    return `
      <div class="section" data-section="color">
        <div class="section-title">${section.name}</div>
        <div class="color-swatches" data-section-id="${section.id}"></div>
        <span class="color-name"></span>
      </div>
    `;
  }

  renderCustomizationSection(section, options) {
    const items = options.map(o => `
      <div class="checkbox-item" data-option-id="${o.id}">
        ${o.name}
      </div>
    `).join('');

    return `
      <div class="section" data-section="customization">
        <div class="section-title">${section.name}</div>
        <div class="checkbox-grid">${items}</div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="footer">
        <div class="quantity-row">
          <span class="quantity-label">Тираж:</span>
          <input type="number" class="quantity-input" value="100" min="1">
          <span class="quantity-label">шт.</span>
        </div>
        <div class="price-row">
          <span class="price-unit">Цена за шт: <strong data-unit-price>0 ₽</strong></span>
          <span class="price-total" data-total-price>0 ₽</span>
        </div>
        <button class="submit-btn">Оставить заявку</button>
      </div>
    `;
  }

  bindEvents() {
    const shadow = this.shadowRoot;

    // Category click
    shadow.querySelectorAll('[data-category-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.categoryId);
        this.store.update({ categoryId: id, selections: {}, customizations: [] });
      });
    });

    // Quantity input
    const qtyInput = shadow.querySelector('.quantity-input');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        const qty = Math.max(1, parseInt(qtyInput.value) || 1);
        this.store.update({ quantity: qty });
      });
    }

    // Submit button
    const submitBtn = shadow.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.showOrderModal());
    }

    // Customization checkboxes
    shadow.querySelectorAll('.checkbox-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.optionId);
        const customs = [...this.store.getState().customizations];
        const idx = customs.indexOf(id);
        if (idx >= 0) customs.splice(idx, 1);
        else customs.push(id);
        this.store.update({ customizations: customs });
      });
    });
  }

  onStateChange() {
    const state = this.store.getState();
    const data = this.store.getData();
    const shadow = this.shadowRoot;

    // Update category selection
    shadow.querySelectorAll('[data-category-id]').forEach(el => {
      el.classList.toggle('selected', Number(el.dataset.categoryId) === state.categoryId);
    });

    // Update preview image
    const previewPanel = shadow.querySelector('.preview-panel');
    const selectedCat = data.categories.find(c => c.id === state.categoryId);
    if (selectedCat && selectedCat.image_url) {
      previewPanel.innerHTML = `<img src="${selectedCat.image_url}" alt="${selectedCat.name}">`;
    } else {
      previewPanel.innerHTML = '<div class="preview-placeholder">Выберите изделие</div>';
    }

    // Update dynamic option sections
    for (const section of data.sections) {
      if (section.slug === 'color') {
        this.updateColorSection(section, state);
      } else if (section.slug !== 'customization') {
        this.updateOptionSection(section, state);
      }
    }

    // Update customization checkboxes
    shadow.querySelectorAll('.checkbox-item').forEach(el => {
      el.classList.toggle('selected', state.customizations.includes(Number(el.dataset.optionId)));
    });

    // Update price
    this.updatePrice(state);
  }

  updateOptionSection(section, state) {
    const container = this.shadowRoot.querySelector(`[data-section-id="${section.id}"].buttons-row`);
    if (!container) return;

    const options = this.store.getOptionsForSection(section.id);
    const selectedId = state.selections[section.slug];

    container.innerHTML = options.map(o => `
      <button class="option-btn ${o.id === selectedId ? 'selected' : ''}" data-opt-id="${o.id}" data-section-slug="${section.slug}">
        ${o.name}
        ${o.description ? `<br><small style="color:var(--text-secondary)">${o.description}</small>` : ''}
      </button>
    `).join('');

    container.querySelectorAll('[data-opt-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const selections = { ...state.selections, [btn.dataset.sectionSlug]: Number(btn.dataset.optId) };
        this.store.update({ selections });
      });
    });
  }

  updateColorSection(section, state) {
    const container = this.shadowRoot.querySelector(`[data-section-id="${section.id}"].color-swatches`);
    const nameEl = this.shadowRoot.querySelector('.color-name');
    if (!container) return;

    // Find selected material option
    const materialSection = this.store.getData().sections.find(s => s.slug === 'material');
    const materialOptId = materialSection ? state.selections['material'] : null;

    if (!materialOptId) {
      container.innerHTML = '<span style="color:var(--text-secondary);font-size:13px">Сначала выберите материал</span>';
      if (nameEl) nameEl.textContent = '';
      return;
    }

    const colors = this.store.getColorsForMaterial(materialOptId);
    const selectedColorId = state.selections['color'];

    container.innerHTML = colors.map(c => `
      <div class="color-swatch ${c.id === selectedColorId ? 'selected' : ''}"
           data-color-id="${c.id}"
           data-color-name="${c.color_name}"
           style="background:${c.hex_code}"
           title="${c.color_name}">
      </div>
    `).join('');

    if (nameEl) {
      const sel = colors.find(c => c.id === selectedColorId);
      nameEl.textContent = sel ? sel.color_name : '';
    }

    container.querySelectorAll('[data-color-id]').forEach(el => {
      el.addEventListener('click', () => {
        const selections = { ...state.selections, color: Number(el.dataset.colorId) };
        this.store.update({ selections });
      });
    });
  }

  updatePrice(state) {
    const data = this.store.getData();
    const allOptionIds = [
      ...Object.values(state.selections).filter(v => typeof v === 'number'),
      ...state.customizations,
    ];

    const { unitPrice, total } = calculatePrice(data.pricingRules, {
      categoryId: state.categoryId,
      optionIds: allOptionIds,
      quantity: state.quantity,
    });

    const unitEl = this.shadowRoot.querySelector('[data-unit-price]');
    const totalEl = this.shadowRoot.querySelector('[data-total-price]');
    if (unitEl) unitEl.textContent = `${unitPrice.toLocaleString('ru-RU')} ₽`;
    if (totalEl) totalEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  showOrderModal() {
    const state = this.store.getState();
    if (!state.categoryId) {
      alert('Пожалуйста, выберите изделие');
      return;
    }

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
      const allOptionIds = [
        ...Object.values(state.selections).filter(v => typeof v === 'number'),
        ...state.customizations,
      ];
      const { unitPrice, total } = calculatePrice(data.pricingRules, {
        categoryId: state.categoryId,
        optionIds: allOptionIds,
        quantity: state.quantity,
      });

      try {
        await submitOrder({
          customer_name: name,
          customer_contact: contact,
          customer_comment: comment || null,
          configuration: {
            categoryId: state.categoryId,
            selections: state.selections,
            customizations: state.customizations,
          },
          quantity: state.quantity,
          calculated_price: total,
        });

        overlay.querySelector('.modal').innerHTML = `
          <div class="success-msg">
            <h2>Заявка отправлена!</h2>
            <p style="color:var(--text-secondary)">Мы свяжемся с вами в ближайшее время.</p>
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
