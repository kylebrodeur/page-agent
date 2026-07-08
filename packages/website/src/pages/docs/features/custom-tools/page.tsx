import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function CustomTools() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '自定义工具' : 'Custom Tools'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '通过注册自定义工具，扩展 AI Agent 的能力边界。使用 Zod 定义输入接口，让 AI 安全调用你的业务逻辑。'
					: 'Extend AI Agent capabilities by registering custom tools. Define input schemas with Zod for safe business logic invocation.'}
			</p>

			<div className="space-y-8">
				<section>
					<Heading id="zod-version" className="text-2xl font-bold mb-4">
						{isZh ? 'Zod 版本' : 'Zod Version'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? 'Page Agent 使用 Zod 定义工具的输入 schema。支持 Zod 3 (>=3.25.0) 和 Zod 4，请从 zod/v4 子路径导入。不支持 Zod Mini。'
							: 'Page Agent uses Zod for tool input schemas. Both Zod 3 (>=3.25.0) and Zod 4 are supported. Always import from the zod/v4 subpath. Zod Mini is not supported.'}
					</p>
					<CodeEditor
						code={`// Zod 3 (>=3.25.0) or Zod 4
import { z } from 'zod/v4'`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="define-tools" className="text-2xl font-bold mb-4">
						{isZh ? '定义工具' : 'Define Tools'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '使用 tool() 辅助函数定义自定义工具，每个工具包含 description、inputSchema 和 execute 三个属性。异步工具必须 honor ctx.signal。'
							: 'Use the tool() helper to define custom tools with description, inputSchema, and execute. Async tools must honor ctx.signal.'}
					</p>

					<CodeEditor
						code={`import { z } from 'zod/v4'
import { PageAgent, tool } from 'page-agent'

const pageAgent = new PageAgent({
  customTools: {
  
	// 
    add_to_cart: tool({
      description: 'Add a product to the shopping cart by its product ID.',
      inputSchema: z.object({
        productId: z.string(),
        quantity: z.number().min(1).default(1),
      }),
      execute: async function (input, { signal }) {
        await fetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify(input),
          signal, // honor cancellation
        })
        return \`Added \${input.quantity}x \${input.productId} to cart.\`
      },
    }),

	// 
    search_knowledge_base: tool({
      description: 'Search the internal knowledge base and return relevant articles.',
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().max(10).default(3),
      }),
      execute: async function (input, { signal }) {
        const res = await fetch(
          \`/api/kb?q=\${encodeURIComponent(input.query)}&limit=\${input.limit}\`,
          { signal }
        )
        const articles = await res.json()
        return JSON.stringify(articles)
      },
    }),
  },
})`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="override-remove" className="text-2xl font-bold mb-4">
						{isZh ? '覆盖与移除内置工具' : 'Override & Remove Built-in Tools'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '使用相同的名称可以覆盖内置工具的行为，设置为 null 则完全移除该工具。'
							: 'Use the same name to override a built-in tool, or set it to null to remove it entirely.'}
					</p>

					<CodeEditor
						code={`const pageAgent = new PageAgent({
  customTools: {
    scroll: null, // remove scroll tool
    execute_javascript: null, // remove script execution
  },
})`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="tool-policy" className="text-2xl font-bold mb-4">
						{isZh ? '工具策略与确认' : 'Tool Policy & Confirmation'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '宿主应用可以在工具执行前进行权限检查和确认。PageAgent 只调用你提供的回调；nonce、事件 JWT、Cookie 和服务端 API Key 应由桥接层或后端代理管理。服务端仍必须验证每次写入。'
							: 'Host apps can gate and confirm tools before execution. PageAgent only calls your callbacks; nonces, event JWTs, cookies, and server-side provider keys should be managed by the bridge or backend proxy. The server must still authorize every write.'}
					</p>
					<CodeEditor
						code={`const agent = new PageAgentCore({
  pageController,
  baseURL: '/wp-json/wpaos/v1/llm-proxy',
  model: 'gpt-5.1',
  apiKey: '', // provider key stays server-side
  confirmAllMCP: true,
  customFetch: (url, init) => {
    const headers = new Headers(init?.headers)
    headers.set('X-WP-Nonce', window.wpaosBridge.nonce)
    headers.set('Authorization', \`Bearer \${window.wpaosBridge.eventJwt}\`)
    return fetch(url, {
      ...init,
      credentials: 'include',
      headers,
    })
  },
  onConfirmTool: async (request, { signal } = {}) => {
    return showHostModal({
      title: request.label,
      body: JSON.stringify(request.input, null, 2),
      destructive: request.destructive,
      signal,
    })
  },
  customTools: {
    update_block: tool({
      description: 'Update a block in the current page draft.',
      inputSchema: updateBlockSchema,
      canRun: async (_input, { signal }) => {
        const res = await fetch('/wp-json/wpaos/v1/can-build', {
          credentials: 'include',
          headers: { 'X-WP-Nonce': window.wpaosBridge.nonce },
          signal,
        })
        return res.ok || 'builder role required'
      },
      destructive: true,
      confirmationLabel: (input) => \`Update block \${input.uid}\`,
      execute: async (input, { signal }) => {
        const res = await fetch('/wp-json/wpaos/v1/update-block', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpaosBridge.nonce,
          },
          body: JSON.stringify(input),
          signal,
        })
        return await res.text()
      },
    }),
  },
})`}
						language="typescript"
					/>
				</section>
			</div>
		</div>
	)
}
