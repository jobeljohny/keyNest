import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Credential, KeyNestBackup } from '../models/credential.model';

// flip to true to seed demo rows on an empty vault
const DEV_MODE = false;

const BACKUP_VERSION = 1;

// all IndexedDB access goes through here
@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly db = new Dexie('keynest') as Dexie & {
    credentials: Table<Credential, number>;
  };

  constructor() {
    this.db.version(1).stores({
      credentials: '++id, name, username, updatedAt',
    });
  }

  async getAll(): Promise<Credential[]> {
    await this.maybeSeed();
    return this.db.credentials.orderBy('updatedAt').reverse().toArray();
  }

  async add(input: Pick<Credential, 'name' | 'username' | 'password'>): Promise<number> {
    const now = Date.now();
    return this.db.credentials.add({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(
    id: number,
    input: Pick<Credential, 'name' | 'username' | 'password'>,
  ): Promise<void> {
    await this.db.credentials.update(id, { ...input, updatedAt: Date.now() });
  }

  async remove(id: number): Promise<void> {
    await this.db.credentials.delete(id);
  }

  async exportBackup(): Promise<KeyNestBackup> {
    const credentials = await this.db.credentials.toArray();
    return {
      app: 'keynest',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      credentials,
    };
  }

  // adds imported rows fresh; drops their ids so they don't clash. returns count added.
  async importBackup(raw: unknown): Promise<number> {
    const credentials = this.extractCredentials(raw);
    if (credentials.length === 0) {
      throw new Error('No valid credentials found in the backup file.');
    }

    const now = Date.now();
    const rows: Credential[] = credentials.map((c) => ({
      name: c.name,
      username: c.username,
      password: c.password,
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : now,
      updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : now,
    }));

    await this.db.credentials.bulkAdd(rows);
    return rows.length;
  }

  async clear(): Promise<void> {
    await this.db.credentials.clear();
  }

  // accepts a bare array or the {credentials: [...]} envelope, skips malformed entries
  private extractCredentials(raw: unknown): Credential[] {
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as KeyNestBackup)?.credentials)
        ? (raw as KeyNestBackup).credentials
        : null;

    if (!list) {
      throw new Error('Unrecognized backup format.');
    }

    return list.filter(
      (c): c is Credential =>
        !!c &&
        typeof c === 'object' &&
        typeof (c as Credential).name === 'string' &&
        typeof (c as Credential).username === 'string' &&
        typeof (c as Credential).password === 'string',
    );
  }

  private async maybeSeed(): Promise<void> {
    if (!DEV_MODE) return;
    const count = await this.db.credentials.count();
    if (count > 0) return;

    const now = Date.now();
    await this.db.credentials.bulkAdd([
      {
        name: 'GitHub',
        username: 'octocat',
        password: 'hunter2-demo',
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Company VPN',
        username: 'j.doe@example.com',
        password: 'S3cur3-VPN!demo',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
}
