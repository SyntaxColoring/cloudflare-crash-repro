/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	EXAMPLE_CLASS: DurableObjectNamespace
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Parse the URL to decide which durable object to route to,
		// then proxy to that durable object.
		const url = new URL(request.url)
		const id = env.EXAMPLE_CLASS.idFromName(url.pathname);
		const stub = env.EXAMPLE_CLASS.get(id);
		const response = await stub.fetch(request);
		return response;
	},
};

// Accept WebSockets, do a message broadcast to other connected clients
// Work out whether we need hibernated transactional memory or if in-memory is sufficient

export class DurableObjectExample {
	state: DurableObjectState

	constructor(state: DurableObjectState, env: Env) {
		this.state = state
	}

	async fetch(request: Request) {
		// TODO: Consider moving this to the normal worker.
		const hasUpgradeHeader = request.headers.get('Upgrade') === "websocket";
		if (!hasUpgradeHeader) {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		const [ours, theirs] = Object.values(new WebSocketPair())

		this.state.acceptWebSocket(ours)

		return new Response(null, {
			status: 101,
			webSocket: theirs,
		});
	}

	async webSocketMessage(source: WebSocket, message: string | ArrayBuffer): void {
		const allExceptSource = this.state.getWebSockets().filter(ws => ws !== source)
		for (const webSocket of allExceptSource) {
			try {
				webSocket.send(message)
			}
			catch {}
		}
	}
}
