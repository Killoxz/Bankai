"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";

interface EditProfileModalProps {
  username: string;
  image: string | null;
  banner: string | null;
  onImageChange: (url: string | null) => void;
  onBannerChange: (url: string | null) => void;
  onClose: () => void;
}

export function EditProfileModal({
  username,
  image,
  banner,
  onImageChange,
  onBannerChange,
  onClose,
}: EditProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1c1c1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/40 transition-colors hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <ImageField
          label="Profile Picture"
          username={username}
          kind="image"
          value={image}
          round
          onChange={onImageChange}
        />
        <ImageField
          label="Banner Image"
          username={username}
          kind="banner"
          value={banner}
          onChange={onBannerChange}
        />

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ImageField({
  label,
  username,
  kind,
  value,
  round,
  onChange,
}: {
  label: string;
  username: string;
  kind: "image" | "banner";
  value: string | null;
  round?: boolean;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const form = new FormData();
      form.append("username", username);
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/profile/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Upload failed. Please try again.");
        return;
      }
      onChange(json.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, [kind]: "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't remove. Please try again.");
        return;
      }
      setPreview(null);
      onChange(null);
    } catch {
      setError("Couldn't remove. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? value;

  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-white/60">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className={[
            "shrink-0 overflow-hidden bg-white/5",
            round ? "size-14 rounded-full" : "h-12 w-20 rounded-lg",
          ].join(" ")}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-white/20">
              <ImageIcon className="size-5" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Upload new"}
            </button>
            {value && !busy && (
              <button
                onClick={handleRemove}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
