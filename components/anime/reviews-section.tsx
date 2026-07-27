"use client";

import { useEffect, useState } from "react";
import { Star, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Modal } from "@/components/ui/modal";

interface Review {
  id: string;
  rating: number;
  body: string;
  containsSpoiler: boolean;
  createdAt: string;
  User: { username: string | null };
}

export function ReviewsSection({ animeId }: { animeId: number }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = () => {
    setLoading(true);
    fetch(`/api/anime/${animeId}/reviews`)
      .then((res) => res.json())
      .then((json) => setReviews(json.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [animeId]);

  async function handleDelete(reviewId: string) {
    if (!currentUser) return;
    setReviews((rs) => rs.filter((r) => r.id !== reviewId)); // optimistic
    try {
      const res = await fetch(
        `/api/anime/${animeId}/reviews/${reviewId}?username=${encodeURIComponent(currentUser)}`,
        { method: "DELETE" }
      );
      if (!res.ok) load(); // revert by refetching
    } catch {
      load();
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Recent Reviews</h2>
      </div>

      <button
        onClick={() => (currentUser ? setModalOpen(true) : (window.location.href = "/login"))}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:brightness-95"
      >
        <Plus className="size-4" />
        Write a Review
      </button>

      {loading ? (
        <p className="py-6 text-center text-sm text-white/40">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">
          No reviews yet — be the first to write one.
        </p>
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-black">
                  {r.User.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {r.containsSpoiler && (
                    <span className="text-xs font-semibold text-primary">Spoiler</span>
                  )}
                  <span className="font-semibold text-white">{r.User.username}</span>
                  <span className="text-xs text-white/40">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {mounted &&
                    currentUser?.toLowerCase() === r.User.username?.toLowerCase() && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-0.5 pl-12">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < r.rating
                        ? "size-3 fill-primary text-primary"
                        : "size-3 text-white/20"
                    }
                  />
                ))}
              </div>
              <p className="mt-2 pl-12 text-sm leading-relaxed text-white/70">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <WriteReviewModal
          animeId={animeId}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function WriteReviewModal({
  animeId,
  onClose,
  onSaved,
}: {
  animeId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setError(null);
    if (rating < 1) return setError("Please choose a rating.");
    if (body.trim().length < 5) return setError("Review must be at least 5 characters.");
    setBusy(true);
    try {
      const res = await fetch(`/api/anime/${animeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, rating, body, containsSpoiler: spoiler }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Something went wrong.");
      else onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add A Review?" onClose={onClose}>
      <div className="mt-5">
        <p className="mb-2 text-sm text-white/50">Rate</p>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1;
            const filled = (hoverRating || rating) >= val;
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(val)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(val)}
                aria-label={`${val} star${val > 1 ? "s" : ""}`}
              >
                <Star
                  className={filled ? "size-6 fill-white text-white" : "size-6 text-white/25"}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm text-white/50">Review</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe your emotions"
          rows={4}
          className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
        />
      </div>

      <label className="mt-4 flex items-center gap-2.5 text-sm text-white/80">
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(e) => setSpoiler(e.target.checked)}
          className="size-4 rounded border-white/25 bg-transparent accent-primary"
        />
        Contains spoilers?
      </label>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </Modal>
  );
}
