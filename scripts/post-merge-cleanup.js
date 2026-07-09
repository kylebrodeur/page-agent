#!/usr/bin/env node
/**
 * Post-merge hook: remove upstream content this fork does not ship, which a
 * merge or rebase from upstream (alibaba/page-agent) may have reintroduced.
 *
 * Triggered automatically by husky after `git merge` or `git rebase`
 * (see .husky/post-merge), together with apply-scope.js.
 */
import { existsSync, rmSync } from 'node:fs'

// Paths this fork intentionally removed. Anything reappearing here after an
// upstream sync gets purged again.
const PURGED_PATHS = [
	'docs/README-zh.md',
	'packages/website',
	'packages/ui',
	'.github/workflows/deploy-website.yml',
]

let changed = false

for (const path of PURGED_PATHS) {
	if (existsSync(path)) {
		rmSync(path, { recursive: true, force: true })
		console.log(`[post-merge] Removed ${path}`)
		changed = true
	}
}

if (changed) {
	console.log(
		'[post-merge] Upstream-only content purged. Review and amend the merge commit if needed.'
	)
}
