/**
 * Contract tests. These assert the guarantees the architecture depends on
 * — particularly the privacy guarantee, which is the highest-severity
 * requirement on the project (§12).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { AltText, AchievementDTO, ImageDTO, MemberDTO, StatsDTO } from "../src/schemas.js";

const validImage = {
  id: "a1",
  url: "/v1/assets/a1",
  alt: "Team BUET with the Panasonic Award at ABU Robocon 2005",
  width: 1600,
  height: 1067,
  lqip: "data:image/webp;base64,AAAA",
  ratio: "3:2" as const,
};

test("MemberDTO strips any contact data it is handed", () => {
  // The DB has no such column and the parser drops it, but if a future
  // maintainer wires one through anyway, the DTO must not carry it.
  const parsed = MemberDTO.parse({
    id: "m1",
    name: "Sudipto Sarkar Joy",
    designation: "President",
    department: "EEE",
    batch: "EEE ’20",
    committeeOrdinal: 10,
    // Deliberately injected. Must not survive.
    phone: "01700000000",
    contact: "01700000000",
    contactNo: "01700000000",
  });

  assert.equal("phone" in parsed, false, "phone must not survive parsing");
  assert.equal("contact" in parsed, false, "contact must not survive parsing");
  assert.equal("contactNo" in parsed, false, "contactNo must not survive parsing");
  assert.equal(
    JSON.stringify(parsed).includes("01700000000"),
    false,
    "no contact digits may appear anywhere in the serialised DTO",
  );
});

test("AltText rejects placeholder alt text", () => {
  assert.equal(AltText.safeParse("photo").success, false);
  assert.equal(AltText.safeParse("image").success, false);
  assert.equal(AltText.safeParse("IMG_6738.JPG").success, false);
  assert.equal(AltText.safeParse("").success, false);
  assert.equal(
    AltText.safeParse("Participants soldering during Basic Workshop v8.0").success,
    true,
  );
});

test("ImageDTO requires dimensions so CLS cannot regress", () => {
  assert.equal(ImageDTO.safeParse(validImage).success, true);

  const { width, ...noWidth } = validImage;
  assert.equal(ImageDTO.safeParse(noWidth).success, false, "width is mandatory");

  const { height, ...noHeight } = validImage;
  assert.equal(ImageDTO.safeParse(noHeight).success, false, "height is mandatory");
});

test("ImageDTO rejects ratios outside the fixed crop set", () => {
  assert.equal(ImageDTO.safeParse({ ...validImage, ratio: "7:3" }).success, false);
  for (const ratio of ["1:1", "3:2", "16:9", "4:5"]) {
    assert.equal(ImageDTO.safeParse({ ...validImage, ratio }).success, true, ratio);
  }
});

test("AchievementDTO defaults verified to false", () => {
  // Fabricated placements must be structurally impossible. Only the
  // Panasonic Award 2005 is currently evidenced (§16.2).
  const a = AchievementDTO.parse({
    id: "x1",
    year: 2013,
    programme: "NASA Lunabotics",
    result: null,
    track: "international",
  });
  assert.equal(a.verified, false);
  assert.equal(a.result, null, "unknown result is null, never 'no award'");
});

test("StatsDTO has no field that could carry a rounded-up figure", () => {
  const shape = Object.keys(StatsDTO.shape);
  // Every field is an exact integer count plus a computedAt stamp.
  for (const key of shape) {
    assert.equal(
      /^(.*)(plus|approx|rounded|approximate)$/i.test(key),
      false,
      `${key} suggests approximation`,
    );
  }
  assert.ok(shape.includes("currentCommitteeSize"));
  assert.ok(shape.includes("committeesDocumented"));
  assert.ok(shape.includes("computedAt"));
});
