const REHBER = {
  "annem": "905551112233",
  "babam": "905551112244"
};

const UYGULAMALAR = {
  "whatsapp": "whatsapp://",
  "instagram": "instagram://",
  "spotify": "spotify://",
  "youtube": "youtube://",
  "roblox": "roblox://",
  "kamera": "camera://",
  "ayarlar": "App-Prefs:",
  "haritalar": "maps://"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const pin = process.env.SITE_PIN;
  if (pin && event.headers["x-site-pin"] !== pin) {
    return { statusCode: 200, body: JSON.stringify({ say: "PIN hatali efendim.", url: "" }) };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { statusCode: 200, body: JSON.stringify({ say: "API anahtari tanimli degil.", url: "" }) };

  try {
    const body = JSON.parse(event.body || "{}");
    const text = (body.text || "").trim();
    if (!text) return { statusCode: 200, body: JSON.stringify({ say: "Sizi duyamadim efendim.", url: "" }) };

    const rehber = Object.assign({}, REHBER, safeJson(process.env.REHBER));
    const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const system = `You are J.A.R.V.I.S. — Tony Stark's AI, now serving Emre on his iPhone.

Character: British butler intelligence. Composed, formal, economical. Dry deadpan wit. Never gushes, never uses exclamation marks or emoji. Says "efendim" roughly every third reply, not every sentence.

You ALWAYS reply with a single JSON object and nothing else. No markdown, no code fences:
{"say": "<spoken reply in Turkish, 1-2 short sentences>", "url": "<a URL for the phone to open, or empty string>"}

The "say" text is read aloud, so write plain speakable Turkish. No lists, no symbols.

Put a URL in "url" ONLY when Emre asks for an action:
- WhatsApp message: whatsapp://send?phone=<number>&text=<url-encoded message>
- Phone call: tel:<number>
- SMS: sms:<number>&body=<url-encoded>
- Directions: maps://?daddr=<url-encoded destination>&dirflg=d
- Open an app: ${JSON.stringify(UYGULAMALAR)}
- Web page: https://...
- Run another iOS Shortcut: shortcuts://run-shortcut?name=<url-encoded name>

Contacts (name to number): ${JSON.stringify(rehber)}
If a name is not in this list, do not guess a number. Say you do not have it.
URL-encode all text inside URLs.

If Emre is just chatting or asking a question, answer normally and leave "url" empty.
You cannot read his messages, notifications or screen. If asked, say so plainly.

Current date and time: ${now}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ say: "Sunucuya ulasamadim efendim.", url: "" }) };
    }

    let raw = (data.content || []).map(b => (b.type === "text" ? b.text : "")).join("").trim();
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let out;
    try { out = JSON.parse(raw); }
    catch (e) { out = { say: raw.slice(0, 300) || "Bunu anlayamadim efendim.", url: "" }; }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ say: String(out.say || ""), url: String(out.url || "") })
    };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ say: "Bir aksaklik oldu efendim.", url: "" }) };
  }
};

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }
