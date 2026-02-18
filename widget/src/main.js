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
    this.mobileStepOrder = ['category', 'fit', 'material', 'color', 'print-front', 'print-back', 'customization'];
    this.mobileStepLabels = {
      category: 'Изделие',
      fit: 'Фасон',
      material: 'Материал',
      color: 'Цвет',
      'print-front': 'Спереди',
      'print-back': 'Сзади',
      customization: 'Кастомизация',
    };
    this.activeMobileStep = 'category';
    this._delegatedEventsBound = false;
    this._stateFrame = null;
    this._lastRenderState = null;
    this._qtyInputTimer = null;
    this._viewportSyncRaf = null;
    this._boundSyncViewportHeight = this._syncViewportHeight.bind(this);
  }

  async connectedCallback() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const attrUrl = this.getAttribute('supabase-url');
    const attrKey = this.getAttribute('supabase-key');
    const url = (envUrl || attrUrl || '').trim();
    const key = (envKey || attrKey || '').trim();

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
    this._setupViewportSync();
    await this.loadData();
  }

  disconnectedCallback() {
    if (this._stateFrame != null) {
      cancelAnimationFrame(this._stateFrame);
      this._stateFrame = null;
    }
    if (this._qtyInputTimer != null) {
      clearTimeout(this._qtyInputTimer);
      this._qtyInputTimer = null;
    }
    this._teardownViewportSync();
    if (this._viewportSyncRaf != null) {
      cancelAnimationFrame(this._viewportSyncRaf);
      this._viewportSyncRaf = null;
    }
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
      const data = await this._withTimeout(fetchAllData(), 15000);
      this.store.setData(data);
      this.renderConfigurator();
      this.store.subscribe(() => this._scheduleStateChange());
      this._scheduleStateChange();
    } catch (err) {
      const message = err?.message || 'Неизвестная ошибка';
      const timeoutError = /время|timeout|timed out/i.test(message);
      const extra =
        err instanceof TypeError
          ? ' Проверьте VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY в .env (без пробелов) и доступ к интернету.'
          : timeoutError
            ? ' Превышено время ожидания ответа. Проверьте сеть или статус Supabase и попробуйте снова.'
            : '';
      this.shadowRoot.querySelector('.config-panel').innerHTML = `
        <div style="padding:20px;color:#ff8f8f;font-size:14px;line-height:1.45">
          Ошибка загрузки: ${message}.${extra}
          <div style="margin-top:14px">
            <button class="submit-btn" data-retry-load style="width:auto;padding:10px 16px">Повторить загрузку</button>
          </div>
        </div>
      `;
      const retryBtn = this.shadowRoot.querySelector('[data-retry-load]');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadData(), { once: true });
      }
    }
  }

  _withTimeout(promise, timeoutMs) {
    let timeoutId = null;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Время ожидания истекло (${timeoutMs} мс)`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timeoutId != null) clearTimeout(timeoutId);
    });
  }

  _scheduleStateChange() {
    if (this._stateFrame != null) return;
    this._stateFrame = requestAnimationFrame(() => {
      this._stateFrame = null;
      this.onStateChange();
    });
  }

  _setupViewportSync() {
    this._scheduleViewportSync();
    window.addEventListener('resize', this._boundSyncViewportHeight, { passive: true });
    window.addEventListener('orientationchange', this._boundSyncViewportHeight, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._boundSyncViewportHeight, { passive: true });
      window.visualViewport.addEventListener('scroll', this._boundSyncViewportHeight, { passive: true });
    }
  }

  _teardownViewportSync() {
    window.removeEventListener('resize', this._boundSyncViewportHeight);
    window.removeEventListener('orientationchange', this._boundSyncViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._boundSyncViewportHeight);
      window.visualViewport.removeEventListener('scroll', this._boundSyncViewportHeight);
    }
  }

  _scheduleViewportSync() {
    if (this._viewportSyncRaf != null) return;
    this._viewportSyncRaf = requestAnimationFrame(() => {
      this._viewportSyncRaf = null;
      this._syncViewportHeight();
    });
  }

  _syncViewportHeight() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    if (!viewportHeight) return;

    const rect = this.getBoundingClientRect();
    const topOffset = Math.max(rect.top, 0);
    const available = Math.floor(viewportHeight - topOffset);

    if (available < 320) return;
    this.style.setProperty('--widget-runtime-height', `${available}px`);
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
      <div class="options-scroll">
        ${this._renderMobileStepper()}
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
        <div class="section hidden" data-section="customization">
          <div class="section-title">Кастомизация</div>
          <div class="buttons-row" data-customization-buttons></div>
        </div>
      </div>
      ${this._renderFooter()}
    `;

    this._bindDelegatedEvents();
    this._bindFooterEvents();
    this._bindMobileStepperEvents();
    this._updateMobileStepper(this.store.getState());
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
        <div class="price-extra" data-customizations-price style="display:none"></div>
        <button class="submit-btn" disabled>Оставить заявку</button>
      </div>
    `;
  }

  _renderMobileStepper() {
    const steps = this.mobileStepOrder.map((stepKey) =>
      `<button type="button" class="mobile-step-btn" data-mobile-step="${stepKey}">
        ${this.mobileStepLabels[stepKey]}
      </button>`
    ).join('');

    return `
      <div class="mobile-stepper" data-mobile-stepper>
        <div class="mobile-stepper-meta">
          <span class="mobile-step-progress" data-mobile-step-progress>Шаг 1 из 1</span>
          <button type="button" class="mobile-next-btn" data-mobile-next-btn>Далее</button>
        </div>
        <div class="mobile-steps-row">
          ${steps}
        </div>
      </div>
    `;
  }

  /* ---- Event binding ---- */

  _bindDelegatedEvents() {
    if (this._delegatedEventsBound) return;
    this._delegatedEventsBound = true;
    this.shadowRoot.addEventListener('click', (e) => {
      const categoryCard = e.target.closest('[data-category-id]');
      if (categoryCard && !categoryCard.hasAttribute('data-disabled')) {
        this.store.selectCategory(Number(categoryCard.dataset.categoryId));
        return;
      }

      const fitBtn = e.target.closest('[data-fit-id]');
      if (fitBtn) {
        this.store.selectFit(Number(fitBtn.dataset.fitId));
        return;
      }

      const materialBtn = e.target.closest('[data-material-id]');
      if (materialBtn) {
        this.store.selectMaterial(Number(materialBtn.dataset.materialId));
        return;
      }

      const colorItem = e.target.closest('[data-color-id]');
      if (colorItem) {
        this.store.update({ colorId: Number(colorItem.dataset.colorId) });
        return;
      }

      const printBtn = e.target.closest('[data-print-id]');
      if (printBtn) {
        this.store.update({ [printBtn.dataset.sectionKey]: Number(printBtn.dataset.printId) });
        return;
      }

      const customizationBtn = e.target.closest('[data-customization-id]');
      if (customizationBtn) {
        const id = Number(customizationBtn.dataset.customizationId);
        const selected = new Set(this.store.getState().customizationIds || []);
        this.store.toggleCustomization(id, !selected.has(id));
      }
    });
  }

  _bindFooterEvents() {
    const qtyInput = this.shadowRoot.querySelector('.quantity-input');
    if (qtyInput) {
      const commitQuantity = () => {
        this.store.update({ quantity: Math.max(1, parseInt(qtyInput.value, 10) || 1) });
      };
      qtyInput.addEventListener('input', () => {
        if (this._qtyInputTimer != null) clearTimeout(this._qtyInputTimer);
        // Avoid full UI recalculation on every keystroke on slower mobile CPUs.
        this._qtyInputTimer = setTimeout(() => {
          this._qtyInputTimer = null;
          commitQuantity();
        }, 120);
      });
      qtyInput.addEventListener('change', commitQuantity);
    }
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this._showOrderModal());
    }
  }

  _bindMobileStepperEvents() {
    this.shadowRoot.querySelectorAll('[data-mobile-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.mobileStep;
        const state = this.store.getState();
        if (!this._isStepVisible(step, state)) return;
        this.activeMobileStep = step;
        this._updateMobileStepper(state);
        this._updateMobileSectionsVisibility(state);
      });
    });

    const nextBtn = this.shadowRoot.querySelector('[data-mobile-next-btn]');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const state = this.store.getState();
        const nextStep = this._getNextVisibleStep(state, this.activeMobileStep);
        if (!nextStep) return;
        this.activeMobileStep = nextStep;
        this._updateMobileStepper(state);
        this._updateMobileSectionsVisibility(state);
      });
    }
  }

  /* ---- State change handler ---- */

  onStateChange() {
    const state = this.store.getState();
    const data = this.store.getData();
    const shadow = this.shadowRoot;
    const prev = this._lastRenderState;

    const categoryChanged = !prev || prev.categoryId !== state.categoryId;
    const fitChanged = !prev || prev.fitId !== state.fitId;
    const materialChanged = !prev || prev.materialId !== state.materialId;
    const colorChanged = !prev || prev.colorId !== state.colorId;
    const printFrontChanged = !prev || prev.printFrontId !== state.printFrontId;
    const printBackChanged = !prev || prev.printBackId !== state.printBackId;
    const customizationsChanged = !prev || !this._sameIds(prev.customizationIds, state.customizationIds);
    const quantityChanged = !prev || prev.quantity !== state.quantity;
    const mobileStepMightChange =
      categoryChanged || fitChanged || materialChanged || colorChanged || printFrontChanged || printBackChanged || customizationsChanged;

    if (categoryChanged) {
      // Category highlighting
      shadow.querySelectorAll('[data-category-id]').forEach((el) => {
        el.classList.toggle('selected', Number(el.dataset.categoryId) === state.categoryId);
      });
    }

    if (categoryChanged) {
      // Preview image
      const previewPanel = shadow.querySelector('.preview-panel');
      const cat = data.categories.find((c) => c.id === state.categoryId);
      if (cat && cat.image_url) {
        previewPanel.innerHTML = `<img src="${cat.image_url}" alt="${cat.name}">`;
      } else {
        previewPanel.innerHTML = '<div class="preview-placeholder">Выберите изделие</div>';
      }
    }

    if (categoryChanged || fitChanged) {
      this._updateFitSection(state);
    }

    if (categoryChanged || fitChanged || materialChanged) {
      this._updateMaterialSection(state);
    }

    if (materialChanged || colorChanged) {
      this._updateColorSection(state);
    }

    if (categoryChanged || materialChanged || printFrontChanged) {
      this._updatePrintSection(state, 'print-front', 'printFrontId', 'data-print-front-buttons');
    }
    if (categoryChanged || materialChanged || printBackChanged) {
      this._updatePrintSection(state, 'print-back', 'printBackId', 'data-print-back-buttons');
    }
    if (categoryChanged || customizationsChanged) {
      this._updateCustomizationSection(state);
    }

    if (
      categoryChanged ||
      fitChanged ||
      materialChanged ||
      printFrontChanged ||
      printBackChanged ||
      customizationsChanged ||
      quantityChanged
    ) {
      this._updatePrice(state, data);
    }
    if (mobileStepMightChange) {
      this._autoAdvanceMobileStep(state);
      this._updateMobileStepper(state);
      this._updateMobileSectionsVisibility(state);
    }

    this._lastRenderState = { ...state, customizationIds: [...(state.customizationIds || [])] };
  }

  _sameIds(a = [], b = []) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  _isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  _isStepVisible(step, state) {
    switch (step) {
      case 'category':
        return true;
      case 'fit':
        return Boolean(state.categoryId);
      case 'material':
        return Boolean(state.fitId);
      case 'color':
        return Boolean(state.materialId) && this.store.getAvailableColors().length > 0;
      case 'print-front':
      case 'print-back':
        return Boolean(state.materialId);
      case 'customization':
        return Boolean(state.categoryId) && this.store.getAvailableCustomizations().length > 0;
      default:
        return false;
    }
  }

  _isStepComplete(step, state) {
    switch (step) {
      case 'category':
        return Boolean(state.categoryId);
      case 'fit':
        return Boolean(state.fitId);
      case 'material':
        return Boolean(state.materialId);
      case 'color':
        return Boolean(state.colorId) || this.store.getAvailableColors().length === 0;
      case 'print-front':
        return Boolean(state.printFrontId);
      case 'print-back':
        return Boolean(state.printBackId);
      case 'customization':
        return true;
      default:
        return false;
    }
  }

  _getVisibleMobileSteps(state) {
    return this.mobileStepOrder.filter((step) => this._isStepVisible(step, state));
  }

  _getNextVisibleStep(state, step) {
    const visibleSteps = this._getVisibleMobileSteps(state);
    const currentIdx = visibleSteps.indexOf(step);
    if (currentIdx === -1) return visibleSteps[0] || null;
    return visibleSteps[currentIdx + 1] || null;
  }

  _autoAdvanceMobileStep(state) {
    if (!this._isMobileViewport()) return;
    if (!this._isStepVisible(this.activeMobileStep, state)) {
      this.activeMobileStep = this.mobileStepOrder.find((step) => this._isStepVisible(step, state)) || 'category';
      return;
    }
    if (!this._isStepComplete(this.activeMobileStep, state)) return;
    const currentIdx = this.mobileStepOrder.indexOf(this.activeMobileStep);
    for (let idx = currentIdx + 1; idx < this.mobileStepOrder.length; idx += 1) {
      const step = this.mobileStepOrder[idx];
      if (this._isStepVisible(step, state)) {
        this.activeMobileStep = step;
        return;
      }
    }
  }

  _updateMobileStepper(state) {
    const visibleSteps = this._getVisibleMobileSteps(state);
    const activeVisibleIdx = visibleSteps.indexOf(this.activeMobileStep);
    const progressEl = this.shadowRoot.querySelector('[data-mobile-step-progress]');
    const nextBtn = this.shadowRoot.querySelector('[data-mobile-next-btn]');

    if (progressEl) {
      const stepNo = activeVisibleIdx >= 0 ? activeVisibleIdx + 1 : 1;
      progressEl.textContent = `Шаг ${stepNo} из ${Math.max(visibleSteps.length, 1)}`;
    }
    if (nextBtn) {
      const hasNext = Boolean(this._getNextVisibleStep(state, this.activeMobileStep));
      nextBtn.disabled = !hasNext;
    }

    this.shadowRoot.querySelectorAll('[data-mobile-step]').forEach((btn) => {
      const step = btn.dataset.mobileStep;
      const visible = this._isStepVisible(step, state);
      const complete = this._isStepComplete(step, state);
      btn.classList.toggle('is-active', step === this.activeMobileStep);
      btn.classList.toggle('is-complete', complete);
      btn.classList.toggle('is-hidden', !visible);
    });
  }

  _updateMobileSectionsVisibility(state) {
    if (!this._isMobileViewport()) {
      this.shadowRoot.querySelectorAll('[data-section]').forEach((section) => {
        section.classList.remove('mobile-hidden');
      });
      return;
    }

    this.shadowRoot.querySelectorAll('[data-section]').forEach((section) => {
      const sectionKey = section.dataset.section;
      const isAllowed = this._isStepVisible(sectionKey, state);
      const isActive = sectionKey === this.activeMobileStep;
      section.classList.toggle('mobile-hidden', !isAllowed || !isActive);
    });
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
      `<div class="color-swatch ${this._isVeryDarkColor(c.hex_code) ? 'dark' : ''} ${c.id === state.colorId ? 'selected' : ''}"
           data-color-id="${c.id}" data-color-name="${c.color_name}"
           style="
             background-color:${c.hex_code};
             ${c.swatch_image_url ? `background-image:url('${c.swatch_image_url}');background-size:cover;background-position:center;` : ''}
           "
           title="${c.color_name}"></div>`
    ).join('');
    const sel = colors.find((c) => c.id === state.colorId);
    nameEl.textContent = sel ? sel.color_name : '';
  }

  _isVeryDarkColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    const normalized = hex.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return false;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    // Relative luminance approximation for quick UI contrast checks
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.12;
  }

  _updatePrintSection(state, sectionName, stateKey, containerAttr) {
    const section = this.shadowRoot.querySelector(`[data-section="${sectionName}"]`);
    const container = this.shadowRoot.querySelector(`[${containerAttr}]`);
    if (!state.materialId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const methods = this.store.getAvailablePrintMethods();
    if (methods.length === 0) {
      section.classList.add('hidden');
      return;
    }
    let selectedId = state[stateKey];
    if (!methods.some((m) => m.id === selectedId)) {
      const fallback = methods.find((m) => Number(m.price) === 0) || methods[0];
      selectedId = fallback?.id ?? null;
      if (selectedId != null) {
        this.store.update({ [stateKey]: selectedId });
      }
    }
    container.innerHTML = methods.map((m) =>
      `<button class="print-btn ${m.id === selectedId ? 'selected' : ''}" data-print-id="${m.id}" data-section-key="${stateKey}">
        ${m.name}${Number(m.price) > 0 ? `<span class="price-badge">+${Number(m.price)}₽</span>` : ''}
      </button>`
    ).join('');
  }

  _updateCustomizationSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="customization"]');
    const container = this.shadowRoot.querySelector('[data-customization-buttons]');
    if (!state.categoryId) {
      section.classList.add('hidden');
      return;
    }
    const items = this.store.getAvailableCustomizations();
    if (items.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const selected = new Set(state.customizationIds || []);
    container.innerHTML = items.map((item) =>
      `<button class="print-btn ${selected.has(item.id) ? 'selected' : ''}" data-customization-id="${item.id}">
        ${item.name}${Number(item.price) > 0 ? `<span class="price-badge">+${Number(item.price)}₽</span>` : ''}
      </button>`
    ).join('');
  }

  _updatePrice(state, data) {
    const basePrice = this.store.getBasePrice();
    const frontPrice = this.store.getPrintPrice(state.printFrontId);
    const backPrice = this.store.getPrintPrice(state.printBackId);
    const customizationPrice = this.store.getCustomizationsPrice(state.customizationIds);

    const { unitPrice, total, multiplier } = calculatePrice({
      basePrice,
      frontPrintPrice: frontPrice,
      backPrintPrice: backPrice,
      customizationPrice,
      quantity: state.quantity,
      tiers: data.quantityTiers,
    });

    const unitEl = this.shadowRoot.querySelector('[data-unit-price]');
    const totalEl = this.shadowRoot.querySelector('[data-total-price]');
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    const hintEl = this.shadowRoot.querySelector('[data-min-qty-hint]');
    const customizationsEl = this.shadowRoot.querySelector('[data-customizations-price]');

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

    if (customizationsEl) {
      if (customizationPrice > 0) {
        customizationsEl.style.display = 'block';
        customizationsEl.textContent = `Кастомизации: +${customizationPrice.toLocaleString('ru-RU')} ₽ за шт`;
      } else {
        customizationsEl.style.display = 'none';
      }
    }

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
      const customizationPrice = this.store.getCustomizationsPrice(state.customizationIds);
      const { unitPrice, total, multiplier } = calculatePrice({
        basePrice,
        frontPrintPrice: frontPrice,
        backPrintPrice: backPrice,
        customizationPrice,
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
            customization_ids: state.customizationIds || [],
            quantity: state.quantity,
            unit_price: unitPrice,
            customization_price: customizationPrice,
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
        const details =
          err && err.code === '42501'
            ? ' Доступ на вставку в таблицу orders запрещен RLS-политикой.'
            : '';
        alert('Ошибка отправки: ' + err.message + details);
      }
    });
  }
}

customElements.define('merch-configurator', MerchConfigurator);
