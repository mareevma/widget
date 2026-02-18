export const CSS = `
  :host {
    --primary: #FF5100;
    --primary-hover: #FF6B2B;
    --bg: #1A1A1A;
    --bg-card: #2A2A2A;
    --bg-card-hover: #333333;
    --text: #FFFFFF;
    --text-secondary: #999999;
    --radius-card: 12px;
    --radius-btn: 8px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    display: block;
    width: 100%;
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    font-family: var(--font);
    color: var(--text);
    background: var(--bg);
    border-radius: var(--radius-card);
    overflow: hidden;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .configurator {
    display: grid;
    grid-template-columns: 45% 55%;
    height: 100%;
    align-items: start;
    min-width: 0;
    overflow: hidden;
  }

  .preview-panel {
    position: sticky;
    top: 0;
    height: 100dvh;
    min-height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 20px 24px;
    overflow: hidden;
    z-index: 1;
  }

  .preview-panel img {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius-card);
  }

  .preview-placeholder {
    width: 100%;
    height: 300px;
    background: var(--bg-card);
    border-radius: var(--radius-card);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .config-panel {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    padding: 0;
    height: 100%;
    overflow: hidden;
    min-width: 0;
    position: relative;
    z-index: 2;
    scrollbar-gutter: stable;
  }

  .options-scroll {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 24px 24px 12px;
    padding-bottom: 12px;
  }

  .section {
    margin-bottom: 24px;
    min-width: 0;
  }

  .section.hidden {
    display: none;
  }

  .section.mobile-hidden {
    display: none;
  }

  .mobile-stepper {
    display: none;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }

  .option-card {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-card);
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }

  .option-card:hover {
    background: var(--bg-card-hover);
  }

  .option-card.selected {
    border-color: var(--primary);
  }

  .option-card img {
    width: 100%;
    height: 80px;
    object-fit: contain;
    background: #1f1f1f;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .option-card .name {
    font-size: 13px;
    font-weight: 500;
  }

  .option-card.coming-soon {
    opacity: 0.5;
    cursor: default;
  }

  .buttons-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .option-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 8px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .option-btn:hover {
    background: var(--bg-card-hover);
  }

  .option-btn.selected {
    border-color: var(--primary);
  }

  .material-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 10px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
    text-align: left;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .material-btn:hover {
    background: var(--bg-card-hover);
  }

  .material-btn.selected {
    border-color: var(--primary);
  }

  .material-btn .mat-desc {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .print-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 8px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .print-btn:hover {
    background: var(--bg-card-hover);
  }

  .print-btn.selected {
    border-color: var(--primary);
  }

  .print-btn .price-badge {
    font-size: 11px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    align-content: flex-start;
    width: 100%;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-swatch.selected {
    border-color: #FFFFFF;
    box-shadow: 0 0 0 2px var(--primary);
  }

  .color-swatch.dark {
    border-color: #5A5A5A;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
  }

  .color-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .footer {
    position: static;
    background: var(--bg);
    border-top: 1px solid var(--bg-card);
    padding: 16px 24px;
    z-index: 20;
  }

  .quantity-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .quantity-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .quantity-input {
    background: var(--bg-card);
    border: 1px solid var(--bg-card-hover);
    border-radius: var(--radius-btn);
    color: var(--text);
    padding: 8px 12px;
    width: 100px;
    font-size: 14px;
    font-family: var(--font);
    text-align: center;
  }

  .quantity-input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .price-unit {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .price-total {
    font-size: 20px;
    font-weight: 700;
    word-break: break-word;
  }

  .price-extra {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  .submit-btn {
    width: 100%;
    background: var(--primary);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-btn);
    padding: 14px;
    font-size: 15px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: background 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .submit-btn:hover {
    background: var(--primary-hover);
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .min-qty-hint {
    font-size: 12px;
    color: var(--primary);
    margin-bottom: 8px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal {
    background: var(--bg);
    border-radius: var(--radius-card);
    padding: 32px;
    width: 90%;
    max-width: 420px;
    max-height: 90dvh;
    overflow: auto;
  }

  .modal h2 {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .modal-field {
    margin-bottom: 16px;
  }

  .modal-field label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .modal-field input,
  .modal-field textarea {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--bg-card-hover);
    border-radius: var(--radius-btn);
    color: var(--text);
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--font);
  }

  .modal-field textarea {
    resize: vertical;
    min-height: 60px;
  }

  .modal-field input:focus,
  .modal-field textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .modal-cancel {
    flex: 1;
    background: var(--bg-card);
    color: var(--text);
    border: none;
    border-radius: var(--radius-btn);
    padding: 12px;
    font-size: 14px;
    font-family: var(--font);
    cursor: pointer;
  }

  .modal-submit {
    flex: 2;
    background: var(--primary);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-btn);
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
  }

  .modal-submit:hover {
    background: var(--primary-hover);
  }

  .success-msg {
    text-align: center;
    padding: 40px 20px;
  }

  .success-msg h2 {
    color: var(--primary);
    margin-bottom: 12px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    :host {
      height: auto;
      max-height: none;
      overflow: visible;
    }

    .configurator {
      grid-template-columns: 1fr;
      height: auto;
      overflow: visible;
    }

    .preview-panel {
      position: relative;
      height: auto;
      max-height: 250px;
      min-height: 180px;
      padding: 16px;
      top: 0;
      margin-bottom: 4px;
      z-index: 1;
    }

    .config-panel {
      padding: 0;
      position: relative;
      z-index: 3;
      height: auto;
      overflow: visible;
      display: block;
    }

    .options-scroll {
      overflow: visible;
      padding: 16px 16px 0;
      padding-bottom: 0;
    }

    .mobile-stepper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: sticky;
      top: 0;
      z-index: 7;
      background: var(--bg);
      padding-top: 6px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--bg-card);
    }

    .mobile-stepper-meta {
      display: none;
    }

    .mobile-step-progress {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .mobile-next-btn {
      border: 1px solid var(--bg-card-hover);
      background: var(--bg-card);
      color: var(--text);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-family: var(--font);
      cursor: pointer;
      white-space: nowrap;
    }

    .mobile-next-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .mobile-steps-row {
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }

    .mobile-step-btn {
      flex: 0 0 auto;
      border: 1px solid var(--bg-card-hover);
      background: var(--bg-card);
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 7px 12px;
      white-space: nowrap;
      font-size: 12px;
      line-height: 1;
      font-family: var(--font);
      cursor: pointer;
    }

    .option-card,
    .option-btn,
    .material-btn,
    .print-btn,
    .color-swatch,
    .submit-btn {
      transition: none;
    }

    .color-swatch:hover {
      transform: none;
    }

    .mobile-step-btn.is-active {
      border-color: var(--primary);
      color: var(--text);
    }

    .mobile-step-btn.is-complete {
      color: var(--text);
      background: #303030;
    }

    .mobile-step-btn.is-hidden {
      display: none;
    }

    .options-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .buttons-row {
      gap: 6px;
    }

    .material-btn,
    .print-btn {
      flex: 1 1 calc(50% - 6px);
      min-width: 0;
      padding: 9px 12px;
      font-size: 12px;
    }

    .option-btn {
      flex: 1 1 calc(50% - 6px);
      min-width: 0;
      padding: 8px 10px;
      font-size: 12px;
      text-align: center;
    }

    .color-swatches {
      gap: 7px;
    }

    .color-name {
      display: block;
      margin-top: 8px;
      margin-left: 0;
    }

    .footer {
      position: static;
      padding: 16px;
      min-width: 0;
    }

    .price-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .quantity-row {
      flex-wrap: wrap;
      gap: 8px;
    }

    .modal {
      width: 94%;
      padding: 18px;
      max-height: 88dvh;
    }

    .modal-actions {
      flex-direction: column;
    }

    .modal-cancel,
    .modal-submit {
      width: 100%;
      flex: none;
    }
  }

  @media (max-height: 760px) and (min-width: 769px) {
    .preview-panel {
      padding: 14px 18px;
    }

    .config-panel {
      padding: 16px 18px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
`;
