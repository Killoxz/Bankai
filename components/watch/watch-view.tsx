"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DownPlayer }      from "./down-player";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar }   from "./series-sidebar";
import { EpisodeList }     from "./episode-list";
import { SeasonsPanel }    from "./seasons-panel";
import { ServerSelector }  from "./server-selector";
import { AnimeInfoCard }   from "./anime-info-card";
import type { AnimeDetail } from "@/lib/anilist";
import {
  parseProviders,
  firstAvailableProvider,
  hasAudio,
  mergedEpisodeList,
  type EpisodesMap,
  type ProviderEpisode,
} from "./episode-utils";
import { useLanguageStore }  from "@/store/language-store";
import { useSettingsStore }  from "@/store/settings-store";
import { useAuthStore }      from "@/store/auth-store";

interface WatchViewProps {
  detail: AnimeDetail;
  animeId: number;
  initialEpisode?: number;
  initialAudio?: "sub" | "dub";
  /** Pre-fetched episodes payload from the server component — eliminates the
   *  client-side fetch waterfall so providers appear instantly on page load. */
  initialEpisodesRaw?: Record<string, unknown> | null;
}

function initFromRaw(
  raw: Record<string, unknown> | null | undefined,
  episode: number,
  preferredAudio: "sub" | "dub" = "sub",
) {
  if (!raw) return { providers: null, provider: null, audio: preferredAudio, epList: [] };
  const parsed = parseProviders(raw);
  // Honor preferred audio when available; otherwise fall back to whichever side has this episode.
  const audio: "sub" | "dub" = hasAudio(parsed, preferredAudio, episode)
    ? preferredAudio
    : hasAudio(parsed, preferredAudio === "sub" ? "dub" : "sub", episode)
      ? (preferredAudio === "sub" ? "dub" : "sub")
      : "sub";
  const first =
    firstAvailableProvider(parsed, audio, episode) ??
    firstAvailableProvider(parsed, audio === "sub" ? "dub" : "sub", episode);
  const sub = mergedEpisodeList(parsed, "sub");
  const dub = mergedEpisodeList(parsed, "dub");
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
  initialAudio = "sub",
  initialEpisodesRaw,
}: WatchViewProps) {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const defaultAudio       = useLanguageStore((s) => s.defaultAudio);
  const storeAutoPlay      = useSettingsStore((s) => s.autoPlay);
  const storeAutoSkip      = useSettingsStore((s) => s.autoSkipIntroOutro);
  const storeAutoNext      = useSettingsStore((s) => s.autoNextEpisode);
  const setStoreAutoPlay   = useSettingsStore((s) => s.setAutoPlay);
  const setStoreAutoSkip   = useSettingsStore((s) => s.setAutoSkipIntroOutro);
  const setStoreAutoNext   = useSettingsStore((s) => s.setAutoNextEpisode);
  const showComments       = useSettingsStore((s) => s.showComments);
  const currentUser        = useAuthStore((s) => s.currentUser);

  // Initialise all episode state synchronously from the SSR payload so
  // the player and provider list are ready on first render with zero delay.
  // initialAudio comes from the server (URL ?audio= param), so it's reliable for SSR.
  const init = initFromRaw(initialEpisodesRaw, initialEpisode, initialAudio);

  const [episode, setEpisode]               = useState(initialEpisode);
  const [providersData, setProvidersData]   = useState<EpisodesMap | null>(init.providers);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(init.provider);
  const [audio, setAudio]                   = useState<"sub" | "dub">(init.audio);
  const [epListData, setEpListData]         = useState<ProviderEpisode[]>(init.epList);

  // Track whether we've already applied the stored default audio preference.
  // We only apply it once, and only when the URL has no ?audio= param.
  const defaultAudioApplied = useRef(false);

  const [autoNext,  setAutoNext]  = useState(storeAutoNext);
  const [autoplay,  setAutoplay]  = useState(storeAutoPlay);
  const [autoSkip,  setAutoSkip]  = useState(storeAutoSkip);
  const [lightsOff, setLightsOff] = useState(false);

  const [isLoadingSources, setIsLoadingSources] = useState(!initialEpisodesRaw);
  const [failedProviders, setFailedProviders]   = useState<Set<string>>(new Set());
  const handleProviderError = useCallback((provider: string) => {
    setFailedProviders((prev) => new Set([...prev, provider]));
  }, []);
  useEffect(() => { setFailedProviders(new Set()); }, [episode, audio]);

  // Always ping the streaming API on mount so it starts waking up immediately —
  // even when SSR data exists, the user will likely switch episodes and need it warm.
  useEffect(() => { fetch("/api/ping").catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If SSR timed out (cold API), fall back to a client-side fetch.
  useEffect(() => {
    if (initialEpisodesRaw) return;
    let cancelled = false;

    fetch(`/api/episodes/${animeId}`, { signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProviders(raw as Record<string, unknown>);
        const targetAudio: "sub" | "dub" = hasAudio(parsed, initialAudio, episode)
          ? initialAudio
          : hasAudio(parsed, initialAudio === "sub" ? "dub" : "sub", episode)
            ? (initialAudio === "sub" ? "dub" : "sub")
            : "sub";
        const first =
          firstAvailableProvider(parsed, targetAudio, episode) ??
          firstAvailableProvider(parsed, targetAudio === "sub" ? "dub" : "sub", episode);
        setProvidersData(parsed);
        setSelectedProvider(first ?? null);
        setAudio(targetAudio);
        const sub = mergedEpisodeList(parsed, "sub");
        const dub = mergedEpisodeList(parsed, "dub");
        setEpListData(sub.length >= dub.length ? sub : dub);
        setIsLoadingSources(false);
      })
      .catch(() => { if (!cancelled) setIsLoadingSources(false); });

    return () => { cancelled = true; };
  }, [animeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // After Zustand hydrates, apply the stored default audio preference — but only
  // when the URL has no ?audio= param (URL param already handled by initialAudio prop).
  useEffect(() => {
    if (defaultAudioApplied.current) return;
    if (initialAudio !== "sub") { defaultAudioApplied.current = true; return; } // URL had ?audio=dub
    if (defaultAudio === "sub") { defaultAudioApplied.current = true; return; } // preference is sub
    if (!providersData) return; // wait for data
    defaultAudioApplied.current = true;
    if (hasAudio(providersData, "dub", episode)) {
      const dubProvider = firstAvailableProvider(providersData, "dub", episode);
      setAudio("dub");
      if (dubProvider) setSelectedProvider(dubProvider);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("audio", "dub");
      router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
    }
  }, [defaultAudio, providersData]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleAudioChange(a: "sub" | "dub") {
    setAudio(a);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("audio", a);
    router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
  }

  function handleSelectEpisode(ep: number) {
    setEpisode(ep);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("ep", String(ep));
    router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
  }

  const totalEpisodes = detail.episodes ?? epListData.length;
  function handlePrevEp() { if (episode > 1) handleSelectEpisode(episode - 1); }
  function handleNextEp() {
    if (episode < totalEpisodes) {
      // Mark completed episode on AniList before advancing
      if (currentUser) {
        fetch(`/api/anime/${animeId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser, progress: episode }),
        }).catch(() => {});
      }
      handleSelectEpisode(episode + 1);
    }
  }

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
          {/* Left: player + server selector + info card + comments */}
          <motion.div
            className="relative z-20 min-w-0 space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <DownPlayer
              poster={detail.bannerImage ?? detail.coverImage.large}
              animeId={animeId}
              malId={detail.idMal}
              animeTitle={detail.title.english ?? detail.title.romaji ?? undefined}
              animeCover={detail.coverImage.large ?? undefined}
              episode={episode}
              providersData={providersData}
              selectedProvider={selectedProvider}
              audio={audio}
              onProviderChange={setSelectedProvider}
              onAudioChange={handleAudioChange}
              autoplay={autoplay}
              autoNext={autoNext}
              autoSkip={autoSkip}
              lightsOff={lightsOff}
              onAutoplayChange={(v) => { setAutoplay(v);  setStoreAutoPlay(v);  }}
              onAutoNextChange={(v) => { setAutoNext(v);  setStoreAutoNext(v);  }}
              onAutoSkipChange={(v) => { setAutoSkip(v);  setStoreAutoSkip(v);  }}
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
              onAudioChange={handleAudioChange}
              providersData={providersData}
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              failedProviders={failedProviders}
              isLoading={isLoadingSources}
            />
            <AnimeInfoCard detail={detail} animeId={animeId} />
            {showComments && <CommentsSection animeId={animeId} episode={episode} />}
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
              providersData={providersData}
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              onAudioChange={handleAudioChange}
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
