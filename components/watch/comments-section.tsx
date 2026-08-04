"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

interface CommentNode {
  id: string;
  body: string;
  parentId: string | null;
  episode: number | null;
  createdAt: string;
  User: { username: string | null };
  replies: CommentNode[];
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

type Tab = "episode" | "anime";

export function CommentsSection({
  animeId,
  episode,
}: {
  animeId: number;
  episode: number;
}) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [tab, setTab]           = useState<Tab>("episode");
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [draft, setDraft]       = useState("");
  const [posting, setPosting]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchUrl =
    tab === "episode"
      ? `/api/anime/${animeId}/comments?episode=${episode}`
      : `/api/anime/${animeId}/comments?mode=anime`;

  const load = () => {
    setLoading(true);
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((json) => setComments(json.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Reload whenever tab or episode changes
  useEffect(load, [tab, episode, animeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body: string, parentId: string | null) {
    if (!currentUser) {
      window.location.href = "/login";
      return null;
    }
    const res = await fetch(`/api/anime/${animeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUser,
        body,
        parentId,
        episode: tab === "episode" ? episode : null,
      }),
    });
    const json = await res.json();
    return res.ok ? json.comment : null;
  }

  async function handlePostTop() {
    if (posting || draft.trim().length === 0) return;
    setPosting(true);
    const ok = await post(draft, null);
    setPosting(false);
    if (ok) {
      setDraft("");
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!currentUser) return;
    setComments((cs) =>
      cs
        .filter((c) => c.id !== id)
        .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }))
    );
    try {
      const res = await fetch(
        `/api/anime/${animeId}/comments/${id}?username=${encodeURIComponent(currentUser)}`,
        { method: "DELETE" }
      );
      if (!res.ok) load();
    } catch {
      load();
    }
  }

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">

      {/* ── Header + tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-0.5">
          <button
            onClick={() => setTab("episode")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "episode"
                ? "bg-primary text-black shadow"
                : "text-white/50 hover:text-white",
            )}
          >
            Episode {episode}
          </button>
          <button
            onClick={() => setTab("anime")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "anime"
                ? "bg-primary text-black shadow"
                : "text-white/50 hover:text-white",
            )}
          >
            Anime
          </button>
        </div>

        <span className="text-[12px] text-white/30">
          {totalCount} comment{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── TAC community banner ──────────────────────────────────────────── */}
      <a
        href="https://theanimecommunity.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between border-b border-white/[0.04] bg-[#02a9ff]/[0.06] px-4 py-2 transition-colors hover:bg-[#02a9ff]/[0.1]"
      >
        <span className="text-[12px] font-semibold text-[#02a9ff]">
          Join the discussion on The Anime Community
        </span>
        <ExternalLink className="size-3.5 shrink-0 text-[#02a9ff]" />
      </a>

      {/* ── Compose ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3 p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            currentUser
              ? tab === "episode"
                ? `Comment on Episode ${episode}…`
                : "Share your thoughts on this anime…"
              : "Log in to comment."
          }
          disabled={!currentUser}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary disabled:opacity-50"
        />
        <button
          onClick={handlePostTop}
          disabled={posting || draft.trim().length === 0}
          className="shrink-0 self-end rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
        >
          Post
        </button>
      </div>

      {/* ── Comment list ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-white/40">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            {tab === "episode"
              ? `No comments yet for Episode ${episode}. Be the first!`
              : "No general comments yet — share your thoughts on the anime!"}
          </p>
        ) : (
          <div className="space-y-6">
            {comments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                mounted={mounted}
                currentUser={currentUser}
                onReply={post}
                onDelete={handleDelete}
                onPosted={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  mounted,
  currentUser,
  onReply,
  onDelete,
  onPosted,
}: {
  comment: CommentNode;
  mounted: boolean;
  currentUser: string | null;
  onReply: (body: string, parentId: string | null) => Promise<unknown>;
  onDelete: (id: string) => void;
  onPosted: () => void;
}) {
  const [replying, setReplying]     = useState(false);
  const [replyText, setReplyText]   = useState("");
  const [showReplies, setShowReplies] = useState(true);
  const [posting, setPosting]       = useState(false);
  const isOwn = mounted && currentUser?.toLowerCase() === comment.User.username?.toLowerCase();

  async function submitReply() {
    if (posting || replyText.trim().length === 0) return;
    setPosting(true);
    const ok = await onReply(replyText, comment.id);
    setPosting(false);
    if (ok) {
      setReplyText("");
      setReplying(false);
      onPosted();
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-black">
          {comment.User.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-white">{comment.User.username}</span>
            <span className="text-xs text-white/40">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/75">{comment.body}</p>
          <div className="mt-1.5 flex items-center gap-4">
            <button
              onClick={() => setReplying((r) => !r)}
              className="text-xs font-semibold uppercase tracking-wide text-white/40 transition-colors hover:text-white"
            >
              Reply
            </button>
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-red-400 transition-colors hover:text-red-300"
              >
                Delete
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-3 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply…"
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
              />
              <button
                onClick={submitReply}
                disabled={posting || replyText.trim().length === 0}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-40"
              >
                Reply
              </button>
            </div>
          )}

          {comment.replies.length > 0 && (
            <>
              <button
                onClick={() => setShowReplies((s) => !s)}
                className="mt-3 text-xs font-medium text-white/40 hover:text-white/70"
              >
                {showReplies ? "Hide Replies" : `Show ${comment.replies.length} Replies`}
              </button>
              {showReplies && (
                <div className="mt-3 space-y-4 border-l border-white/10 pl-4">
                  {comment.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/80 text-xs font-bold text-black">
                        {r.User.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-sm font-semibold text-white">{r.User.username}</span>
                          <span className="text-xs text-white/40">{timeAgo(r.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-white/75">{r.body}</p>
                        {mounted && currentUser?.toLowerCase() === r.User.username?.toLowerCase() && (
                          <button
                            onClick={() => onDelete(r.id)}
                            className="mt-1 text-xs text-red-400 transition-colors hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
