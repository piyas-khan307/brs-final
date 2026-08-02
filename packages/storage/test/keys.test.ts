/**
 * Key-scheme tests. Pure functions, no network, no container.
 *
 * These are the ones that must never be skipped: the key scheme is what
 * makes de-duplication and immutable caching correct, and both of those
 * fail silently rather than loudly if it drifts.
 */

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  KEY_PATTERN,
  assertValidKey,
  checksum,
  checksumFromKey,
  contentKey,
  extensionFor,
} from "../src/index.js";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("checksum", () => {
  it("is SHA-256, lower-case hex — the same value assets.checksum holds", () => {
    const body = bytes("BUET Robotics Society");
    assert.equal(
      checksum(body),
      createHash("sha256").update(body).digest("hex"),
    );
    assert.match(checksum(body), /^[0-9a-f]{64}$/);
  });

  it("differs for a one-byte change", () => {
    assert.notEqual(checksum(bytes("abc")), checksum(bytes("abd")));
  });
});

describe("contentKey", () => {
  it("shards on the first two byte-pairs of the digest", () => {
    const body = bytes("frame 000");
    const hex = checksum(body);
    assert.equal(
      contentKey(body, "image/webp"),
      `sha256/${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex}.webp`,
    );
  });

  it("matches KEY_PATTERN for every storable MIME type", () => {
    for (const mime of [
      "image/avif",
      "image/webp",
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "application/pdf",
    ]) {
      assert.match(contentKey(bytes(mime), mime), KEY_PATTERN, `failed for ${mime}`);
    }
  });

  it("gives identical bytes an identical key regardless of origin filename", () => {
    // This is the property that makes de-duplication work at all. The
    // archive holds IMG_6738.JPG and brs/lfr.JPG at exactly 8,679,826
    // bytes each; under a name-based scheme they are two objects forever.
    const a = bytes("identical payload");
    const b = bytes("identical payload");
    assert.equal(contentKey(a, "image/jpeg"), contentKey(b, "image/jpeg"));
  });

  it("does not collapse the same bytes stored under different types", () => {
    // Same digest, different extension. Both are reachable; neither
    // shadows the other, and Content-Type stays honest.
    const body = bytes("payload");
    assert.notEqual(contentKey(body, "image/webp"), contentKey(body, "image/avif"));
  });

  it("is case-insensitive about the MIME and tolerates parameters", () => {
    const body = bytes("x");
    assert.equal(
      contentKey(body, "IMAGE/WEBP; charset=binary"),
      contentKey(body, "image/webp"),
    );
  });
});

describe("extensionFor", () => {
  it("refuses a type outside the design system rather than guessing", () => {
    // TIFF, HEIC and BMP are all things a phone or a scanner will hand
    // you. None of them should reach a bucket — they should be converted
    // first. Guessing an extension here would let one through.
    assert.throws(() => extensionFor("image/tiff"), /Unsupported MIME/);
    assert.throws(() => extensionFor("image/heic"), /Unsupported MIME/);
    assert.throws(() => extensionFor("application/octet-stream"), /Unsupported MIME/);
  });
});

describe("checksumFromKey", () => {
  it("round-trips", () => {
    const body = bytes("round trip");
    assert.equal(checksumFromKey(contentKey(body, "image/avif")), checksum(body));
  });

  it("returns null for anything not shaped like our keys", () => {
    // Reconciliation walks the whole bucket. If a stray object was ever
    // put there by hand, it must be reported, not parsed into a fake
    // checksum that then fails to match any row.
    for (const k of [
      "uploads/2026/02/photo.jpg",
      "sha256/ab/cd/nothex.webp",
      "sha256/ab/cd/" + "f".repeat(63) + ".webp",
      "",
    ]) {
      assert.equal(checksumFromKey(k), null, `expected null for ${JSON.stringify(k)}`);
    }
  });
});

describe("assertValidKey", () => {
  it("rejects hand-written keys", () => {
    // The guard exists because content addressing is only load-bearing if
    // there is no way around it. An `immutable, max-age=1y` header on a
    // mutable key is a year-long cache poisoning.
    assert.throws(() => assertValidKey("plates/hero.webp"), /non-content-addressed/);
    assert.throws(() => assertValidKey("sha256/ab/cd/../../etc/passwd"), /non-content/);
  });

  it("accepts what contentKey produces", () => {
    assert.doesNotThrow(() => assertValidKey(contentKey(bytes("ok"), "image/webp")));
  });
});
