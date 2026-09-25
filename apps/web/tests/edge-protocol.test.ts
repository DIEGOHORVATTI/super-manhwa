import { expect, test } from "bun:test";

import { VOICE_ID, audioFromFrame, buildSsml, isTurnEnd, secMsGec } from "@/lib/tts/edge-protocol";

test("token Sec-MS-GEC bate com a implementação de referência e muda a cada 5 minutos", async () => {
  const expected = "93A4A8521215144591AC12D00AC2FAE22543D58D608FAD2D48EA4C676A1D26FE";
  expect(await secMsGec(1_790_316_000_000)).toBe(expected);
  expect(await secMsGec(1_790_316_299_000)).toBe(expected);
  expect(await secMsGec(1_790_316_300_000)).not.toBe(expected);
});

test("SSML escapa o texto e aplica tom e velocidade com sinal", () => {
  const ssml = buildSsml(`Ele disse: "<fuja> & corra"`, "pt-BR-AntonioNeural", -12, 5);
  expect(ssml).toContain("<voice name='pt-BR-AntonioNeural'>");
  expect(ssml).toContain("pitch='-12%' rate='+5%'");
  expect(ssml).toContain("Ele disse: &quot;&lt;fuja&gt; &amp; corra&quot;");
});

test("frame binário devolve só o áudio quando o cabeçalho é Path:audio", () => {
  const frame = (header: string, body: number[]) => {
    const head = new TextEncoder().encode(header);
    return new Uint8Array([head.length >> 8, head.length & 255, ...head, ...body]);
  };
  expect(audioFromFrame(frame("X-RequestId:1\r\nPath:audio\r\n", [1, 2, 3]))).toEqual(
    new Uint8Array([1, 2, 3]),
  );
  expect(audioFromFrame(frame("Path:audio.metadata\r\n", []))).toBeNull();
  expect(isTurnEnd("X-RequestId:1\r\nPath:turn.end\r\n\r\n{}")).toBe(true);
});

test("só aceita ids de voz neural válidos", () => {
  expect(VOICE_ID.test("pt-BR-FranciscaNeural")).toBe(true);
  expect(VOICE_ID.test("en-US-AndrewMultilingualNeural")).toBe(true);
  expect(VOICE_ID.test("pt-BR-Francisca'><script>")).toBe(false);
});
