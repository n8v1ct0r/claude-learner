// __tests__/release/release-config.test.ts
//
// Release invariants for the App Store v1.0 build. These are owner decisions, not implementation
// details, so they are pinned here:
//   - the product is "Claude Learners", but the bundle id and URL scheme stay as installed builds
//     know them, and every persisted store keeps its 'cca-quest:*' AsyncStorage key (renaming one
//     silently wipes a learner's progress on update);
//   - the app is iPhone-only (no web target, no web script);
//   - the App Store privacy manifest declares no tracking and no collected data, with the
//     required-reason API entries the linked pods declare, and export compliance is answered.

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import appJson from '../../app.json';
import pkg from '../../package.json';
import { useExamAttemptStore } from '../../src/state/exam-attempt';
import { useGameStore } from '../../src/state/game';
import { useLessonSessionStore } from '../../src/state/lesson-session';
import { useNotificationStore } from '../../src/state/notifications';
import { useProgressStore } from '../../src/state/progress';
import { useSettingsStore } from '../../src/state/settings';
import { useSrsStore } from '../../src/state/srs';
import { useOutboxStore } from '../../src/sync/outbox';

const expo = appJson.expo as typeof appJson.expo & { web?: unknown };

describe('release identity', () => {
  it('ships as "Claude Learners" without touching the installed identity', () => {
    expect(expo.name).toBe('Claude Learners');
    expect(pkg.name).toBe('claude-learners');
    expect(expo.ios.bundleIdentifier).toBe('com.cyrilvictor.claudelearner');
    expect(expo.scheme).toBe('claudelearner');
  });

  it('keeps every persisted store on its original cca-quest:* key', () => {
    const keys = [
      useSettingsStore,
      useProgressStore,
      useSrsStore,
      useGameStore,
      useExamAttemptStore,
      useLessonSessionStore,
      useNotificationStore,
      useOutboxStore,
    ].map((store) => store.persist.getOptions().name);
    expect(keys).toEqual([
      'cca-quest:settings',
      'cca-quest:progress',
      'cca-quest:srs-deck',
      'cca-quest:game',
      'cca-quest:exam-attempts',
      'cca-quest:active-lesson',
      'cca-quest:reminders',
      'cca-quest:outbox',
    ]);
  });
});

describe('iPhone-only target', () => {
  it('has no web target and no web script', () => {
    expect(expo.web).toBeUndefined();
    // SDK 57 adds "web" to the resolved platforms whenever react-dom is installed; pin them.
    expect(expo.platforms).toEqual(['ios', 'android']);
    expect(Object.keys(pkg.scripts)).not.toContain('web');
  });
});

describe('App Store privacy and export compliance', () => {
  const manifest = expo.ios.privacyManifests;

  it('declares no tracking and no collected data for the local-only build', () => {
    expect(manifest.NSPrivacyTracking).toBe(false);
    expect(manifest.NSPrivacyTrackingDomains).toEqual([]);
    expect(manifest.NSPrivacyCollectedDataTypes).toEqual([]);
  });

  it('declares a reason for every required-reason API category the linked pods use', () => {
    const reasons = Object.fromEntries(
      manifest.NSPrivacyAccessedAPITypes.map((entry) => [
        entry.NSPrivacyAccessedAPIType,
        entry.NSPrivacyAccessedAPITypeReasons,
      ]),
    );
    // React Native core, expo-constants, expo-notifications and expo-system-ui (UserDefaults);
    // RN core, AsyncStorage, expo-application, expo-file-system (file timestamps);
    // RN timing and expo-device (boot time); expo-file-system (disk space).
    expect(reasons).toEqual({
      NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
      NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1', '0A2A.1', '3B52.1'],
      NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
      NSPrivacyAccessedAPICategoryDiskSpace: ['E174.1', '85F4.1'],
    });
  });

  it('answers export compliance: only exempt (OS-provided) encryption', () => {
    expect(expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });
});
