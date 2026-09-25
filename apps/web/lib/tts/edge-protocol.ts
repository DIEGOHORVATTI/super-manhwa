export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const CHROMIUM_VERSION = "143.0.3650.75";
export const EDGE_BASE = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
export const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

const MAJOR = CHROMIUM_VERSION.split(".")[0];

export const EDGE_HEADERS = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${MAJOR}.0.0.0 Safari/537.36 Edg/${MAJOR}.0.0.0`,
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
};

export const WEBSOCKET_HEADERS = {
  ...EDGE_HEADERS,
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
};

const WINDOWS_EPOCH_OFFSET_S = 11_644_473_600;

/** Anti-abuse token the service expects: SHA-256 of 5-minute Windows ticks + client token. */
export async function secMsGec(nowMs = Date.now()): Promise<string> {
  let seconds = Math.floor(nowMs / 1000) + WINDOWS_EPOCH_OFFSET_S;
  seconds -= seconds % 300;
  const payload = new TextEncoder().encode(
    `${BigInt(seconds) * 10_000_000n}${TRUSTED_CLIENT_TOKEN}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function edgeQuery(nowMs = Date.now()) {
  return `Sec-MS-GEC=${await secMsGec(nowMs)}&Sec-MS-GEC-Version=1-${CHROMIUM_VERSION}`;
}

export function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}%`;

export function buildSsml(text: string, voice: string, pitchPercent = 0, ratePercent = 0) {
  return (
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'>" +
    `<voice name='${voice}'><prosody pitch='${signed(pitchPercent)}' rate='${signed(ratePercent)}' volume='+0%'>` +
    `${escapeXml(text)}</prosody></voice></speak>`
  );
}

export function configMessage(date = new Date()) {
  const config = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
          outputFormat: OUTPUT_FORMAT,
        },
      },
    },
  };
  return `X-Timestamp:${date.toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(config)}\r\n`;
}

export function ssmlMessage(ssml: string, requestId: string, date = new Date()) {
  return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${date.toString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
}

/** Binary frames carry a 2-byte header length, the header text, then the audio bytes. */
export function audioFromFrame(frame: Uint8Array): Uint8Array | null {
  if (frame.length < 2) return null;
  const headerLength = (frame[0] << 8) | frame[1];
  const header = new TextDecoder().decode(frame.subarray(2, 2 + headerLength));
  if (!header.includes("Path:audio")) return null;
  const audio = frame.subarray(2 + headerLength);
  return audio.length ? audio : null;
}

export const isTurnEnd = (message: string) => message.includes("Path:turn.end");

export const VOICE_ID = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/;
