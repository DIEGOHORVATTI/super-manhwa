/**
 * PRELUDE — JavaScript injected INTO the QuickJS sandbox before the extension code.
 *
 * Recreates the Mangayomi host bridge globals (see DECISIONS.md "Bridge reference").
 * The sandbox has zero ambient capabilities: network and prefs are bridged to host
 * functions (ADR-0004).
 *
 * Async bridge: `Client` requests return a VM Promise registered in `__pending`.
 * The host starts the real fetch via `__hostFetchStart(id, reqJson)` and later
 * resolves the VM Promise via `__resolveFetch(id, raw)` / `__rejectFetch(id, err)`,
 * pumping the VM job queue in between. This uses the *synchronous* QuickJS module
 * (no asyncify) — asyncify can only drive one host call before the first VM `await`.
 *
 * Kept free of backticks / ${...} so it can live inside a TS template literal.
 */
export const PRELUDE = `
// ---- console -> host ----
globalThis.console = {
  log:   function () { __hostLog('log',   Array.prototype.map.call(arguments, String).join(' ')); },
  warn:  function () { __hostLog('warn',  Array.prototype.map.call(arguments, String).join(' ')); },
  error: function () { __hostLog('error', Array.prototype.map.call(arguments, String).join(' ')); },
  info:  function () { __hostLog('log',   Array.prototype.map.call(arguments, String).join(' ')); },
};

// ---- String helpers (utils.dart) ----
String.prototype.substringAfter = function (d) { var i = this.indexOf(d); return i < 0 ? '' : this.slice(i + d.length); };
String.prototype.substringAfterLast = function (d) { var i = this.lastIndexOf(d); return i < 0 ? '' : this.slice(i + d.length); };
String.prototype.substringBefore = function (d) { var i = this.indexOf(d); return i < 0 ? String(this) : this.slice(0, i); };
String.prototype.substringBeforeLast = function (d) { var i = this.lastIndexOf(d); return i < 0 ? String(this) : this.slice(0, i); };
String.prototype.substringBetween = function (l, r) { var a = this.indexOf(l); if (a < 0) return ''; var s = a + l.length; var b = this.indexOf(r, s); return b < 0 ? '' : this.slice(s, b); };

// ---- async fetch bridge (host-driven) ----
globalThis.__pending = {};
globalThis.__nextReqId = 1;
globalThis.__resolveFetch = function (id, raw) { var d = __pending[id]; delete __pending[id]; if (d) d.resolve(raw); };
globalThis.__rejectFetch = function (id, err) { var d = __pending[id]; delete __pending[id]; if (d) d.reject(new Error(err)); };

// ---- HTTP (http.dart) : Client + Response ----
class Response {
  constructor(o) {
    this.body = o.body;
    this.statusCode = o.statusCode;
    this.headers = o.headers || {};
    this.isRedirect = !!o.isRedirect;
    this.reasonPhrase = o.reasonPhrase || '';
    this.request = o.request || null;
  }
}
class Client {
  _req(method, url, headers, body) {
    var id = globalThis.__nextReqId++;
    var p = new Promise(function (resolve, reject) { __pending[id] = { resolve: resolve, reject: reject }; });
    __hostFetchStart(id, JSON.stringify({
      method: method, url: url, headers: headers || {},
      body: (body === undefined ? null : body),
    }));
    return p.then(function (raw) { return new Response(JSON.parse(raw)); });
  }
  get(url, headers) { return this._req('GET', url, headers); }
  post(url, headers, body) { return this._req('POST', url, headers, body); }
  put(url, headers, body) { return this._req('PUT', url, headers, body); }
  patch(url, headers, body) { return this._req('PATCH', url, headers, body); }
  delete(url, headers, body) { return this._req('DELETE', url, headers, body); }
  head(url, headers) { return this._req('HEAD', url, headers); }
}

// ---- HTML DOM (dom_selector.dart) : Document + Element, backed by host cheerio ----
class Element {
  constructor(id) { this.__id = id; }
  get text() { return __domText(this.__id); }
  get outerHtml() { return __domOuterHtml(this.__id); }
  get innerHtml() { return __domHtml(this.__id); }
  get html() { return __domHtml(this.__id); }
  attr(name) { return __domAttr(this.__id, name); }
  hasAttr(name) { return !!__domHasAttr(this.__id, name); }
  selectFirst(sel) { var id = __domSelectFirst(this.__id, sel); return (id === null || id === undefined) ? null : new Element(id); }
  select(sel) { return JSON.parse(__domSelect(this.__id, sel)).map(function (i) { return new Element(i); }); }
  getElementById(eid) { var id = __domById(this.__id, eid); return (id === null || id === undefined) ? null : new Element(id); }
  getElementsByClassName(c) { return JSON.parse(__domByClass(this.__id, c)).map(function (i) { return new Element(i); }); }
  getElementsByTagName(t) { return JSON.parse(__domByTag(this.__id, t)).map(function (i) { return new Element(i); }); }
  get getHref() { return this.attr('href'); }
  get getSrc() { return this.attr('src'); }
  get getImg() { return this.attr('src'); }
  get getDataSrc() { return this.attr('data-src'); }
}
class Document {
  constructor(html) { this.__id = __domParse(html); }
  selectFirst(sel) { var id = __domSelectFirst(this.__id, sel); return (id === null || id === undefined) ? null : new Element(id); }
  select(sel) { return JSON.parse(__domSelect(this.__id, sel)).map(function (i) { return new Element(i); }); }
  getElementById(eid) { var id = __domById(this.__id, eid); return (id === null || id === undefined) ? null : new Element(id); }
  getElementsByClassName(c) { return JSON.parse(__domByClass(this.__id, c)).map(function (i) { return new Element(i); }); }
  getElementsByTagName(t) { return JSON.parse(__domByTag(this.__id, t)).map(function (i) { return new Element(i); }); }
  get text() { return __domText(this.__id); }
  get outerHtml() { return __domOuterHtml(this.__id); }
  get body() { var id = __domSelectFirst(this.__id, 'body'); return (id === null || id === undefined) ? null : new Element(id); }
  attr(name) { return __domAttr(this.__id, name); }
  hasAttr(name) { return !!__domHasAttr(this.__id, name); }
}

// ---- crypto + JS unpacker (utils.dart), all bridged to host ----
function encryptAESCryptoJS(plain, pass) { return __aesEncrypt(plain, pass); }
function decryptAESCryptoJS(enc, pass) { return __aesDecrypt(enc, pass); }
function cryptoHandler(text, iv, key, encrypt) { return __cryptoHandler(text, iv, key, !!encrypt); }
function unpackJs(source) { return __unpackJs(source); }

// ---- Preferences (preferences.dart) ----
// Defaults declared in the extension's getSourcePreferences() are extracted into
// __PREFS so getPreference() works without persisted user settings (MVP).
function __extractPrefDefaults(list) {
  var out = {};
  (list || []).forEach(function (p) {
    if (!p || !p.key) return;
    var k = p.key;
    if (p.editTextPreference) out[k] = p.editTextPreference.value;
    else if (p.listPreference) { var lp = p.listPreference; out[k] = (lp.entryValues || [])[lp.valueIndex || 0]; }
    else if (p.multiSelectListPreference) out[k] = p.multiSelectListPreference.values || [];
    else if (p.checkBoxPreference) out[k] = !!p.checkBoxPreference.value;
    else if (p.switchPreferenceCompat || p.switchPreference) out[k] = !!((p.switchPreferenceCompat || p.switchPreference).value);
  });
  return out;
}
class SharedPreferences {
  get(key, def) {
    if (globalThis.__PREFS && Object.prototype.hasOwnProperty.call(globalThis.__PREFS, key)) return globalThis.__PREFS[key];
    var v = __hostPrefGet(key);
    if (v === undefined || v === null) return (def === undefined ? null : def);
    return JSON.parse(v);
  }
  set() { /* no-op in MVP */ }
}

// ---- MProvider base (service.dart) ----
class MProvider {
  constructor() { this.source = globalThis.__SOURCE; }
  get supportsLatest() { return true; }
  getHeaders(url) { return {}; }
  getPreference(key, def) { return new SharedPreferences().get(key, def); }
}

globalThis.Response = Response;
globalThis.Client = Client;
globalThis.Document = Document;
globalThis.Element = Element;
globalThis.SharedPreferences = SharedPreferences;
globalThis.MProvider = MProvider;
globalThis.__extractPrefDefaults = __extractPrefDefaults;
globalThis.encryptAESCryptoJS = encryptAESCryptoJS;
globalThis.decryptAESCryptoJS = decryptAESCryptoJS;
globalThis.cryptoHandler = cryptoHandler;
globalThis.unpackJs = unpackJs;
`;
