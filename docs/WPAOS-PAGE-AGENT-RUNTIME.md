# WPAOS Page-Agent Runtime

This fork publishes Page Agent under the `@kylebrodeur` npm scope and adds the runtime
policy hooks WPAOS needs to embed `PageAgentCore` inside the WordPress admin.

## Packages

The fork-scoped package names are:

| Package                                   | Purpose                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `@kylebrodeur/page-agent`                 | Full PageAgent wrapper with UI panel exports.                       |
| `@kylebrodeur/page-agent-core`            | Headless runtime used by WPAOS.                                     |
| `@kylebrodeur/page-agent-llms`            | OpenAI-compatible chat completions client.                          |
| `@kylebrodeur/page-agent-page-controller` | DOM observation and interaction layer.                              |
| `@kylebrodeur/page-agent-ui`              | Built-in floating panel UI. WPAOS should not use this in Gutenberg. |
| `@kylebrodeur/page-agent-mcp`             | MCP server package for the extension workflow.                      |

For WPAOS W2, install only the runtime pieces needed by the bridge:

```sh
npm install @kylebrodeur/page-agent-core @kylebrodeur/page-agent-page-controller zod
```

Use `@kylebrodeur/page-agent` only when the built-in panel is acceptable. WPAOS should
render its own Gutenberg `PluginSidebar` and drive `PageAgentCore` directly.

## Publishing

Publish from a clean branch after running the checks below. Use public access for the
scoped packages:

```sh
npm test
npm run typecheck
npm run lint
npm run build:libs
npm run build:website
```

Publish public packages in dependency order:

```sh
npm publish --access public -w @kylebrodeur/page-agent-llms
npm publish --access public -w @kylebrodeur/page-agent-page-controller
npm publish --access public -w @kylebrodeur/page-agent-ui
npm publish --access public -w @kylebrodeur/page-agent-core
npm publish --access public -w @kylebrodeur/page-agent
npm publish --access public -w @kylebrodeur/page-agent-mcp
```

Do not publish private workspaces:

- `@kylebrodeur/page-agent-ext`
- `@kylebrodeur/page-agent-website`

If npm reports that a package or version already exists, bump the root version and sync
workspace versions:

```sh
npm run version -- 1.11.1
npm install --package-lock-only
```

Then commit the version change before publishing.

## Runtime Policy API

`PageAgentCore` now supports host-owned tool policy.

Tools can declare:

```ts
tool({
    description: 'Update a WPAOS block.',
    inputSchema: updateBlockSchema,
    canRun: async (args, ctx) => {
        if (!window.wpaosBridge.currentUser.canBuild) {
            return 'builder role required'
        }
        return true
    },
    destructive: true,
    confirmationLabel: (args) => `Update block ${args.uid}`,
    execute: async (args, ctx) => {
        return window.wpaosBridge.callAbility('wpaos/update-block', args, {
            signal: ctx.signal,
        })
    },
})
```

`canRun` runs before execution. Return `true` to allow the call, `false` to block with a
generic message, or a string to block with that reason.

`destructive` can be a boolean or callback. Use it for writes such as update, insert,
delete, move, publish-adjacent operations, and any action that could change persisted
content.

`confirmationLabel` lets the host render a human-readable confirmation prompt.

`PageAgentCore` config now accepts:

```ts
const agent = new PageAgentCore({
    pageController,
    baseURL: '/wp-json/wpaos/v1/llm',
    model: 'gpt-4.1-mini',
    apiKey: '',
    confirmAllMCP: true,
    onConfirmTool: async (request, options) => {
        return window.wpaosBridge.confirmTool(request, options)
    },
    customFetch: (url, init) => {
        const headers = new Headers(init?.headers)
        headers.set('X-WP-Nonce', window.wpaosBridge.nonce)
        headers.set('Authorization', `Bearer ${window.wpaosBridge.eventJwt}`)

        return fetch(url, {
            ...init,
            credentials: 'include',
            headers,
        })
    },
})
```

If a tool requires confirmation and `onConfirmTool` is missing, the runtime throws a
configuration error. This is intentional: missing confirmation UI is a host bug, not a
tool result the LLM should reason about.

## WPAOS Bridge Auth

WPAOS should not expose provider API keys to the browser.

The browser runtime sends OpenAI-compatible `/chat/completions` requests to a WPAOS REST
endpoint through `customFetch`. The bridge attaches host auth:

- `X-WP-Nonce` for WordPress REST intent.
- Session cookie via `credentials: 'include'`.
- Optional short-lived event JWT in `Authorization: Bearer ...` to bind a run, tab,
  user, post, and trace.

The server endpoint validates all of this before proxying the request to the real LLM
provider:

1. Verify the WP nonce and current user session.
2. Verify the event JWT signature, expiry, run id, post id, origin, and user id.
3. Check the current user capability for the requested operation.
4. Enforce per-tool permission on the server even if `canRun` already blocked it in the
   client.
5. Read the provider API key from server-held config or environment.
6. Forward an OpenAI-compatible request to the selected provider.
7. Emit audit rows with the page-agent `trace_id`.

`customFetch` is the supported transport seam. Do not add a second provider abstraction
inside Page Agent for WPAOS.

## WPAOS Integration Shape

WPAOS should construct the runtime in its admin bridge:

```ts
import { PageAgentCore, tool } from '@kylebrodeur/page-agent-core'
import { PageController } from '@kylebrodeur/page-agent-page-controller'

const pageController = new PageController({
    enableMask: true,
})

const agent = new PageAgentCore({
    pageController,
    baseURL: window.wpaosBridge.llm.baseURL,
    model: window.wpaosBridge.llm.model,
    apiKey: '',
    customFetch: window.wpaosBridge.fetchLLM,
    confirmAllMCP: window.wpaosBridge.confirmAllTools,
    onConfirmTool: window.wpaosBridge.confirmTool,
    customTools: {
        'wpaos/simplified-page': tool({
            description: 'Read a simplified WPAOS page outline.',
            inputSchema: simplifiedPageSchema,
            execute: (_, ctx) =>
                window.wpaosBridge.callAbility('wpaos/simplified-page', {}, { signal: ctx.signal }),
        }),
        'wpaos/update-block': tool({
            description: 'Update a WPAOS block draft.',
            inputSchema: updateBlockSchema,
            canRun: () => window.wpaosBridge.currentUser.canBuild || 'builder role required',
            destructive: true,
            confirmationLabel: ({ uid }) => `Update block ${uid}`,
            execute: (args, ctx) =>
                window.wpaosBridge.callAbility('wpaos/update-block', args, { signal: ctx.signal }),
        }),
    },
})
```

The client policy is defense in depth. Server-side WPAOS permission callbacks remain the
real write boundary.

## Abort And Confirmation

`canRun`, `destructive`, `confirmationLabel`, `onConfirmTool`, and tool `execute` all
receive an `AbortSignal` through context or options. WPAOS confirmation UI should reject
or resolve promptly when the signal aborts. `stop()` and `dispose()` abort a pending
confirmation cleanly.

## Files Of Interest

- `packages/core/src/tools/index.ts` - `PageAgentTool` policy fields.
- `packages/core/src/types.ts` - `confirmAllMCP`, `onConfirmTool`, and
  `ToolConfirmationRequest`.
- `packages/core/src/PageAgentCore.ts` - runtime policy enforcement before tool
  execution.
- `packages/core/src/PageAgentCore.test.ts` - policy and confirmation coverage.
- `packages/llms/src/OpenAIClient.test.ts` - `customFetch` bridge-auth coverage.
- `packages/website/src/pages/docs/advanced/page-agent-core/page.tsx` - public API docs.
- `packages/website/src/pages/docs/features/custom-tools/page.tsx` - custom tool docs.
- `packages/website/src/pages/docs/features/models/page.tsx` - OpenAI-compatible
  transport docs.
