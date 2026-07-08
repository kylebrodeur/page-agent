/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { type AgentConfig, PageAgentCore } from '@kylebrodeur/page-agent-core'
import { PageController, type PageControllerConfig } from '@kylebrodeur/page-agent-page-controller'

export * from '@kylebrodeur/page-agent-core'

export type PageAgentConfig = AgentConfig & PageControllerConfig

/**
 * Headless PageAgent entry point.
 *
 * This class combines PageAgentCore with the default PageController. It does
 * not include the built-in UI Panel, so it can be used with any framework
 * (Arrow.js, vanilla JS, React, etc.) without pulling in UI dependencies.
 */
export class PageAgent extends PageAgentCore {
	constructor(config: PageAgentConfig) {
		const pageController = new PageController({
			...config,
			enableMask: config.enableMask ?? true,
		})

		super({ ...config, pageController })
	}
}
