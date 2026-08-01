"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DownPlayer } from "./down-player";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar } from "./series-sidebar";
import { EpisodeList } from "./episode-list";
import { SeasonsPanel } from "./seasons-panel";
import { ServerSelector } from "./server-selector";
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
  /** Pre-fetched episodes payload from the server component — eliminates the
   *  client-side fetch waterfall so providers appear instantly on page load. */
  initialEpisodesRaw?: Record<string, unknown> | null;
}

function initFromRaw(raw: Record<string, unknown> | null | undefined, episode: number) {
  if (!raw) return { providers: null, provider: null, audio: "sub" as const, epList: [] };
  const parsed = parseProviders(raw);
  const first  =
    firstAvailableProvider(parsed, "sub", episode) ??
    firstAvailableProvider(parsed, "dub", episode);
  const audio  = first && !hasAudio(parsed, "sub", episode) ? "dub" as const : "sub" as const;
  const sub    = mergedEpisodeList(parsed, "sub");
  const dub    = mergedEpisodeList(parsed, "dub");
  return {
    providers: parsed,
    provider:  first ?? null,
    audio,
    epList: sub.length >= dub.length ? sub : dub,
  };
}

export function WatchView({
  detail,
  animeId,
  initialEpisode = 1,
  initialEpisodesRaw,
}: WatchViewProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Initialise all episode state synchronously from the SSR payload so
  // the player and provider list are ready on first render with zero delay.
  const init = initFromRaw(initialEpisodesRaw, initialEpisode);

  const [episode, setEpisode]               = useState(initialEpisode);
  const [providersData, setProvidersData]   = useState<EpisodesMap | null>(init.providers);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(init.provider);
  const [audio, setAudio]                   = useState<"sub" | "dub">(init.audio);
  const [epListData, setEpListData]         = useState<ProviderEpisode[]>(init.epList);

  const [autoNext,  setAutoNext]  = useState(true);
  const [autoplay,  setAutoplay]  = useState(true);
  const [autoSkip,  setAutoSkip]  = useState(true);
  const [lightsOff, setLightsOff] = useState(false);

  const [failedProviders, setFailedProviders] = useState<Set<string>>(new Set());
  const handleProviderError = useCallback((provider: string) => {
    setFailedProviders((prev) => new Set([...prev, provider]));
  }, []);
  useEffect(() => { setFailedProviders(new Set()); }, [episode, audio]);

  // If there was no SSR data (e.g. first ever cold cache miss), fall back to
  // a client-side fetch so nothing is permanently broken.
  useEffect(() => {
    if (initialEpisodesRaw) return; // SSR data already applied above
    let cancelled = false;

    fetch(`/api/episodes/${animeId}`)
      .then((r) => r.json())
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProviders(raw as Record<string, unknown>);
        const first  =
          firstAvailableProvider(parsed, "sub", episode) ??
          firstAvailableProvider(parsed, "dub", episode);
        setProvidersData(parsed);
        setSelectedProvider(first ?? null);
        if (first && !hasAudio(parsed, "sub", episode)) setAudio("dub");
        const sub = mergedEpisodeList(parsed, "sub");
        const dub = mergedEpisodeList(parsed, "dub");
        setEpListData(sub.length >= dub.length ? sub : dub);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [animeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-select provider when episode or audio changes
  useEffect(() => {
    if (!providersData || !selectedProvider) return;
    const hasEp = (providersData[selectedProvider]?.episodes?.[audio] ?? [])
      .some((e) => e.number === episode);
    if (!hasEp) {
      const next =
        firstAvailableProvider(providersData, audio, episode) ??
        firstAvailableProvider(providersData, audio === "sub" ? "dub" : "sub", episode);
      setSelectedProvider(next);
    }
  }, [episode, audio, providersData, selectedProvider]);

  function handleSelectEpisode(ep: number) {
    setEpisode(ep);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("ep", String(ep));
    router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
  }

  const totalEpisodes = detail.episodes ?? epListData.length;
  function handlePrevEp() { if (episode > 1) handleSelectEpisode(episode - 1); }
  function handleNextEp() { if (episode < totalEpisodes) handleSelectEpisode(episode + 1); }

  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  const currentCover = detail.coverImage.extraLarge ?? detail.coverImage.large;

  return (
    <>
      {lightsOff && (
        <div className="fixed inset-0 z-10 bg-black/85 pointer-events-none" aria-hidden />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: player + server selector + comments */}
        <motion.div
          className="relative z-20 min-w-0 space-y-4"
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
            onError={handleProviderError}
          />
          <ServerSelector
            episode={episode}
            episodeMeta={epListData.find((e) => e.number === episode) ?? null}
            audio={audio}
            hasSub={providersData ? hasAudio(providersData, "sub", episode) : true}
            hasDub={providersData ? hasAudio(providersData, "dub", episode) : false}
            onAudioChange={setAudio}
            providersData={providersData}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            failedProviders={failedProviders}
          />
          <CommentsSection animeId={animeId} />
        </motion.div>

        {/* Right: episode list → seasons → related */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
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
          <SeasonsPanel
            relations={detail.relations.edges}
            currentAnimeId={animeId}
            currentCover={currentCover}
            currentTitle={detail.title.english ?? detail.title.romaji}
          />
          <SeriesSidebar relations={detail.relations.edges} recommendations={recs} />
        </motion.div>
      </div>
    </>
  );
}
