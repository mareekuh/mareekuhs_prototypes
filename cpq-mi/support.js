/* Minimal runtime for the exported prototype: renders each .dc.html screen and its Engagement Navy components. */
document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"><\/script>' +
               '<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"><\/script>');
(function () {
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (s) { Object.assign(this.state, typeof s === 'function' ? s(this.state) : s); this._render && this._render(); };
  DCLogic.prototype.forceUpdate = function () { this._render && this._render(); };
  window.DCLogic = DCLogic;

  function get(path, scope) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  var WHOLE = /^\s*\{\{([^}]+)\}\}\s*$/;
  function val(str, scope) {
    var m = WHOLE.exec(str);
    if (m) return get(m[1], scope);
    return str.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = get(p, scope); return v == null ? '' : v; });
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function styleObj(s) {
    var o = {};
    s.split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return;
      o[k.indexOf('--') === 0 ? k : camel(k)] = v;
    });
    return o;
  }
  var EVENTS = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave' };

  function build(node, scope, key) {
    var h = React.createElement;
    if (node.nodeType === 3) { var t = val(node.nodeValue, scope); return t; }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'helmet' || tag === 'script') return null;
    var kids = function (sc) { return Array.prototype.map.call(node.childNodes, function (c, i) { return build(c, sc, i); }); };
    if (tag === 'sc-if') return val(node.getAttribute('value') || '', scope) ? h(React.Fragment, { key: key }, kids(scope)) : null;
    if (tag === 'sc-for') {
      var items = val(node.getAttribute('list') || '', scope) || [], as = node.getAttribute('as') || 'item';
      return h(React.Fragment, { key: key }, items.map(function (it, i) { var sc = Object.create(scope); sc[as] = it; sc.$index = i; return h(React.Fragment, { key: i }, kids(sc)); }));
    }
    var props = { key: key };
    var comp = tag;
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name;
      if (tag === 'x-import' && n === 'component-from-global-scope') return;
      var v = val(a.value, scope);
      if (n === 'class') props.className = v;
      else if (n === 'for') props.htmlFor = v;
      else if (n === 'style') props.style = typeof v === 'string' ? styleObj(v) : v;
      else if (EVENTS[n]) props[EVENTS[n]] = v;
      else if (tag === 'x-import') props[camel(n)] = v;
      else props[n] = v;
    });
    if (tag === 'x-import') {
      comp = node.getAttribute('component-from-global-scope').split('.').reduce(function (o, k) { return o && o[k]; }, window);
      if (!comp) return h('div', { key: key, style: { outline: '2px dashed red' } }, 'missing ' + node.getAttribute('component-from-global-scope'));
    }
    if (tag === 'dc-import') return h('div', { key: key }, 'dc-import ' + node.getAttribute('name'));
    var ch = kids(scope);
    return h.apply(null, [comp, props].concat(ch.length ? ch : []));
  }

  window.addEventListener('DOMContentLoaded', function () {
    var x = document.querySelector('x-dc'); if (!x) return;
    var helmet = x.querySelector('helmet');
    if (helmet) Array.prototype.forEach.call(helmet.children, function (c) { document.head.appendChild(c.cloneNode(true)); });
    var src = document.querySelector('script[data-dc-script]');
    var Component = src ? new Function('DCLogic', src.textContent + '\nreturn Component;')(DCLogic) : DCLogic;
    var inst = new Component({});
    var holder = document.createElement('div'); holder.setAttribute('data-screen', ''); holder.style.cssText = 'position:absolute;top:0;left:0;width:1920px;height:1080px;transform-origin:0 0'; document.body.style.cssText = 'margin:0;background:#0b1220;overflow:hidden';
    x.parentNode.insertBefore(holder, x);
    var nodes = Array.prototype.slice.call(x.childNodes); x.remove();
    var root = ReactDOM.createRoot(holder);
    inst._render = function () {
      var scope = inst.renderVals ? inst.renderVals() : {};
      root.render(React.createElement(React.Fragment, null, nodes.map(function (n, i) { return build(n, scope, i); })));
    };
    inst._render();
    if (window.__fitScreen) window.__fitScreen();
    if (inst.componentDidMount) setTimeout(function () { inst.componentDidMount(); }, 0);
  });
})();

/* fit the 1920 x 1080 screen to the window */
(function () {
  function fit() {
    var h = document.querySelector('[data-screen]');
    if (!h) return;
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    h.style.transform = 'scale(' + s + ')';
    h.style.left = Math.max(0, (window.innerWidth - 1920 * s) / 2) + 'px';
  }
  window.addEventListener('resize', fit);
  window.__fitScreen = fit;
})();
