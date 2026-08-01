"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DownPlayer } from "./down-player";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar } from "./series-sidebar";
import { EpisodeList } from "./episode-list";
import { SeasonsPanel } from "./seasons-panel";
import type { AnimeDetail } from "@/lib/anilist";
import {
  parseProviders,
  firstAvailableProvider,
  hasAudio,
  mergedEpisodeList,
  type EpisodesMap,
  type ProviderEpisode,
} from "./episode-utils";

interface WatchViewProps {
  detail: AnimeDetail;
  animeId: number;
  initialEpisode?: number;
}

export function WatchView({ detail, animeId, initialEpisode = 1 }: WatchViewProps) {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // ── Episode + source state ─────────────────────────────────────────────────
  const [episode, setEpisode]               = useState(initialEpisode);
  const [providersData, setProvidersData]   = useState<EpisodesMap | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [audio, setAudio]                   = useState<"sub" | "dub">("sub");
  const [epListData, setEpListData]         = useState<ProviderEpisode[]>([]);

  // ── Player preference state ────────────────────────────────────────────────
  const [autoNext, setAutoNext]     = useState(true);
  const [autoplay, setAutoplay]     = useState(true);
  const [autoSkip, setAutoSkip]     = useState(true);
  const [lightsOff, setLightsOff]   = useState(false);

  // ── Fetch Anivexa episode data once per anime ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setProvidersData(null);
    setSelectedProvider(null);

    fetch(`/api/episodes/${animeId}`)
      .then((r) => r.json())
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProviders(raw as Record<string, unknown>);
        setProvidersData(parsed);

        // Pick first provider that has this episode
        const first =
          firstAvailableProvider(parsed, "sub", episode) ??
          firstAvailableProvider(parsed, "dub", episode);
        if (first) {
          setSelectedProvider(first);
          if (!hasAudio(parsed, "sub", episode)) setAudio("dub");
        }

        // Build merged episode list for the episode list panel
        const sub = mergedEpisodeList(parsed, "sub");
        const dub = mergedEpisodeList(parsed, "dub");
        setEpListData(sub.length >= dub.length ? sub : dub);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [animeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-select provider when episode changes ────────────────────────────────
  useEffect(() => {
    if (!providersData || !selectedProvider) return;
    const epObj = (providersData[selectedProvider]?.episodes?.[audio] ?? [])
      .find((e) => e.number === episode);
    if (!epObj) {
      // current provider missing this episode — try another
      const next =
        firstAvailableProvider(providersData, audio, episode) ??
        firstAvailableProvider(providersData, audio === "sub" ? "dub" : "sub", episode);
      setSelectedProvider(next);
    }
  }, [episode, providersData, selectedProvider, audio]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function handleSelectEpisode(ep: number) {
    setEpisode(ep);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("ep", String(ep));
    router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
  }

  const totalEpisodes = detail.episodes ?? 0;

  function handlePrevEp() { if (episode > 1) handleSelectEpisode(episode - 1); }
  function handleNextEp() { if (episode < totalEpisodes) handleSelectEpisode(episode + 1); }

  // ── Sidebar recommendations ────────────────────────────────────────────────
  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <>
      {/* Lights off overlay */}
      {lightsOff && (
        <div
          className="fixed inset-0 z-10 bg-black/85 pointer-events-none"
          aria-hidden
        />
      )}

      {/* Player — full width, above everything */}
      <motion.div
        className="relative z-20"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <DownPlayer
          poster={detail.bannerImage ?? detail.coverImage.large}
          animeId={animeId}
          episode={episode}
          providersData={providersData}
          selectedProvider={selectedProvider}
          audio={audio}
          onProviderChange={setSelectedProvider}
          onAudioChange={setAudio}
          autoplay={autoplay}
          autoNext={autoNext}
          autoSkip={autoSkip}
          lightsOff={lightsOff}
          onAutoplayChange={setAutoplay}
          onAutoNextChange={setAutoNext}
          onAutoSkipChange={setAutoSkip}
          onLightsOffChange={setLightsOff}
          onPrevEpisode={handlePrevEp}
          onNextEpisode={handleNextEp}
          onEpisodeEnd={autoNext ? handleNextEp : undefined}
          currentEpisode={episode}
          totalEpisodes={totalEpisodes}
        />
      </motion.div>

      {/* Below player */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: episode list + comments */}
        <motion.div
          className="min-w-0 space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <EpisodeList
            totalEpisodes={totalEpisodes}
            currentEpisode={episode}
            onSelectEpisode={handleSelectEpisode}
            episodeData={epListData}
            hasSub={providersData ? hasAudio(providersData, "sub", episode) : true}
            hasDub={providersData ? hasAudio(providersData, "dub", episode) : false}
            currentAudio={audio}
          />
          <CommentsSection animeId={animeId} />
        </motion.div>

        {/* Right: seasons + related/suggestions */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SeasonsPanel relations={detail.relations.edges} currentAnimeId={animeId} />
          <SeriesSidebar relations={detail.relations.edges} recommendations={recs} />
        </motion.div>
      </div>
    </>
  );
}
