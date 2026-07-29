import { Injectable } from '@angular/core';
import { CredentialInput } from '../models/credential.model';

/** Payload format version; bumped if the binary layout ever changes. */
export const SHARE_VERSION = 1;

// Binary layout: [version:1][iv:12][rawKey:32][ciphertext:N]
const IV_LENGTH = 12; // AES-GCM standard 96-bit nonce
const KEY_LENGTH = 32; // AES-256 raw key
const HEADER_LENGTH = 1 + IV_LENGTH + KEY_LENGTH; // bytes before the ciphertext

/** Only the secret fields are encrypted; the name travels in the URL slug. */
export interface ShareSecret {
  username: string;
  password: string;
}

/** Thrown when the fragment can't be decoded into a well-formed binary payload. */
export class SharePayloadError extends Error {
  constructor(message = 'This share link is malformed or incomplete.') {
    super(message);
    this.name = 'SharePayloadError';
  }
}

/** Thrown when the payload version isn't one this app understands. */
export class UnsupportedVersionError extends Error {
  constructor(message = 'This share link was created by an incompatible version.') {
    super(message);
    this.name = 'UnsupportedVersionError';
  }
}

/** Thrown when key import, decryption, or JSON parsing fails. */
export class DecryptionError extends Error {
  constructor(message = 'This share link could not be decrypted.') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Isolated AES-GCM crypto for share links. No external libraries — everything
 * goes through the browser Web Crypto API. The key and IV travel packed inside
 * the link's URL fragment, so a link is only usable by whoever holds the full
 * URL. The credential name is NOT encrypted; it rides in the URL slug.
 */
@Injectable({ providedIn: 'root' })
export class ShareCryptoService {
  /**
   * Encrypt the secret fields into the compact binary payload
   * `[version][iv][rawKey][ciphertext]`.
   */
  async encryptSecret(secret: ShareSecret): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_LENGTH)));

    const plaintext = this.encode(
      JSON.stringify({ username: secret.username, password: secret.password }),
    );

    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const ciphertext = new Uint8Array(cipherBuffer);

    // pack version + iv + key + ciphertext into one contiguous buffer
    const out = new Uint8Array(new ArrayBuffer(HEADER_LENGTH + ciphertext.length));
    out[0] = SHARE_VERSION;
    out.set(iv, 1);
    out.set(rawKey, 1 + IV_LENGTH);
    out.set(ciphertext, HEADER_LENGTH);
    return out;
  }

  /** Parse and decrypt the binary payload back into the secret fields. */
  async decryptSecret(bytes: Uint8Array): Promise<ShareSecret> {
    // a valid payload needs the full header plus at least the GCM auth tag
    if (bytes.length <= HEADER_LENGTH) {
      throw new SharePayloadError('This share link is incomplete.');
    }

    const version = bytes[0];
    if (version !== SHARE_VERSION) {
      throw new UnsupportedVersionError();
    }

    const iv = bytes.slice(1, 1 + IV_LENGTH);
    const rawKey = bytes.slice(1 + IV_LENGTH, HEADER_LENGTH);
    const ciphertext = bytes.slice(HEADER_LENGTH);

    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey('raw', this.toArrayBufferBytes(rawKey), { name: 'AES-GCM' }, false, [
        'decrypt',
      ]);
    } catch {
      throw new DecryptionError('This share link has an invalid key.');
    }

    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.toArrayBufferBytes(iv) },
        key,
        this.toArrayBufferBytes(ciphertext),
      );
    } catch {
      // wrong key, tampered ciphertext, or bad auth tag
      throw new DecryptionError();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.decoder.decode(plaintext));
    } catch {
      throw new DecryptionError();
    }

    const secret = parsed as Partial<ShareSecret>;
    if (typeof secret?.username !== 'string' || typeof secret?.password !== 'string') {
      throw new DecryptionError();
    }

    return { username: secret.username, password: secret.password };
  }

  /**
   * Build the full shareable URL: `.../share/<slug>#<payload>`. The slug is a
   * display-only, URL-safe rendering of the name; the payload holds the secrets.
   */
  async buildShareUrl(credential: CredentialInput): Promise<string> {
    const bytes = await this.encryptSecret({
      username: credential.username,
      password: credential.password,
    });
    const slug = this.slugify(credential.name);
    return `${location.origin}/share/${slug}#${this.base64UrlEncode(bytes)}`;
  }

  /** Turn a credential name into a URL-safe slug (display only, not encrypted). */
  slugify(name: string): string {
    const slug = name
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '') // strip accents so they don't become hyphens
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
      .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
    return slug || 'credential';
  }

  /** Bytes → Base64URL (no `+`, `/`, or `=`). Encoded exactly once. */
  base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Base64URL → bytes; throws SharePayloadError on anything that won't decode. */
  base64UrlDecode(encoded: string): Uint8Array<ArrayBuffer> {
    const restored = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padding = restored.length % 4 === 0 ? '' : '='.repeat(4 - (restored.length % 4));
    let binary: string;
    try {
      binary = atob(restored + padding);
    } catch {
      throw new SharePayloadError('This share link is not valid Base64URL.');
    }
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // ---- encoding helpers ----

  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  // TextEncoder.encode / Uint8Array.slice can yield Uint8Array<ArrayBufferLike>;
  // re-wrap over a plain ArrayBuffer so it satisfies Web Crypto's BufferSource
  // under TS's strict ArrayBuffer typing
  private encode(text: string): Uint8Array<ArrayBuffer> {
    return new Uint8Array(this.encoder.encode(text));
  }

  private toArrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    return new Uint8Array(bytes);
  }
}
