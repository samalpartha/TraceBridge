/**
 * TinyFish SSE proxy route
 * Keeps API key server-side (cookbook best practice).
 * Forwards SSE stream from TinyFish API to the client.
 */
import { NextRequest } from "next/server";

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || "";
const TINYFISH_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, goal, browser_profile, proxy_config } = body;

  if (!url || !goal) {
    return new Response(
      JSON.stringify({ error: "url and goal are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!TINYFISH_API_KEY) {
    return new Response(
      JSON.stringify({ error: "TINYFISH_API_KEY not configured on server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: Record<string, unknown> = {
      url,
      goal,
      browser_profile: browser_profile || "lite",
    };

    if (proxy_config) {
      payload.proxy_config = proxy_config;
    }

    const upstream = await fetch(TINYFISH_URL, {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return new Response(
        JSON.stringify({ error: `TinyFish API error: ${upstream.status}`, detail: err }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Forward the SSE stream directly
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to connect to TinyFish API", detail: String(error) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
