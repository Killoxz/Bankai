"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { VideoPlayer } from "./video-player";

interface Source {
  id: string;
  episode: number;
  url: string;
  label: string | null;
  createdAt: string;
  AddedBy: { username: string | null };
}

export function MyLibrary({ animeId, poster }: { animeId: number; poster?: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState<number | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [epOpen, setEpOpen] = useState(false);

  const [epInput, setEpInput] = useState("1");
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = () => {
    setLoading(true);
    fetch(`/api/anime/${animeId}/sources`)
      .then((res) => res.json())
      .then((json) => {
        const list: Source[] = json.sources ?? [];
        setSources(list);
        if (list.length > 0) {
          setSelectedEp((prev) => prev ?? list[0].episode);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [animeId]);

  const episodes = useMemo(
    () => [...new Set(sources.map((s) => s.episode))].sort((a, b) => a - b),
    [sources]
  );
  const sourcesForEp = useMemo(
    () => sources.filter((s) => s.episode === selectedEp),
    [sources, selectedEp]
  );
  const activeSource =
    sourcesForEp.find((s) => s.id === selectedSourceId) ?? sourcesForEp[0] ?? null;

  async function handleAdd() {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    setAddError(null);
    const episode = Number(epInput);
    if (!Number.isInteger(episode) || episode < 1) {
      setAddError("Enter a valid episode number.");
      return;
    }
    if (!urlInput.trim()) {
      setAddError("Enter a URL.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/anime/${animeId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          episode,
          url: urlInput.trim(),
          label: labelInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Couldn't add that source.");
      } else {
        setUrlInput("");
        setLabelInput("");
        setSelectedEp(episode);
        setFormOpen(false);
        load();
      }
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!currentUser) return;
    setSources((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch(
        `/api/anime/${animeId}/sources/${id}?username=${encodeURIComponent(currentUser)}`,
        { method: "DELETE" }
      );
      if (!res.ok) load();
    } catch {
      load();
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-white">Your Library</h2>
        <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Your Library</h2>
        <button
          onClick={() => (currentUser ? setFormOpen((o) => !o) : (window.location.href = "/login"))}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
        >
          <Plus className="size-3.5" />
          Add Episode
        </button>
      </div>

      {formOpen && (
        <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="w-24">
              <label className="mb-1 block text-xs text-white/50">Episode</label>
              <input
                type="number"
                min={1}
                value={epInput}
                onChange={(e) => setEpInput(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-white/50">Video URL</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-storage.example.com/episode-1.mp4"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs text-white/50">Label (opt.)</label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="1080p"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add Source"}
          </button>
          <p className="text-xs text-white/40">
            Paste a direct link to a file you host yourself — your own storage, NAS, etc.
          </p>
        </div>
      )}

      {episodes.length === 0 ? (
        <div className="rounded-xl bg-white/5 p-8 text-center">
          <p className="text-sm text-white/60">Your library is empty for this title.</p>
          <p className="mt-1 text-xs text-white/40">
            Add an episode source above to start playing it here.
          </p>
        </div>
      ) : (
        <>
          <VideoPlayer src={activeSource?.url ?? ""} poster={poster} key={activeSource?.id} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setEpOpen(false);
              }}
            >
              <button
                onClick={() => setEpOpen((o) => !o)}
                className="flex w-40 items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              >
                Episode {selectedEp}
                <ChevronDown className="size-4 text-white/50" />
              </button>
              {epOpen && (
                <div className="absolute left-0 top-11 z-20 max-h-64 w-40 overflow-y-auto rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
                  {episodes.map((ep) => (
                    <button
                      key={ep}
                      onClick={() => {
                        setSelectedEp(ep);
                        setSelectedSourceId(null);
                        setEpOpen(false);
                      }}
                      className={[
                        "block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/5",
                        ep === selectedEp ? "text-primary" : "text-white/80",
                      ].join(" ")}
                    >
                      Episode {ep}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {sourcesForEp.length > 1 && (
              <div className="flex items-center gap-1.5">
                {sourcesForEp.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSourceId(s.id)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      (activeSource?.id ?? sourcesForEp[0].id) === s.id
                        ? "bg-primary text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15",
                    ].join(" ")}
                  >
                    {s.label || "Source"}
                  </button>
                ))}
              </div>
            )}

            {mounted &&
              activeSource &&
              currentUser?.toLowerCase() === activeSource.AddedBy.username?.toLowerCase() && (
                <button
                  onClick={() => handleDelete(activeSource.id)}
                  aria-label="Remove this source"
                  className="ml-auto flex items-center gap-1.5 text-xs text-red-400 transition-colors hover:text-red-300"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </button>
              )}
          </div>
        </>
      )}
    </div>
  );
}
