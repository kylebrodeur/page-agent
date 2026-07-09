# Developer Guide

This file is for local development workflows.

For contribution rules and expectations, see [../CONTRIBUTING.md](../CONTRIBUTING.md).

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
    - `macOS` / `Linux` / `WSL`
    - `node.js >=22` with `pnpm ^11.7.0`
    - An editor that supports `ts/eslint/prettier`
    - Make sure `eslint`, `prettier` and `commitlint` work well. Un-linted code won't pass the CI.

2. **Setup**

    ```bash
    pnpm install         # Or `pnpm install --frozen-lockfile` if you don't want to change the lockfile
    pnpm run dev:demo    # Serve the IIFE demo build with auto-rebuild
    pnpm run build       # Build everything
    ```

## 📦 Project Structure

This is a **monorepo** with pnpm workspaces.

Published packages:

- **Page Agent** (`packages/page-agent/`) - Main entry, headless by default. Combines Core + PageController (npm: `@kylebrodeur/page-agent`)
- **Core** (`packages/core/`) - Core agent logic without UI (npm: `@kylebrodeur/page-agent-core`)
- **LLMs** (`packages/llms/`) - LLM client with reflection-before-action mental model (npm: `@kylebrodeur/page-agent-llms`)
- **Page Controller** (`packages/page-controller/`) - DOM operations and visual feedback, independent of LLM (npm: `@kylebrodeur/page-agent-page-controller`)
- **MCP** (`packages/mcp/`) - MCP server for browser control via Page Agent extension (npm: `@kylebrodeur/page-agent-mcp`)

Applications:

- **Extension** (`packages/extension/`) - Browser extension (WXT + React, private)

> Source-first monorepo with `pnpm workspaces + ts references + vite alias`. Library `package.json` exports point to `src/*.ts` during development, and point to `dist/*.js` when published. The order in `pnpm-workspace.yaml` should follow the topological build order.

## 🤖 AGENTS.md Alias

If your AI assistant does not support [AGENTS.md](https://agents.md/). Add an alias for it.

## 🔧 Development Workflows

### Test With Your Own LLM API

- Create a `.env` file in the repo root with your LLM API config

    ```env
    LLM_MODEL_NAME=gpt-5.2
    LLM_API_KEY=your-api-key
    LLM_BASE_URL=https://api.your-llm-provider.com/v1
    ```

- **Ollama example** (tested on 0.15 + qwen3:14b, RTX3090 24GB):

    ```env
    LLM_BASE_URL="http://localhost:11434/v1"
    LLM_API_KEY="NA"
    LLM_MODEL_NAME="qwen3:14b"
    ```

    > @see https://alibaba.github.io/page-agent/docs/features/models#ollama for configuration

- **Restart the dev server** to load new env vars
- If not provided, the demo will use the free testing proxy by default. By using it, you agree to its [terms](./terms-and-privacy.md).

### Extension Development

```bash
pnpm run dev:ext
pnpm run build:ext
```

- Update `packages/extension/docs/extension_api.md` for API integration details

### Testing on Other Websites

- Start and serve a local `iife` script

    ```bash
    npm run dev:demo # Serving IIFE with auto rebuild at http://localhost:5174/page-agent.demo.js
    ```

- Add a new bookmark

    ```javascript
    javascript:(function(){var s=document.createElement('script');s.src=`http://localhost:5174/page-agent.demo.js?lang=en-US&t=${Math.random()}`;s.onload=()=>console.log(%27PageAgent ready!%27);document.head.appendChild(s);})();
    ```

- Click the bookmark on any page to load Page-Agent

> Warning: AK in your local `.env` will be inlined in the iife script. Be very careful when you distribute the script.

### Documentation

All docs live in this repo as markdown: the root [README.md](../README.md) (usage, headless architecture) and `docs/`. Keep them in sync with code changes — there is no docs website.

## 📦 Publishing

```bash
pnpm run version 1.x.0   # sync version to all packages + workspace cross-deps
pnpm build:libs
pnpm publish:libs        # ordered publish; token fetched from 1Password via `op`
```

`scripts/publish.js` skips already-published versions and always restores manifests, so it is safe to re-run after a partial failure. Git checks stay active — commit before publishing.

## 🔀 Upstream Syncs

This fork tracks [alibaba/page-agent](https://github.com/alibaba/page-agent). After a merge or rebase from upstream, `.husky/post-merge` automatically:

- purges upstream-only content (website, ui, zh docs) via `scripts/post-merge-cleanup.js`
- re-applies the `@kylebrodeur` scope translation via `scripts/apply-scope.js` (index: `scripts/scope-map.js`)

Both scripts are idempotent and can be run manually at any time.
