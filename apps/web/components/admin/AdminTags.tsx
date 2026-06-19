"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface CatalogTag {
  key: string;
  label: string;
  emoji: string | null;
  color: string | null;
  description: string | null;
  assignable: boolean;
  sortOrder: number;
}

const blank = {
  key: "",
  label: "",
  emoji: "",
  color: "#a78bfa",
  description: "",
  assignable: true,
};

const chipStyle = (color: string | null) =>
  color ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color } : undefined;

/** CRUD for the badge catalog. Auto badges (assignable=false) are editable but not deletable-safe. */
export function AdminTags() {
  const [tags, setTags] = useState<CatalogTag[] | null>(null);
  const [draft, setDraft] = useState({ ...blank });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { tags } = await rpc.admin.tags.list();
      setTags(tags ?? []);
    } catch {
      /* keep state */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    try {
      await rpc.admin.tags.create({
        key: draft.key.trim(),
        label: draft.label.trim(),
        emoji: draft.emoji.trim() || null,
        color: draft.color || null,
        description: draft.description.trim() || null,
        assignable: draft.assignable,
      });
      setDraft({ ...blank });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a tag.");
    }
  }

  async function save(t: CatalogTag) {
    try {
      await rpc.admin.tags.update({
        key: t.key,
        label: t.label,
        emoji: t.emoji || null,
        color: t.color || null,
        description: t.description || null,
        assignable: t.assignable,
        sortOrder: t.sortOrder,
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  async function remove(key: string) {
    if (!confirm(`Apagar a tag "${key}"? Some de todos os usuários que a têm.`)) return;
    try {
      await rpc.admin.tags.remove({ key });
      await load();
    } catch {
      /* ignore */
    }
  }

  function patch(key: string, body: Partial<CatalogTag>) {
    setTags((prev) => prev?.map((t) => (t.key === key ? { ...t, ...body } : t)) ?? prev);
  }

  if (!tags) return <p className="muted">Carregando…</p>;

  return (
    <>
      <h1 className="settings-title">Tags</h1>
      <p className="muted">
        Tags <em>atribuíveis</em> aparecem na lista de usuários para você dar/remover. As demais
        (admin, premium, conquistas) são concedidas automaticamente — aqui você só edita o visual.
      </p>

      <div className="admin-tag-form">
        <input
          className="input"
          placeholder="key (ex: vip)"
          value={draft.key}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
        />
        <input
          className="input"
          placeholder="Rótulo"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        <input
          className="input admin-tag-emoji"
          placeholder="🏆"
          value={draft.emoji}
          onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
        />
        <input
          type="color"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
        />
        <input
          className="input"
          placeholder="Descrição (tooltip)"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <label className="admin-tag-check">
          <input
            type="checkbox"
            checked={draft.assignable}
            onChange={(e) => setDraft({ ...draft, assignable: e.target.checked })}
          />
          atribuível
        </label>
        <button type="button" className="btn btn-primary" onClick={create}>
          Criar
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="admin-table">
        {tags.map((t) => (
          <div key={t.key} className="admin-row admin-tag-row">
            <span className="badge badge-special" style={chipStyle(t.color)}>
              {t.emoji ? `${t.emoji} ` : ""}
              {t.label}
            </span>
            <code className="muted">{t.key}</code>
            <input
              className="input"
              value={t.label}
              onChange={(e) => patch(t.key, { label: e.target.value })}
            />
            <input
              className="input admin-tag-emoji"
              value={t.emoji ?? ""}
              placeholder="emoji"
              onChange={(e) => patch(t.key, { emoji: e.target.value })}
            />
            <input
              type="color"
              value={t.color ?? "#a78bfa"}
              onChange={(e) => patch(t.key, { color: e.target.value })}
            />
            <input
              className="input"
              value={t.description ?? ""}
              placeholder="descrição"
              onChange={(e) => patch(t.key, { description: e.target.value })}
            />
            <label className="admin-tag-check">
              <input
                type="checkbox"
                checked={t.assignable}
                onChange={(e) => patch(t.key, { assignable: e.target.checked })}
              />
              atribuível
            </label>
            <button type="button" className="comment-link" onClick={() => save(t)}>
              Salvar
            </button>
            <button type="button" className="comment-link is-banned" onClick={() => remove(t.key)}>
              Apagar
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
