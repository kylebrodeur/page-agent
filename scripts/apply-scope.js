#!/usr/bin/env node
/**
 * Translate upstream (alibaba/page-agent) package names to this fork's
 * @kylebrodeur scope across the repo, using the index in scope-map.js.
 *
 * Idempotent — safe to run any time. Runs automatically after `git merge`
 * or `git rebase` via .husky/post-merge, so upstream syncs cannot
 * reintroduce old-scope imports.
 *
 * Usage: node scripts/apply-scope.js
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

import { SCOPE_MAP } from './scope-map.js'

const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|md|json|html|yml|yaml)$/
const EXCLUDE = new Set(['package-lock.json', 'scripts/scope-map.js'])

// Tracked + untracked-but-not-ignored files, so fresh merge results are covered.
const files = execSync('git ls-files --cached --others --exclude-standard', {
	encoding: 'utf-8',
})
	.split('\n')
	.filter((f) => f && TEXT_FILE.test(f) && !EXCLUDE.has(f))

let count = 0
for (const file of files) {
	const src = readFileSync(file, 'utf-8')
	let out = src
	for (const [from, to] of SCOPE_MAP) {
		out = out.replaceAll(from, to)
	}
	if (out !== src) {
		writeFileSync(file, out)
		console.log(`[scope] ${file}`)
		count++
	}
}

console.log(
	count
		? `[scope] Translated ${count} file(s) to the @kylebrodeur scope.`
		: '[scope] Nothing to translate.'
)
