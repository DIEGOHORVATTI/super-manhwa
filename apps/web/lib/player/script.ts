export type Gender = "male" | "female";

export type Segment = {
  text: string;
  speaker: string;
};

export type Script = {
  lines: Segment[][];
  genders: Map<string, Gender | undefined>;
};

export const NARRATOR = "Narrador";
export const PROTAGONIST = "Protagonista";
export const UNKNOWN = "Desconhecido";
export const UNKNOWN_FEMALE = "Desconhecida";

const TURN_TAKING_GAP = 2;
const CONVERSATION_GAP = 8;

const DIALOGUE_START = /^\s*[—–-]\s*/;
const INNER_DASH = /\s+[—–]\s*|\s+-\s+/;

const VERBS =
  "disse|dizia|perguntou|respondeu|gritou|murmurou|sussurrou|exclamou|continuou|falou|retrucou|replicou|comentou|acrescentou|explicou|declarou|afirmou|indagou|questionou|resmungou|chamou|interrompeu|concordou|insistiu|completou|prosseguiu|anunciou|ordenou|berrou|rosnou|suspirou|riu|zombou|admitiu|confirmou|repetiu|protestou|observou|gaguejou|bufou|reclamou|avisou|provocou|brincou|choramingou|implorou|sugeriu|ironizou|disparou|rebateu|corrigiu";

const PRONOUN = String.raw`(?<pronoun>[Ee]l[ea])\b`;
const NAME = String.raw`(?<name>\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)?)`;
const SUBJECT = String.raw`(?:(?<article>o|a)\s+(?<noun>\p{L}+)|${PRONOUN}|${NAME})`;

const TAG_PATTERNS = [
  new RegExp(String.raw`^(?:${VERBS})\s+${SUBJECT}`, "u"),
  new RegExp(String.raw`^${SUBJECT}\s+(?:${VERBS})\b`, "u"),
  new RegExp(
    String.raw`^(?:${PRONOUN}|${NAME})\s+(?:apenas\s+|então\s+|só\s+)?\p{Ll}+(?:ou|eu|iu)\b`,
    "u",
  ),
];
const FIRST_PERSON = new RegExp(String.raw`^(?:eu\b|(?:${VERBS})\s+eu\b|\p{Ll}+(?:ei|i)\b)`, "iu");

type Tag = { speaker?: string; gender?: Gender };

type Part = { text: string; isSpeech: boolean };

type Entry = {
  parts: Part[];
  conversation: number;
  speaker?: string;
  hint?: Gender;
};

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function readTag(narration: string): Tag | undefined {
  const text = narration.trim();
  if (/^eu\b/i.test(text)) return { speaker: PROTAGONIST };

  const groups = TAG_PATTERNS.map((pattern) => pattern.exec(text)?.groups).find(Boolean);
  if (groups?.pronoun)
    return { gender: groups.pronoun.toLowerCase() === "ela" ? "female" : "male" };
  if (groups?.noun) {
    return { speaker: capitalize(groups.noun), gender: groups.article === "a" ? "female" : "male" };
  }
  if (groups?.name) return { speaker: groups.name };

  return FIRST_PERSON.test(text) ? { speaker: PROTAGONIST } : undefined;
}

function readActionBeat(narration: string) {
  const lastSentence = narration.split(/(?<=[.!?…])\s+/).at(-1) ?? "";
  const clauses = lastSentence.split(/,\s*/);
  return clauses
    .map((clause) =>
      TAG_PATTERNS.map((pattern) => pattern.exec(clause.trim())?.groups).find(Boolean),
    )
    .find((groups) => groups?.name)?.name;
}

function splitDialogue(paragraph: string): Part[] {
  return paragraph
    .replace(DIALOGUE_START, "")
    .split(INNER_DASH)
    .map((text, index) => ({
      text: text.replace(/^[,;:.\s]+/, "").trim(),
      isSpeech: index % 2 === 0,
    }))
    .filter((part) => part.text.length > 0);
}

function unknownFor(gender?: Gender) {
  return gender === "female" ? UNKNOWN_FEMALE : UNKNOWN;
}

function oppositeOf(gender?: Gender) {
  if (!gender) return undefined;
  return gender === "male" ? "female" : "male";
}

function isUnknown(speaker?: string) {
  return speaker === UNKNOWN || speaker === UNKNOWN_FEMALE;
}

function nearestPartner(
  turns: Entry[],
  index: number,
  neighbor: string,
  genders: Script["genders"],
) {
  const { hint } = turns[index];
  const fits = (speaker?: string) =>
    !!speaker &&
    speaker !== neighbor &&
    !isUnknown(speaker) &&
    (!hint || (speaker !== PROTAGONIST && genders.get(speaker) !== oppositeOf(hint)));

  for (let distance = 1; distance < turns.length; distance += 1) {
    const found = [turns[index - distance]?.speaker, turns[index + distance]?.speaker].find(fits);
    if (found) return found;
  }
  return undefined;
}

function fillUnknownTurns(entries: Entry[], genders: Script["genders"]) {
  const turnsByConversation = Map.groupBy(
    entries.filter((entry) => entry.speaker),
    (entry) => entry.conversation,
  );

  for (const turns of turnsByConversation.values()) {
    turns.forEach((turn, index) => {
      if (!isUnknown(turn.speaker)) return;

      const previous = turns[index - 1]?.speaker;
      const next = turns.slice(index + 1).find((later) => !isUnknown(later.speaker))?.speaker;
      const neighbor = previous && !isUnknown(previous) ? previous : next;
      if (!neighbor) return;

      const partner = nearestPartner(turns, index, neighbor, genders);
      if (!partner) return;
      turn.speaker = partner;
    });
  }
}

export function buildScript(paragraphs: string[]): Script {
  const genders: Script["genders"] = new Map([
    [NARRATOR, undefined],
    [UNKNOWN, "male"],
    [UNKNOWN_FEMALE, "female"],
  ]);
  const recent: string[] = [];
  let narrationGap = 0;
  let conversation = 0;
  let actionBeat: string | undefined;

  const entries = paragraphs.map((paragraph): Entry => {
    if (!DIALOGUE_START.test(paragraph)) {
      const isSceneBreak = !/\p{L}/u.test(paragraph);
      narrationGap += 1;
      if (narrationGap === TURN_TAKING_GAP || isSceneBreak) recent.length = 0;
      if (narrationGap === CONVERSATION_GAP || isSceneBreak) conversation += 1;
      actionBeat = readActionBeat(paragraph);
      return { parts: [{ text: paragraph, isSpeech: false }], conversation };
    }
    narrationGap = 0;
    const beat = actionBeat;
    actionBeat = undefined;

    const parts = splitDialogue(paragraph);
    const tag = parts
      .filter((part) => !part.isSpeech)
      .map((part) => readTag(part.text))
      .find(Boolean);
    const turnTaker = recent.length === 2 ? recent[0] : undefined;
    const turnTakerGender = turnTaker && genders.get(turnTaker);
    const pronounFits = turnTaker !== PROTAGONIST && turnTakerGender !== oppositeOf(tag?.gender);
    const fitsTurn = turnTaker && (!tag?.gender || pronounFits);
    const speaker = tag?.speaker ?? beat ?? (fitsTurn ? turnTaker : unknownFor(tag?.gender));

    if (tag?.gender && !genders.get(speaker)) genders.set(speaker, tag.gender);
    else if (!genders.has(speaker)) genders.set(speaker, undefined);

    if (recent.at(-1) !== speaker) {
      recent.push(speaker);
      if (recent.length > 2) recent.shift();
    }

    return { parts, conversation, speaker, hint: tag?.speaker || beat ? undefined : tag?.gender };
  });

  fillUnknownTurns(entries, genders);

  const lines = entries.map(({ parts, speaker }) =>
    parts.map((part) => ({ text: part.text, speaker: part.isSpeech ? speaker! : NARRATOR })),
  );

  return { lines, genders };
}
