/**
 * Translation index: upstream (alibaba/page-agent) package names → this fork's
 * @kylebrodeur names. Single source of truth for the fork's scope rename.
 *
 * Used by apply-scope.js (post-merge codemod). Order matters: longest keys
 * first so specific names are translated before shorter prefixes.
 */
export const SCOPE_MAP = [
	['@page-agent/page-controller', '@kylebrodeur/page-agent-page-controller'],
	['@page-agent/core', '@kylebrodeur/page-agent-core'],
	['@page-agent/llms', '@kylebrodeur/page-agent-llms'],
	['@page-agent/mcp', '@kylebrodeur/page-agent-mcp'],
	['@page-agent/ui', '@kylebrodeur/page-agent-ui'],
	['@page-agent/*', '@kylebrodeur/page-agent-*'],
	['cdn.jsdelivr.net/npm/page-agent@', 'cdn.jsdelivr.net/npm/@kylebrodeur/page-agent@'],
	['registry.npmmirror.com/page-agent/', 'registry.npmmirror.com/@kylebrodeur/page-agent/'],
]

/** The fork's main (flagship) package name. */
export const MAIN_PACKAGE = '@kylebrodeur/page-agent'
