import type { Credentials } from '../../../shared/game/types';
import type { StoryPresentation } from '../../../shared/story/types';
import { CASE_STORAGE_VERSION } from '../../../shared/game/storage-version';

type StoryIdentity = Pick<StoryPresentation, 'id' | 'version'>;
export const sessionKey = (story: StoryIdentity, key: string) => `investigation.v${CASE_STORAGE_VERSION}.${story.id}.${story.version}.${key}`;

export function loadCredentials(story: StoryIdentity): Credentials | null {
  try {
    const room = new URLSearchParams(location.search).get('case') ?? localStorage.getItem(sessionKey(story, 'last'));
    return room ? JSON.parse(localStorage.getItem(sessionKey(story, room)) ?? 'null') : null;
  } catch { return null; }
}

export function saveCredentials(story: StoryIdentity, credentials: Credentials) {
  localStorage.setItem(sessionKey(story, credentials.roomId), JSON.stringify(credentials));
  localStorage.setItem(sessionKey(story, 'last'), credentials.roomId);
}
