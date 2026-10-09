export class LocalGameData {
  constructor(private readonly storage: () => Pick<Storage, 'length' | 'key' | 'removeItem'>) {}

  clear() {
    const storage = this.storage();
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith('investigation.')) storage.removeItem(key);
  }
}
