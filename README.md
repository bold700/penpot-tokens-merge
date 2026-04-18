# Penpot Token Merge

A Penpot plugin to merge a new token JSON file with your existing Penpot tokens.

## What it does

- Reads your current tokens directly from Penpot (no manual export needed)
- Upload a new token JSON file
- Shows a diff: what is new, what changed, what was removed
- Per-token actions before applying:
  - **New tokens**: add or skip
  - **Changed tokens**: replace, ignore, or keep both
  - **Removed tokens**: keep or remove
- Writes changes directly to Penpot via the plugin API

## Installation

### Requirements

- [Node.js](https://nodejs.org) (any recent version)
- Penpot (cloud or self-hosted)

### Run locally

```bash
git clone https://github.com/bold700/penpot-tokens-merge.git
cd penpot-tokens-merge
npm start
```

The server runs at `http://localhost:7778`.

### Add to Penpot

1. Open a Penpot file
2. Go to **Plugins** (the puzzle icon in the toolbar)
3. Click **Add plugin**
4. Enter the URL: `http://localhost:7778/manifest.json`
5. Click **Install**

## Usage

1. Open the plugin — it automatically reads your current Penpot tokens
2. Upload a new token JSON file (Tokens Studio format)
3. Review the diff:
   - **New** — tokens that don't exist yet
   - **Changed** — tokens with a different value
   - **Removed** — tokens present in Penpot but not in the new file
4. Choose an action per token or accept the defaults
5. Click **Apply** to write the changes to Penpot
6. Click **Merge another file** to reset and start over

## Token format

The plugin expects standard Tokens Studio JSON:

```json
{
  "setName": {
    "tokenName": {
      "$value": "#6750A4",
      "$type": "color"
    }
  }
}
```

Nested token groups are supported and flattened using dot notation.
