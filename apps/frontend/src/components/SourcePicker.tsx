import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

/** Source selector with dynamic-discovery toggle (6 featured ↔ all 115) + lang filter. */
export function SourcePicker({ value, onChange }: Props) {
  const [all, setAll] = useState(false);
  const [lang, setLang] = useState("");

  const { data } = useQuery(orpc.sources.list.queryOptions({ input: { all } }));
  const sources = data?.sources ?? [];

  const langs = useMemo(
    () => Array.from(new Set(sources.map((s) => s.lang))).filter(Boolean).sort(),
    [sources],
  );
  const visible = useMemo(() => sources.filter((s) => !lang || s.lang === lang), [sources, lang]);

  return (
    <div className="row" style={{ gap: 8, alignItems: "center" }}>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {visible.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.lang}){s.hasCloudflare ? " 🛡" : ""}{s.isNsfw ? " 🔞" : ""}
          </option>
        ))}
      </select>
      {all && langs.length > 1 && (
        <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="">todos idiomas</option>
          {langs.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        todas ({all ? sources.length : "6 destaque"})
      </label>
    </div>
  );
}
