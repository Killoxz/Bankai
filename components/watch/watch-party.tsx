"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, X, Crown, LogOut, Tv2 } from "lucide-react";

interface PartyState {
  id: string;
  code: string;
  animeId: number;
  animeTitle: string;
  episode: number;
  currentTime: number;
  isPlaying: boolean;
  hostName: string;
  memberNames: string[];
}

interface WatchPartyProps {
  animeId: number;
  animeTitle: string;
  animeCover?: string;
  currentEpisode: number;
  username: string | null;
  getCurrentTime: () => number;
  getIsPlaying: () => boolean;
  onEpisodeChange: (ep: number) => void;
  onSeekTo: (t: number) => void;
  onSyncPlaying: (playing: boolean) => void;
}

export function WatchParty({
  animeId, animeTitle, animeCover, currentEpisode,
  username, getCurrentTime, getIsPlaying,
  onEpisodeChange, onSeekTo, onSyncPlaying,
}: WatchPartyProps) {
  const [open, setOpen] = useState(false);
  const [party, setParty] = useState<PartyState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("synced");

  const partyRef = useRef<PartyState | null>(null);
  const hostPushInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerPollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep partyRef in sync
  useEffect(() => { partyRef.current = party; }, [party]);

  const leaveParty = useCallback(async (silent = false) => {
    const p = partyRef.current;
    if (!p || !username) return;
    if (hostPushInterval.current) { clearInterval(hostPushInterval.current); hostPushInterval.current = null; }
    if (viewerPollInterval.current) { clearInterval(viewerPollInterval.current); viewerPollInterval.current = null; }
    if (!silent) {
      if (p.hostName === username) {
        await fetch(`/api/party/${p.code}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) }).catch(() => {});
      } else {
        await fetch(`/api/party/${p.code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, leave: true }) }).catch(() => {});
      }
    }
    setParty(null);
    setIsHost(false);
  }, [username]);

  // Host: push state to DB every 5s
  function startHostPush(code: string) {
    if (hostPushInterval.current) clearInterval(hostPushInterval.current);
    hostPushInterval.current = setInterval(async () => {
      if (!username) return;
      const ct = getCurrentTime();
      const playing = getIsPlaying();
      await fetch(`/api/party/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentTime: ct, isPlaying: playing }),
      }).catch(() => {});
    }, 5000);
  }

  // Viewer: poll DB every 3s and sync
  function startViewerPoll(code: string, onEp: (ep: number) => void, onSeek: (t: number) => void, onPlay: (p: boolean) => void) {
    if (viewerPollInterval.current) clearInterval(viewerPollInterval.current);
    viewerPollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/party/${code}`);
        if (!res.ok) { setParty(null); return; }
        const state = await res.json() as PartyState;
        setParty(state);

        // Sync episode
        if (state.episode !== partyRef.current?.episode) {
          onEp(state.episode);
        }
        // Sync playback position (if drift > 4s)
        const myTime = getCurrentTime();
        const drift = Math.abs(myTime - state.currentTime);
        if (drift > 4) {
          setSyncStatus("syncing");
          onSeek(state.currentTime);
          setTimeout(() => setSyncStatus("synced"), 1500);
        }
        // Sync play/pause
        const myPlaying = getIsPlaying();
        if (state.isPlaying !== myPlaying) {
          onPlay(state.isPlaying);
        }
      } catch {}
    }, 3000);
  }

  async function createParty() {
    if (!username) { setError("You must be logged in to create a watch party."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, animeTitle, animeCover, episode: currentEpisode, username }),
      });
      const data = await res.json() as { code?: string; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error ?? "Failed");
      const partyRes = await fetch(`/api/party/${data.code}`);
      const partyData = await partyRes.json() as PartyState;
      setParty(partyData);
      setIsHost(true);
      startHostPush(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create party");
    } finally {
      setLoading(false);
    }
  }

  async function joinParty() {
    if (!username) { setError("You must be logged in to join a watch party."); return; }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setError("Enter a valid 6-character room code."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/party/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, join: true }),
      });
      if (!res.ok) throw new Error("Party not found or expired.");
      const data = await res.json() as PartyState;
      setParty(data);
      setIsHost(data.hostName === username);
      if (data.hostName === username) {
        startHostPush(code);
      } else {
        startViewerPoll(code, onEpisodeChange, onSeekTo, onSyncPlaying);
      }
      // Sync to host's episode immediately
      if (data.episode !== currentEpisode) onEpisodeChange(data.episode);
      onSeekTo(data.currentTime);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join party");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!party) return;
    navigator.clipboard.writeText(party.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (hostPushInterval.current) clearInterval(hostPushInterval.current);
    if (viewerPollInterval.current) clearInterval(viewerPollInterval.current);
  }, []);

  const memberCount = party?.memberNames.length ?? 0;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={[
          "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors [touch-action:manipulation]",
          party ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
        ].join(" ")}
      >
        <Users className="size-3" />
        {party ? `Party (${memberCount})` : "Watch Party"}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Tv2 className="size-4 text-primary" />
                  <span className="font-semibold text-white">Watch Party</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5">
                {party ? (
                  /* ── In a party ─────────────────────────────── */
                  <div className="space-y-4">
                    {/* Room code */}
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">Room Code</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-widest text-white">{party.code}</span>
                        <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 transition-colors [touch-action:manipulation]">
                          {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-white/30">Share this code so friends can join</p>
                    </div>

                    {/* Sync status (viewer only) */}
                    {!isHost && (
                      <div className={["flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium", syncStatus === "synced" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"].join(" ")}>
                        <div className={["size-1.5 rounded-full", syncStatus === "synced" ? "bg-green-400" : "bg-amber-400 animate-pulse"].join(" ")} />
                        {syncStatus === "synced" ? "Synced with host" : "Syncing…"}
                      </div>
                    )}
                    {isHost && (
                      <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                        <Crown className="size-3" /> You are the host — your playback controls everyone
                      </div>
                    )}

                    {/* Members */}
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Members ({memberCount})</p>
                      <div className="space-y-1.5">
                        {party.memberNames.map((name) => (
                          <div key={name} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2">
                            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-black">
                              {name[0]?.toUpperCase()}
                            </div>
                            <span className="flex-1 text-sm text-white/80">{name}</span>
                            {name === party.hostName && <Crown className="size-3 text-primary shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Leave */}
                    <button
                      onClick={async () => { await leaveParty(); setOpen(false); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 [touch-action:manipulation]"
                    >
                      <LogOut className="size-4" />
                      {isHost ? "Close Party" : "Leave Party"}
                    </button>
                  </div>
                ) : (
                  /* ── No party yet ───────────────────────────── */
                  <div className="space-y-4">
                    {error && (
                      <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
                    )}

                    <button
                      onClick={createParty}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50 [touch-action:manipulation]"
                    >
                      <Tv2 className="size-4" />
                      {loading ? "Creating…" : "Create Party"}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/[0.08]" />
                      <span className="text-xs text-white/30">or join existing</span>
                      <div className="h-px flex-1 bg-white/[0.08]" />
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="ROOM CODE"
                        maxLength={6}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-white outline-none placeholder:text-white/20 focus:border-primary/50"
                      />
                      <button
                        onClick={joinParty}
                        disabled={loading || joinCode.trim().length !== 6}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40 [touch-action:manipulation]"
                      >
                        <Users className="size-4" />
                        {loading ? "Joining…" : "Join Party"}
                      </button>
                    </div>

                    <p className="text-center text-[11px] leading-relaxed text-white/25">
                      Create a party and share the code with friends. Everyone will stay in sync as you watch.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
