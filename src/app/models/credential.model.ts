export interface Credential {
  id?: number; // set by Dexie on insert
  name: string;
  username: string;
  password: string;
  createdAt: number;
  updatedAt: number;
}

// what the add/edit form gives us
export type CredentialInput = Pick<Credential, 'name' | 'username' | 'password'>;

// backup file format
export interface KeyNestBackup {
  app: 'keynest';
  version: number;
  exportedAt: string;
  credentials: Credential[];
}
