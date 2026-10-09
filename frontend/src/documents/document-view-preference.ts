type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

class DocumentViewPreference {
  private reading = true;
  private readonly key = 'investigation.documents.view';

  constructor(private readonly storage: () => PreferenceStorage) {}

  isReading() {
    try { this.reading = this.storage().getItem(this.key) !== 'original'; } catch {}
    return this.reading;
  }

  setReading(reading: boolean) {
    this.reading = reading;
    try { this.storage().setItem(this.key, reading ? 'transcription' : 'original'); } catch {
      // Keep the preference for this visit when browser storage is unavailable.
    }
  }
}

export const documentViewPreference = new DocumentViewPreference(() => localStorage);
