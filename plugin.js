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

      for (const action of actions) {
        if (action.action === 'ignore') continue;

        const { setName, tokenName, value, type } = action;

        let set = catalog.sets.find(s => s.name === setName);
        if (!set) {
          set = catalog.addSet({ name: setName });
        }

        if (action.action === 'add' || action.action === 'replace') {
          const existing = set.tokens.find(t => t.name === tokenName);
          if (existing) {
            existing.value = value;
          } else {
            set.addToken({ type: type || 'color', name: tokenName, value });
          }
        }

        if (action.action === 'keep-both') {
          // Keep existing value, add new token with -new suffix
          const newName = tokenName + '-new';
          const existingNew = set.tokens.find(t => t.name === newName);
          if (existingNew) {
            existingNew.value = value;
          } else {
            set.addToken({ type: type || 'color', name: newName, value });
          }
        }

        if (action.action === 'remove') {
          const existing = set && set.tokens.find(t => t.name === tokenName);
          if (existing) existing.remove();
        }
      }

      penpot.ui.sendMessage({ type: 'apply-done', count: actions.filter(a => a.action !== 'ignore').length });
    } catch (e) {
      penpot.ui.sendMessage({ type: 'error', message: 'Apply failed: ' + e.message });
    }
  }
});
