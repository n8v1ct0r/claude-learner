// src/db/content-provider.tsx
//
// React wiring that opens the bundled content database and exposes the typed reader
// (src/db/content-reader.ts) to the app.
//
// Bundling mechanism (see also metro.config.js + the content:bundle script):
//   - The prebuilt SQLite file is committed at assets/content/content.db (a copy of
//     content/dist/content.db produced by `npm run content:bundle`). Metro treats `.db` as an asset
//     (resolver.assetExts includes 'db'), so `require('.../content.db')` returns an asset module id
//     that ships in the JS bundle and the `expo export` output.
//   - expo-sqlite's <SQLiteProvider assetSource> copies that asset into the on-device SQLite directory
//     and opens it. The DB is immutable curriculum content (learner state lives in separate stores),
//     so forceOverwrite stays on in every build: an app update must never keep a stale question bank.
//   - We wrap the opened native handle with drizzle-orm/expo-sqlite and hand it to createContentReader.
//
// Loading state: SQLiteProvider runs in Suspense mode, so the asset copy + open suspends behind the
// <Suspense fallback>. Children only render once the reader is ready, so useContentDb never sees a
// half-open database.

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, Suspense, useContext, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/design/tokens';

import type { Lesson } from '../../content/schema/types';

import { createContentReader, type ContentReader } from './content-reader';

// The bundled, prebuilt content database (committed asset — see the header note).
const CONTENT_DB_ASSET = require('../../assets/content/content.db') as number;

// The on-device filename for the copied database.
const CONTENT_DB_NAME = 'content.db';

const ReaderContext = createContext<ContentReader | null>(null);

function ContentLoading(): ReactNode {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your lessons"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
    >
      <ActivityIndicator color={colors.clay400} />
    </View>
  );
}

// Runs INSIDE SQLiteProvider, so the native handle is already open. Builds the reader once per handle.
function ReaderProvider({ children }: { children: ReactNode }): ReactNode {
  const sqlite = useSQLiteContext();
  const reader = useMemo(() => createContentReader(drizzle(sqlite)), [sqlite]);
  return <ReaderContext.Provider value={reader}>{children}</ReaderContext.Provider>;
}

export function ContentProvider({ children }: { children: ReactNode }): ReactNode {
  return (
    <Suspense fallback={<ContentLoading />}>
      <SQLiteProvider
        databaseName={CONTENT_DB_NAME}
        assetSource={{ assetId: CONTENT_DB_ASSET, forceOverwrite: true }}
        useSuspense
      >
        <ReaderProvider>{children}</ReaderProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

/** The content reader. Throws if used outside <ContentProvider>. */
export function useContentDb(): ContentReader {
  const reader = useContext(ReaderContext);
  if (reader === null) {
    throw new Error('useContentDb must be used within <ContentProvider>');
  }
  return reader;
}

/**
 * For a screen that needs content only in a handler (onboarding's finish). On native the database is
 * always open before any screen renders, so `reader` is never null here; the web provider can return
 * null while its snapshot is still loading.
 */
export function useContentDbWhenReady(): { reader: ContentReader | null; ready: () => Promise<ContentReader> } {
  const reader = useContentDb();
  return useMemo(() => ({ reader, ready: () => Promise.resolve(reader) }), [reader]);
}

/** Convenience hook: the fully-hydrated lesson for `id`, or undefined if unknown. */
export function useLesson(id: string): Lesson | undefined {
  const reader = useContentDb();
  return useMemo(() => reader.getLesson(id), [reader, id]);
}
