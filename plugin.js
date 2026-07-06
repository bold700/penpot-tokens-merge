// plugin.js — runs inside Penpot context

penpot.ui.open('Token Merge', `?theme=${penpot.theme}`, {
  width: 520,
  height: 560,
});

function readCurrentTokens() {
  const catalog = penpot.library.local.tokens;
  const result = {};
  for (const set of catalog.sets) {
    result[set.name] = {};
    for (const token of set.tokens) {
      result[set.name][token.name] = {
        $value: token.value,
        $type: token.type,
        $description: token.description || '',
      };
    }
  }
  return { data: result, setCount: catalog.sets.length };
}

penpot.ui.onMessage(msg => {
  if (msg.type === 'ready') {
    try {
      const { data, setCount } = readCurrentTokens();
      penpot.ui.sendMessage({ type: 'current-tokens', data, setCount });
    } catch (e) {
      penpot.ui.sendMessage({ type: 'error', message: 'Could not read tokens: ' + e.message });
    }
  }

  if (msg.type === 'apply-actions') {
    try {
      const { actions } = msg;
      const catalog = penpot.library.local.tokens;

      let applied = 0;
      const errors = [];

      for (const action of actions) {
        if (action.action === 'ignore') continue;

        const { setName, tokenName } = action;
        const type = normalizeType(action.type, action.value);
        const value = coerceValue(type, action.value);

        try {
          let set = catalog.sets.find(s => s.name === setName);
          if (!set) {
            set = catalog.addSet({ name: setName });
          }
          // A fresh set is inactive; inactive sets don't affect shapes.
          if (set && !set.active) set.toggleActive();

          if (action.action === 'add' || action.action === 'replace') {
            const existing = set.tokens.find(t => t.name === tokenName);
            if (existing) {
              existing.value = value;
            } else {
              set.addToken({ type, name: tokenName, value });
            }
            applied++;
          }

          if (action.action === 'keep-both') {
            // Keep existing value, add new token with -new suffix
            const newName = tokenName + '-new';
            const existingNew = set.tokens.find(t => t.name === newName);
            if (existingNew) {
              existingNew.value = value;
            } else {
              set.addToken({ type, name: newName, value });
            }
            applied++;
          }

          if (action.action === 'remove') {
            const existing = set && set.tokens.find(t => t.name === tokenName);
            if (existing) { existing.remove(); applied++; }
          }
        } catch (tokenErr) {
          errors.push(`${setName} · ${tokenName} (${type}): ${tokenErr.message}`);
        }
      }

      penpot.ui.sendMessage({
        type: 'apply-done',
        count: applied,
        failed: errors.length,
        firstError: errors[0] || '',
      });
    } catch (e) {
      penpot.ui.sendMessage({ type: 'error', message: 'Apply failed: ' + e.message });
    }
  }
});

// Penpot only accepts a fixed set of token types. Tokens Studio uses extra /
// differently-named types, so map them; fall back based on the value shape.
function normalizeType(rawType, value) {
  const VALID = new Set([
    'color', 'dimension', 'spacing', 'typography', 'shadow', 'opacity',
    'borderRadius', 'borderWidth', 'fontWeights', 'fontSizes', 'fontFamilies',
    'letterSpacing', 'textDecoration', 'textCase',
  ]);
  const MAP = {
    sizing: 'dimension',
    number: 'dimension',
    lineheights: 'dimension',
    lineheight: 'dimension',
    paragraphspacing: 'spacing',
    boxshadow: 'shadow',
    border: 'borderWidth',
    fontfamily: 'fontFamilies',
    fontweight: 'fontWeights',
    fontsize: 'fontSizes',
  };

  const t = String(rawType || '').trim();
  if (VALID.has(t)) return t;

  const mapped = MAP[t.toLowerCase()];
  if (mapped) return mapped;

  // Unknown / missing type: infer from the value.
  if (/^#([0-9a-f]{3,8})$/i.test(String(value).trim())) return 'color';
  return 'dimension';
}

// Composite tokens (typography, shadow) arrive as a JSON string of a Tokens
// Studio object. Penpot wants a structured object with its own field names.
function coerceValue(type, value) {
  if (type !== 'typography' && type !== 'shadow') return value;

  let obj = value;
  if (typeof obj === 'string') {
    const s = obj.trim();
    if (s[0] !== '{' && s[0] !== '[') return value; // reference like "{...}" or plain value
    try { obj = JSON.parse(s); } catch { return value; }
  }
  if (!obj || typeof obj !== 'object') return value;

  if (type === 'typography') return toTypographyValue(obj);
  return obj; // shadow: pass the parsed object/array through as-is
}

// Map Tokens Studio typography fields → Penpot TokenTypographyValueString.
function toTypographyValue(raw) {
  const pick = (...keys) => {
    for (const k of keys) if (raw[k] != null && raw[k] !== '') return raw[k];
    return undefined;
  };
  const out = {};
  const ff = pick('fontFamilies', 'fontFamily');
  if (ff !== undefined) out.fontFamilies = Array.isArray(ff) ? ff : String(ff);
  const fs = pick('fontSizes', 'fontSize');
  if (fs !== undefined) out.fontSizes = String(fs);
  const fw = pick('fontWeight', 'fontWeights');
  if (fw !== undefined) out.fontWeight = String(fw);
  const lh = pick('lineHeight', 'lineHeights');
  if (lh !== undefined) out.lineHeight = String(lh);
  const ls = pick('letterSpacing');
  if (ls !== undefined) out.letterSpacing = String(ls);
  const tc = pick('textCase');
  if (tc !== undefined) out.textCase = String(tc);
  const td = pick('textDecoration');
  if (td !== undefined) out.textDecoration = String(td);
  return out;
}
