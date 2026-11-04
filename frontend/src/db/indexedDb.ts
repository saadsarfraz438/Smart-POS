import Dexie, { type Table } from 'dexie';
import type { VaultRow } from '../types/db.types';

class VoltaDb extends Dexie {
  vault!: Table<VaultRow, string>;
  constructor() {
    super('Volta_Local_Vault');
    this.version(1).stores({ vault: 'id' });
  }
}
export const db = new VoltaDb();
