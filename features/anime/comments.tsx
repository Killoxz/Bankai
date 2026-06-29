"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

interface CommentT {
  id: string;
  author: string;
  avatar: string | null;
  body: string;
  likes: number;
  liked: boolean;
  createdAt: string;
}

export function Comments() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [comments, setComments] = useState<CommentT[]>([]);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setComments((c) => [
      {
        id: crypto.randomUUID(),
        author: currentUser?.username ?? "Guest",
        avatar: currentUser?.avatar ?? null,
        body,
        likes: 0,
        liked: false,
        createdAt: "just now",
      },
      ...c,
    ]);
    setDraft("");
  };

  const toggleLike = (id: string) =>
    setComments((c) =>
      c.map((x) =>
        x.id === id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x
      )
    );

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageSquare className="size-4 text-primary" />
        Comments
        {comments.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
        )}
      </h3>

      <div className="flex gap-3">
        <Avatar fallback={currentUser?.username ?? "?"} src={currentUser?.avatar} size={36} />
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) submit(); }}
            placeholder={currentUser ? "Add a comment… (Ctrl+Enter to post)" : "Sign in to comment"}
            disabled={!currentUser}
            rows={2}
            className="w-full resize-none rounded-xl border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={submit} disabled={!draft.trim() || !currentUser}>
              <Send className="size-4" /> Post
            </Button>
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No comments yet. Be the first!
        </p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Avatar fallback={c.author} src={c.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.author}</span>
                    <span className="text-xs text-muted-foreground">{c.createdAt}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/90">{c.body}</p>
                  <button
                    onClick={() => toggleLike(c.id)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-rose-400"
                  >
                    <Heart className={`size-3.5 ${c.liked ? "fill-rose-400 text-rose-400" : ""}`} />
                    {c.likes > 0 && c.likes}
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
