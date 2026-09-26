"use client";

import type { ChapterSummary } from "@/lib/catalog/types";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useBoolean } from "minimal-shared/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { chapterLabel } from "@/lib/catalog/labels";
import { markChapterRead, recordProgress, useHistory } from "@/lib/library";
import { dbRecordProgress } from "@/lib/library-db";
import { useChapterPlayer } from "@/lib/player/use-chapter-player";
import { useMediaSession } from "@/lib/player/use-media-session";
import { useCharacterVoices, useReaderSettings } from "@/lib/player/use-reader-settings";
import { characterVoice } from "@/lib/player/voices";
import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

import { AmbientMusic } from "./AmbientMusic";
import { ChapterNavigation } from "./ChapterNavigation";
import { ChapterText } from "./ChapterText";
import { CharacterVoicesDialog } from "./CharacterVoicesDialog";
import { PlayerBar } from "./PlayerBar";
import { ReaderSettingsDialog } from "./ReaderSettingsDialog";

type ChapterReaderProps = {
  novel: { slug: string; title: string; cover?: string };
  chapter: { slug: string; title: string; paragraphs: string[] };
  chapters: ChapterSummary[];
};

const AUTOPLAY_KEY = "sm:autoplay-chapter";

function hasPendingAutoplay(chapterSlug: string) {
  return sessionStorage.getItem(AUTOPLAY_KEY) === chapterSlug;
}

export function ChapterReader({ novel, chapter, chapters }: ChapterReaderProps) {
  const router = useRouter();
  const voicesDialog = useBoolean();
  const settingsDialog = useBoolean();
  const history = useHistory();
  const { state: settings, setState: setSettings } = useReaderSettings();
  const { overrides, setOverrides } = useCharacterVoices(novel.slug);

  const index = chapters.findIndex((item) => item.slug === chapter.slug);
  const previous = index >= 0 ? chapters[index + 1] : undefined;
  const next = index > 0 ? chapters[index - 1] : undefined;
  const chapterNo = index >= 0 ? chapters.length - index : undefined;
  const label = chapterLabel(chapter.title, novel.title);

  const [start] = useState(() => {
    const saved = history.find((entry) => entry.id === novel.slug);
    return {
      paragraph: saved?.chapterId === chapter.slug ? (saved.paragraph ?? 0) : 0,
      autoplay: hasPendingAutoplay(chapter.slug),
    };
  });

  const progress = { id: novel.slug, name: novel.title, imageUrl: novel.cover };

  useEffect(() => {
    if (hasPendingAutoplay(chapter.slug)) sessionStorage.removeItem(AUTOPLAY_KEY);
  }, [chapter.slug]);

  useEffect(() => {
    dbRecordProgress({
      workId: novel.slug,
      name: novel.title,
      imageUrl: novel.cover,
      chapterId: chapter.slug,
      chapterName: label,
      chapterNo,
    });
    void rpc.reading.track({ workId: novel.slug, chapterId: chapter.slug }).catch(() => {});
  }, [novel.slug, novel.title, novel.cover, chapter.slug, label, chapterNo]);

  const goTo = (target: ChapterSummary, keepPlaying: boolean) => {
    if (keepPlaying) sessionStorage.setItem(AUTOPLAY_KEY, target.slug);
    router.push(routes.read(target.slug));
  };

  const { player, state, script, voiceContext, neuralFailed } = useChapterPlayer({
    paragraphs: chapter.paragraphs,
    settings,
    overrides,
    startParagraph: start.paragraph,
    autoplay: start.autoplay,
    onParagraphChange: (paragraph) => {
      recordProgress({
        ...progress,
        chapterId: chapter.slug,
        chapterName: label,
        chapterNo,
        paragraph,
      });
      if (paragraph === chapter.paragraphs.length - 1) markChapterRead(novel.slug, chapter.slug);
    },
    onFinished: () => {
      markChapterRead(novel.slug, chapter.slug);
      if (settings.autoAdvance && next) goTo(next, true);
    },
  });

  const isPlaying = state.status === "playing";

  useMediaSession({
    status: state.status,
    title: label,
    album: novel.title,
    cover: novel.cover,
    onPlay: () => player.play(),
    onPause: () => player.pause(),
    onNext: next && (() => goTo(next, true)),
    onPrevious: previous && (() => goTo(previous, true)),
    onSkip: (offset) => player.skip(offset),
  });

  const preview = (speaker: string) =>
    player.preview(characterVoice(speaker, script.genders.get(speaker), voiceContext));

  const navigation = (
    <ChapterNavigation
      novelTitle={novel.title}
      previous={previous}
      next={next}
      onNavigate={(target) => goTo(target, isPlaying)}
    />
  );

  return (
    <Container maxWidth="md" disableGutters sx={{ pb: 18 }}>
      {state.error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {navigation}

      <Box sx={{ my: 3 }}>
        <ChapterText
          paragraphs={chapter.paragraphs}
          lines={script.lines}
          activeParagraph={state.paragraph}
          followPlayback={isPlaying}
          fontSize={settings.fontSize}
          onSelectParagraph={(paragraph) => player.play(paragraph)}
        />
      </Box>

      {navigation}

      <PlayerBar
        state={state}
        totalParagraphs={chapter.paragraphs.length}
        rate={settings.rate}
        onChangeRate={(rate) => setSettings({ rate })}
        hasPrevious={!!previous}
        hasNext={!!next}
        onToggle={() => player.toggle()}
        onSkip={(offset) => player.skip(offset)}
        onSeek={(paragraph) => player.seek(paragraph)}
        onPreviousChapter={() => previous && goTo(previous, isPlaying)}
        onNextChapter={() => next && goTo(next, isPlaying)}
        onOpenVoices={voicesDialog.onTrue}
        onOpenSettings={settingsDialog.onTrue}
        music={settings.music}
        onMusicChange={(music) => setSettings({ music })}
        hidden={settings.playerHidden}
        onHiddenChange={(playerHidden) => setSettings({ playerHidden })}
      />

      {settings.music && <AmbientMusic volume={settings.musicVolume} />}

      <CharacterVoicesDialog
        open={voicesDialog.value}
        script={script}
        context={voiceContext}
        onChange={setOverrides}
        onPreview={preview}
        onClose={voicesDialog.onFalse}
      />

      <ReaderSettingsDialog
        open={settingsDialog.value}
        settings={settings}
        voices={voiceContext.voices}
        neuralFailed={neuralFailed}
        onChange={setSettings}
        onClose={settingsDialog.onFalse}
      />
    </Container>
  );
}
