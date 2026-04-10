// ===== SEOGEO4YMYL — Reactive Store (Proxy + EventTarget) =====

class EventBus extends EventTarget {
  emit(event, detail) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
  on(event, fn) {
    const handler = (e) => fn(e.detail);
    this.addEventListener(event, handler);
    return () => this.removeEventListener(event, handler);
  }
}

class AppStore {
  #bus = new EventBus();
  #state;

  constructor(initialState) {
    this.#state = this.#makeReactive(initialState);
  }

  #makeReactive(obj) {
    const bus = this.#bus;
    return new Proxy(obj, {
      set(target, prop, value) {
        const old = target[prop];
        target[prop] = value;
        bus.emit(`state:${prop}`, { prop, value, old });
        bus.emit('state:*', { prop, value, old });
        return true;
      }
    });
  }

  get state() { return this.#state; }
  on(event, fn) { return this.#bus.on(event, fn); }
  emit(event, detail) { this.#bus.emit(event, detail); }
}

export const store = new AppStore({
  // Route
  currentRoute: '',
  routeParams: {},

  // Input
  primaryUrl: '',
  competitorUrls: [],
  batchUrls: [],
  selectedPersona: 'balanced',

  // Analysis
  analysisPhase: 'idle', // idle | fetching | parsing | analyzing | done | error
  progress: { current: 0, total: 0, currentModule: '' },
  errorMessage: '',

  // Results (URL-keyed)
  fetchedData: new Map(),
  results: new Map(),

  // Aggregated
  report: null,

  // SF Import
  sfImportStatus: 'idle',
  sfParsedData: null,

  // UI
  theme: localStorage.getItem('sg-theme') || 'dark',
  locale: localStorage.getItem('sg-locale') || 'zh',
});
