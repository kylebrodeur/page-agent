#!/usr/bin/env node
/**
 * Publish all public @kylebrodeur packages in dependency order.
 *
 * Usage:
 *   node scripts/publish.js            # real publish
 *   node scripts/publish.js --dry-run  # no upload
 *
 * Git checks stay fully active (never --no-git-checks). What this adds over
 * a plain `&&` chain:
 *   - skips packages already published at the current version (safe re-runs
 *     after a partial failure; npm versions are immutable)
 *   - always restores manifests afterward, even on failure, so a dead publish
 *     can never leave the tree unclean (package.json.bak / LICENSE debris)
 *   - requires dist/ to exist (run `pnpm build:libs` first)
 */
import chalk from 'chalk'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.slice(2).includes('--dry-run')
const { version } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))

/** Fetch the npm token from 1Password (never written to disk). */
function getNpmToken() {
	console.log(chalk.dim(' ▸ fetching npm token from 1Password'))
	return execSync('op read "op://Personal/npmjs token/credential"', {
		encoding: 'utf-8',
		stdio: ['inherit', 'pipe', 'inherit'],
	}).trim()
}

// Dependency order: dependencies before dependents.
const PACKAGES = [
	{ name: '@kylebrodeur/page-agent-llms', dir: 'llms', needsDist: true },
	{ name: '@kylebrodeur/page-agent-page-controller', dir: 'page-controller', needsDist: true },
	{ name: '@kylebrodeur/page-agent-core', dir: 'core', needsDist: true },
	{ name: '@kylebrodeur/page-agent', dir: 'page-agent', needsDist: true },
	{ name: '@kylebrodeur/page-agent-mcp', dir: 'mcp', needsDist: false },
]

const missing = PACKAGES.filter(
	(p) => p.needsDist && !existsSync(join(rootDir, 'packages', p.dir, 'dist'))
)
if (missing.length) {
	console.error(chalk.red(`Missing dist/ for: ${missing.map((p) => p.name).join(', ')}`))
	console.error(chalk.yellow('Run `pnpm build:libs` first.'))
	process.exit(1)
}

function isPublished(name) {
	try {
		return !!execSync(`npm view ${name}@${version} version`, {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return false
	}
}

const dryFlag = dryRun ? '--dry-run ' : ''
const env = { ...process.env }
if (!dryRun) env['npm_config_//registry.npmjs.org/:_authToken'] = getNpmToken()
let failed = null
try {
	for (const p of PACKAGES) {
		if (!dryRun && isPublished(p.name)) {
			console.log(chalk.dim(` ▸ ${p.name}@${version} already published, skipping`))
			continue
		}
		console.log(chalk.bgBlue.white.bold(` ▸ publish ${p.name}${dryRun ? ' (dry-run)' : ''} `))
		execSync(`pnpm --filter ${p.name} publish ${dryFlag}--access public`, {
			stdio: 'inherit',
			cwd: rootDir,
			env,
		})
	}
} catch (err) {
	failed = err
} finally {
	// Restore any manifest left rewritten by a failed publish. No-op when clean.
	execSync('pnpm -r --if-present run postpublish', { stdio: 'inherit', cwd: rootDir })
}

if (failed) {
	console.error(chalk.red('\n✗ Publish failed — manifests restored. Fix the cause and re-run;'))
	console.error(chalk.red('  already-published packages will be skipped.'))
	process.exit(1)
}
console.log(chalk.green.bold(`\n✓ ${dryRun ? 'Dry run' : 'Publish'} complete (${version}).\n`))
