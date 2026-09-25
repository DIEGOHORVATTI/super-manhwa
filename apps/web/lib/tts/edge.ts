import "server-only";

import { unstable_cache } from "next/cache";
import WebSocket from "ws";

import {
  EDGE_BASE,
  EDGE_HEADERS,
  TRUSTED_CLIENT_TOKEN,
  WEBSOCKET_HEADERS,
  audioFromFrame,
  buildSsml,
  configMessage,
  edgeQuery,
  isTurnEnd,
  ssmlMessage,
} from "./edge-protocol";

export type NeuralVoice = {
  id: string;
  name: string;
  lang: string;
  gender: "male" | "female";
  multilingual: boolean;
};

type SynthesisRequest = {
  text: string;
  voice: string;
  pitchPercent: number;
  ratePercent: number;
};

type EdgeVoice = { ShortName: string; Gender: string; Locale: string };

const TIMEOUT_MS = 20_000;

const randomHex = () => crypto.randomUUID().replaceAll("-", "");

export async function synthesize({ text, voice, pitchPercent, ratePercent }: SynthesisRequest) {
  const url = `wss://${EDGE_BASE}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&${await edgeQuery()}&ConnectionId=${randomHex()}`;
  const socket = new WebSocket(url, {
    headers: { ...WEBSOCKET_HEADERS, Cookie: `muid=${randomHex().toUpperCase()};` },
  });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error("Tempo esgotado na síntese de voz"));
    }, TIMEOUT_MS);
    const finish = (error?: Error) => {
      clearTimeout(timer);
      socket.close();
      if (error) reject(error);
      else if (chunks.length === 0) reject(new Error("A síntese não devolveu áudio"));
      else resolve(Buffer.concat(chunks));
    };

    socket.on("open", () => {
      socket.send(configMessage());
      socket.send(ssmlMessage(buildSsml(text, voice, pitchPercent, ratePercent), randomHex()));
    });
    socket.on("message", (data, isBinary) => {
      if (!isBinary) {
        if (isTurnEnd(data.toString())) finish();
        return;
      }
      const audio = audioFromFrame(new Uint8Array(data as Buffer));
      if (audio) chunks.push(audio);
    });
    socket.on("unexpected-response", (_, response) =>
      finish(new Error(`Serviço de voz respondeu ${response.statusCode}`)),
    );
    socket.on("error", (error) => finish(error));
  });
}

function friendlyName(shortName: string) {
  const [, , raw] = shortName.split("-");
  return raw.replace("MultilingualNeural", "").replace("Neural", "");
}

export const listNeuralVoices = unstable_cache(
  async (): Promise<NeuralVoice[]> => {
    const url = `https://${EDGE_BASE}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}&${await edgeQuery()}`;
    const response = await fetch(url, { headers: EDGE_HEADERS, cache: "no-store" });
    if (!response.ok) throw new Error(`Lista de vozes respondeu ${response.status}`);
    const voices = (await response.json()) as EdgeVoice[];

    return voices
      .filter((voice) => voice.Locale.startsWith("pt") || voice.ShortName.includes("Multilingual"))
      .map((voice) => ({
        id: voice.ShortName,
        name: friendlyName(voice.ShortName),
        lang: voice.Locale,
        gender: voice.Gender === "Female" ? ("female" as const) : ("male" as const),
        multilingual: voice.ShortName.includes("Multilingual"),
      }))
      .toSorted(
        (a, b) =>
          Number(b.lang === "pt-BR") - Number(a.lang === "pt-BR") || a.name.localeCompare(b.name),
      );
  },
  ["edge-tts", "voices"],
  { revalidate: 24 * 60 * 60 },
);
