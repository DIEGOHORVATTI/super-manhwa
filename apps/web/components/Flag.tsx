import type { CSSProperties } from "react";

/**
 * Country-flag icons, rendered as inline SVG (Iconify's `circle-flags` set,
 * viewBox 0 0 512 512). Same offline strategy as {@link Icon}: emitting the SVG
 * directly renders identically on server and client | no hydration flash, no
 * client boundary | unlike @iconify/react's runtime loader. We register only
 * the flags the catalog actually surfaces; `xx` is the neutral fallback.
 *
 * To add a flag: grab its `body` from
 * node_modules/@iconify-json/circle-flags/icons.json.
 */
const FLAGS = {
  br: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#6da544" d="M0 0h512v512H0z"/><path fill="#ffda44" d="M256 100.2L467.5 256L256 411.8L44.5 256z"/><path fill="#eee" d="M174.2 221a87 87 0 0 0-7.2 36.3l162 49.8a88.5 88.5 0 0 0 14.4-34c-40.6-65.3-119.7-80.3-169.1-52z"/><path fill="#0052b4" d="M255.7 167a89 89 0 0 0-41.9 10.6a89 89 0 0 0-39.6 43.4a181.7 181.7 0 0 1 169.1 52.2a89 89 0 0 0-9-59.4a89 89 0 0 0-78.6-46.8M212 250.5a149 149 0 0 0-45 6.8a89 89 0 0 0 10.5 40.9a89 89 0 0 0 120.6 36.2a89 89 0 0 0 30.7-27.3A151 151 0 0 0 212 250.5"/></g>',
  us: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M256 0h256v64l-32 32l32 32v64l-32 32l32 32v64l-32 32l32 32v64l-256 32L0 448v-64l32-32l-32-32v-64z"/><path fill="#d80027" d="M224 64h288v64H224Zm0 128h288v64H256ZM0 320h512v64H0Zm0 128h512v64H0Z"/><path fill="#0052b4" d="M0 0h256v256H0Z"/><path fill="#eee" d="m187 243l57-41h-70l57 41l-22-67zm-81 0l57-41H93l57 41l-22-67zm-81 0l57-41H12l57 41l-22-67zm162-81l57-41h-70l57 41l-22-67zm-81 0l57-41H93l57 41l-22-67zm-81 0l57-41H12l57 41l-22-67Zm162-82l57-41h-70l57 41l-22-67Zm-81 0l57-41H93l57 41l-22-67zm-81 0l57-41H12l57 41l-22-67Z"/></g>',
  es: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#ffda44" d="m0 128l256-32l256 32v256l-256 32L0 384Z"/><path fill="#d80027" d="M0 0h512v128H0zm0 384h512v128H0z"/><g fill="#eee"><path d="M144 304h-16v-80h16zm128 0h16v-80h-16z"/><ellipse cx="208" cy="296" rx="48" ry="32"/></g><g fill="#d80027"><rect width="16" height="24" x="128" y="192" rx="8"/><rect width="16" height="24" x="272" y="192" rx="8"/><path d="M208 272v24a24 24 0 0 0 24 24a24 24 0 0 0 24-24v-24h-24z"/></g><rect width="32" height="16" x="120" y="208" fill="#ff9811" ry="8"/><rect width="32" height="16" x="264" y="208" fill="#ff9811" ry="8"/><rect width="32" height="16" x="120" y="304" fill="#ff9811" rx="8"/><rect width="32" height="16" x="264" y="304" fill="#ff9811" rx="8"/><path fill="#ff9811" d="M160 272v24c0 8 4 14 9 19l5-6l5 10a21 21 0 0 0 10 0l5-10l5 6c6-5 9-11 9-19v-24h-9l-5 8l-5-8h-10l-5 8l-5-8z"/><path fill="#d80027" d="M122 248a4 4 0 0 0-4 4a4 4 0 0 0 4 4h172a4 4 0 0 0 4-4a4 4 0 0 0-4-4zm0 24a4 4 0 0 0-4 4a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4a4 4 0 0 0-4-4zm144 0a4 4 0 0 0-4 4a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4a4 4 0 0 0-4-4z"/><path fill="#eee" d="M196 168c-7 0-13 5-15 11l-5-1c-9 0-16 7-16 16s7 16 16 16c7 0 13-4 15-11a16 16 0 0 0 17-4a16 16 0 0 0 17 4a16 16 0 1 0 10-20a16 16 0 0 0-27-5q-4.5-6-12-6m0 8c5 0 8 4 8 8c0 5-3 8-8 8c-4 0-8-3-8-8c0-4 4-8 8-8m24 0c5 0 8 4 8 8c0 5-3 8-8 8c-4 0-8-3-8-8c0-4 4-8 8-8m-44 10l4 1l4 8c0 4-4 7-8 7s-8-3-8-8c0-4 4-8 8-8m64 0c5 0 8 4 8 8c0 5-3 8-8 8c-4 0-8-3-8-7l4-8z"/><path fill="none" d="M220 284v12c0 7 5 12 12 12s12-5 12-12v-12z"/><path fill="#ff9811" d="M200 160h16v32h-16z"/><path fill="#eee" d="M208 224h48v48h-48z"/><path fill="#d80027" d="m248 208l-8 8h-64l-8-8c0-13 18-24 40-24s40 11 40 24m-88 16h48v48h-48z"/><rect width="20" height="32" x="222" y="232" fill="#d80027" rx="10" ry="10"/><path fill="#ff9811" d="M168 232v8h8v16h-8v8h32v-8h-8v-16h8v-8zm8-16h64v8h-64z"/><g fill="#ffda44"><circle cx="186" cy="202" r="6"/><circle cx="208" cy="202" r="6"/><circle cx="230" cy="202" r="6"/></g><path fill="#d80027" d="M169 272v43a24 24 0 0 0 10 4v-47zm20 0v47a24 24 0 0 0 10-4v-43z"/><g fill="#338af3"><circle cx="208" cy="272" r="16"/><rect width="32" height="16" x="264" y="320" ry="8"/><rect width="32" height="16" x="120" y="320" ry="8"/></g></g>',
  mx: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M144 0h223l33 256l-33 256H144l-32-256z"/><path fill="#496e2d" d="M0 0h144v512H0z"/><path fill="#d80027" d="M368 0h144v512H368z"/><path fill="#ffda44" d="M256 277v10h12l10-22z"/><path fill="#496e2d" d="M160 242a96 96 0 0 0 192 0h-11a85 85 0 0 1-170 0zm39 17l-4 2c-2 2-2 6 1 8c15 14 34 22 54 24v17h12v-17c20-2 39-10 54-24c3-2 3-6 1-8s-6-2-8 0a78 78 0 0 1-53 21c-19 0-38-8-53-21z"/><path fill="#338af3" d="M256 316c-14 0-28-5-40-13l6-9c20 13 48 13 68 0l7 9c-12 8-26 13-41 13"/><path fill="#751a46" d="M256 174c22 11 12 33 11 34l-2-4c-5-11-18-18-31-18v11c6 0 11 5 11 11c-7 7-9 17-4 26l4 8l-13 23l29-7l18 18v-11l11 11l23-11l-35-21l-5-21l28 16c4 11 12 21 23 26c9-83-42-91-61-91z"/><path fill="#6da544" d="M222 271c-15 0-33-12-38-40l11-2c4 23 18 31 27 31q4.5 0 6-3c0-2 0-3-6-5c-3-1-7-2-10-5c-10-12 4-24 11-30c1-1 2-2 1-3c0 0-2-2-5-2c-7 0-12-4-14-11c-2-6 2-13 8-17l5 11c-2 0-2 2-2 4c0 0 1 2 3 2c7 0 14 4 16 9c1 3 2 9-5 15c-7 7-11 12-9 15l5 1c5 2 14 5 13 17c-1 8-8 13-17 13h-1z"/><path fill="#ffda44" d="m234 186l-12 11v11l18-9c3-1 3-5 1-7z"/><circle cx="172" cy="275" r="8" fill="#ffda44"/><circle cx="189" cy="302" r="8" fill="#ffda44"/><circle cx="216" cy="323" r="8" fill="#ffda44"/><circle cx="297" cy="323" r="8" fill="#ffda44"/><circle cx="324" cy="302" r="8" fill="#ffda44"/><circle cx="341" cy="275" r="8" fill="#ffda44"/><rect width="34" height="22" x="239" y="299" fill="#ff9811" rx="11" ry="11"/></g>',
  jp: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M0 0h512v512H0z"/><circle cx="256" cy="256" r="111.3" fill="#d80027"/></g>',
  kr: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M0 0h512v512H0Z"/><path fill="#333" d="m350 335l24-24l16 16l-24 23zm-39 39l24-24l15 16l-23 24zm87 8l23-24l16 16l-24 24zm-40 39l24-23l16 15l-24 24Zm16-63l24-23l15 15l-23 24zm-39 40l23-24l16 16l-24 23zm63-221l-63-63l15-15l64 63zm-63-15l-24-24l16-16l23 24zm39 39l-24-24l16-15l24 23zm8-87l-24-23l16-16l24 24Zm39 40l-23-24l15-16l24 24ZM91 358l63 63l-16 16l-63-63zm63 16l23 24l-15 15l-24-23zm-40-39l24 23l-16 16l-23-24zm24-24l63 63l-16 16l-63-63zm16-220l-63 63l-16-16l63-63zm23 23l-63 63l-15-16l63-63zm24 24l-63 63l-16-16l63-63z"/><path fill="#d80027" d="M319 319L193 193a89 89 0 1 1 126 126"/><path fill="#0052b4" d="M319 319a89 89 0 1 1-126-126z"/><circle cx="224.5" cy="224.5" r="44.5" fill="#d80027"/><circle cx="287.5" cy="287.5" r="44.5" fill="#0052b4"/></g>',
  cn: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#d80027" d="M0 0h512v512H0z"/><path fill="#ffda44" d="m140.1 155.8l22.1 68h71.5l-57.8 42.1l22.1 68l-57.9-42l-57.9 42l22.2-68l-57.9-42.1H118zm163.4 240.7l-16.9-20.8l-25 9.7l14.5-22.5l-16.9-20.9l25.9 6.9l14.6-22.5l1.4 26.8l26 6.9l-25.1 9.6zm33.6-61l8-25.6l-21.9-15.5l26.8-.4l7.9-25.6l8.7 25.4l26.8-.3l-21.5 16l8.6 25.4l-21.9-15.5zm45.3-147.6L370.6 212l19.2 18.7l-26.5-3.8l-11.8 24l-4.6-26.4l-26.6-3.8l23.8-12.5l-4.6-26.5l19.2 18.7zm-78.2-73l-2 26.7l24.9 10.1l-26.1 6.4l-1.9 26.8l-14.1-22.8l-26.1 6.4l17.3-20.5l-14.2-22.7l24.9 10.1z"/></g>',
  hk: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#d80027" d="M0 0h512v512H0z"/><path fill="#eee" d="M282.4 193.7c-5.8 24.2-16.1 19.6-21.2 40.7a55.7 55.7 0 0 1 26-108.3c-10.1 42.2.4 46-4.8 67.6M205 211.6c21.2 13 13.6 21.4 32.1 32.8a55.7 55.7 0 0 1-94.9-58.2c37 22.7 43.8 13.8 62.8 25.4m-7 79.3c19-16.2 24.7-6.4 41.2-20.4a55.7 55.7 0 0 1-84.7 72.2c33-28.2 26.6-37.4 43.6-51.8zm73.4 31c-9.6-23 1.5-25.3-6.8-45.3a55.7 55.7 0 0 1 42.6 102.8c-16.6-40-27.3-36.9-35.8-57.4zm52.2-60c-24.9 2-23.7-9.3-45.3-7.6a55.7 55.7 0 0 1 111-8.7c-43.3 3.4-43.6 14.5-65.7 16.3"/></g>',
  fr: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M167 0h178l25.9 252.3L345 512H167l-29.8-253.4z"/><path fill="#0052b4" d="M0 0h167v512H0z"/><path fill="#d80027" d="M345 0h167v512H345z"/></g>',
  it: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M167 0h178l25.9 252.3L345 512H167l-29.8-253.4z"/><path fill="#6da544" d="M0 0h167v512H0z"/><path fill="#d80027" d="M345 0h167v512H345z"/></g>',
  de: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#ffda44" d="m0 345l256.7-25.5L512 345v167H0z"/><path fill="#d80027" d="m0 167l255-23l257 23v178H0z"/><path fill="#333" d="M0 0h512v167H0z"/></g>',
  ru: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#0052b4" d="M512 170v172l-256 32L0 342V170l256-32z"/><path fill="#eee" d="M512 0v170H0V0Z"/><path fill="#d80027" d="M512 342v170H0V342Z"/></g>',
  id: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="m0 256l249.6-41.3L512 256v256H0z"/><path fill="#a2001d" d="M0 0h512v256H0z"/></g>',
  xx: '<mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M0 0h512v512H0z"/><circle cx="253" cy="380" r="32" fill="#acabb1"/><path fill="#acabb1" d="M322.4 135.5c-15.6-13.6-37.4-20.3-65.5-20.3c-27.9 0-49.9 7.2-66 21.4a74.9 74.9 0 0 0-24.3 55.4h-.2v12.8H224l.1-9a35.2 35.2 0 0 1 9.3-24.8c5.8-6.1 13.7-9 23.5-9c20.7 0 31 11 31 33.4c0 7.4-2 14.5-6 21.1a124.2 124.2 0 0 1-23.9 26a90.4 90.4 0 0 0-24.8 32.3c-4.5 11-6.8 26.7-6.8 45.2h51l.8-13.1a54 54 0 0 1 17.3-33.9l16.2-15.2a131.4 131.4 0 0 0 26.4-33.2a69.5 69.5 0 0 0 7.6-31.8c-.1-24.7-7.8-43.7-23.3-57.3"/></g>',
} as const;

type CountryCode = keyof typeof FLAGS;

/** Source language code → country whose flag represents it. MangaDex's `en`
 *  maps to the US flag by convention; unknowns fall back to `xx`. */
const LANG_TO_COUNTRY: Record<string, CountryCode> = {
  "pt-br": "br",
  pt: "br",
  en: "us",
  "en-us": "us",
  es: "es",
  "es-la": "mx",
  ja: "jp",
  ko: "kr",
  zh: "cn",
  "zh-hk": "hk",
  fr: "fr",
  it: "it",
  de: "de",
  ru: "ru",
  id: "id",
};

/** Human-readable (pt-BR UI) name for a source language code. */
const LANG_LABEL: Record<string, string> = {
  "pt-br": "Português",
  pt: "Português",
  en: "Inglês",
  "en-us": "Inglês",
  es: "Espanhol",
  "es-la": "Espanhol (LA)",
  ja: "Japonês",
  ko: "Coreano",
  zh: "Chinês",
  "zh-hk": "Chinês (HK)",
  fr: "Francês",
  it: "Italiano",
  de: "Alemão",
  ru: "Russo",
  id: "Indonésio",
};

export const langLabel = (lang: string): string =>
  LANG_LABEL[lang.toLowerCase()] ?? lang.toUpperCase();

/**
 * Circular flag for a source language. `size` sets width/height (flags are
 * rendered square/circular); falls back to a neutral flag for unknown langs.
 */
export function Flag({
  lang,
  size = 16,
  className,
  title,
}: {
  lang: string;
  size?: number | string;
  className?: string;
  title?: string;
}) {
  const code = LANG_TO_COUNTRY[lang.toLowerCase()] ?? "xx";
  const style: CSSProperties = { borderRadius: "50%", display: "block", flex: "none" };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      // Trusted static icon data (never user input).
      dangerouslySetInnerHTML={{ __html: FLAGS[code] }}
    />
  );
}
