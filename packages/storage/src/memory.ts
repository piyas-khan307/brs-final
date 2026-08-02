/**
 * In-process adapter. No network, no container, no credentials.
 *
 * It exists for two reasons:
 *
 * 1. It proves the interface is honest. If StorageAdapter had leaked an
 *    S3 concept — a presigned POST policy, a storage class, an ACL — this
 *    file could not exist without lying. It compiles, so the seam holds.
 *
 * 2. The API façade's tests (Phase B3) need storage that starts in
 *    microseconds and cannot flake. Pointing them at MinIO would make
 *    every unit test depend on Docker being up.
 *
 * It is NOT a fallback for production. `fromEnv()` will not return it
 * unless STORAGE_PROVIDER is set to "memory" explicitly, because a
 * silent fallback to a store that forgets everything on restart is the
 * kind of default that looks fine until launch day.
 */

import {
  StorageError,
  type ObjectInfo,
  type PutInput,
  type PutResult,
  type StorageAdapter,
} from "./adapter.js";
import { assertValidKey } from "./keys.js";

type Entry = { body: Uint8Array; contentType: string; lastModified: Date };

export class MemoryAdapter implements StorageAdapter {
  readonly name = "memory";
  readonly bucket: string;

  readonly #objects = new Map<string, Entry>();
  readonly #publicBaseUrl: string;

  constructor(opts: { bucket?: string; publicBaseUrl?: string } = {}) {
    this.bucket = opts.bucket ?? "memory";
    this.#publicBaseUrl = (opts.publicBaseUrl ?? "memory://").replace(/\/+$/, "");
  }

  async put(input: PutInput): Promise<PutResult> {
    assertValidKey(input.key);

    const existing = this.#objects.get(input.key);
    if (existing) {
      return { key: input.key, size: existing.body.byteLength, deduplicated: true };
    }

    // Copied, not referenced. A caller reusing one scratch buffer across
    // uploads would otherwise silently corrupt everything already stored.
    this.#objects.set(input.key, {
      body: Uint8Array.from(input.body),
      contentType: input.contentType,
      lastModified: new Date(),
    });
    return { key: input.key, size: input.body.byteLength, deduplicated: false };
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const e = this.#objects.get(key);
    return e
      ? { key, size: e.body.byteLength, lastModified: e.lastModified }
      : null;
  }

  async get(key: string): Promise<Uint8Array> {
    const e = this.#objects.get(key);
    if (!e) throw new StorageError(`no object at ${key}`, key);
    return Uint8Array.from(e.body);
  }

  async *list(prefix: string): AsyncIterable<ObjectInfo> {
    for (const [key, e] of [...this.#objects].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (key.startsWith(prefix)) {
        yield { key, size: e.body.byteLength, lastModified: e.lastModified };
      }
    }
  }

  async remove(key: string): Promise<void> {
    this.#objects.delete(key);
  }

  publicUrl(key: string): string {
    return `${this.#publicBaseUrl}/${key}`;
  }

  /** Test affordance, not part of the interface. */
  get size(): number {
    return this.#objects.size;
  }
}
