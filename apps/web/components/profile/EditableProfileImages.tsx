"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { routes } from "@/lib/routes";

/** POST an image file to a profile-upload endpoint; refresh on success. */
async function upload(endpoint: string, file: File): Promise<boolean> {
  const fd = new FormData();
  fd.set("image", file);
  const res = await fetch(endpoint, { method: "POST", body: fd });
  return res.ok;
}

function EditButton({
  endpoint,
  label,
  className,
}: {
  endpoint: string;
  label: string;
  className: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      if (await upload(endpoint, file)) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`profile-img-edit ${className}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label}
        title={label}
      >
        <Icon name="pen-line" size={14} />
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </>
  );
}

/** Profile banner with an inline edit button for the owner. */
export function EditableBanner({
  bannerUrl,
  editable,
}: {
  bannerUrl: string | null;
  editable: boolean;
}) {
  return (
    <div
      className={`profile-banner${bannerUrl ? "" : " profile-banner-empty"}`}
      style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
    >
      {editable && (
        <EditButton
          endpoint={routes.api.profile.banner}
          label="Editar banner"
          className="profile-banner-edit"
        />
      )}
    </div>
  );
}

/** Profile avatar with an inline edit button for the owner. */
export function EditableAvatar({
  avatarUrl,
  initial,
  editable,
}: {
  avatarUrl: string | null;
  initial: string;
  editable: boolean;
}) {
  return (
    <div className="profile-avatar-wrap">
      <div className="profile-avatar profile-avatar-lg">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {editable && (
        <EditButton
          endpoint={routes.api.profile.avatar}
          label="Editar avatar"
          className="profile-avatar-edit"
        />
      )}
    </div>
  );
}
