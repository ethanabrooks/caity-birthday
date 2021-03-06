import { flatten, zip } from "fp-ts/lib/Array";
import { NUM_NOTES } from "./notes";
import { rotate, Steps } from "./util";
import assert from "assert";

type AScale = { head: [1]; tail: B } | { head: [1, 1]; tail: B };
type BScale =
  | { head: [2]; tail: C }
  | { head: [2, 3]; tail: C }
  | { head: [3]; tail: A };
type CScale = A | B | null;

type A = { tag: "A"; scale: AScale };
type B = { tag: "B"; scale: BScale };
type C = { tag: "C"; scale: CScale };

function AScales(len: number): A[] {
  if (len <= 1) {
    return [];
  }
  return flatten<AScale>([
    BScales(len - 1).map((b: B) => ({ head: [1], tail: b })),
    BScales(len - 2).map((b: B) => ({ head: [1, 1], tail: b })),
  ]).map((a: AScale) => ({ tag: "A", scale: a }));
}

function BScales(len: number): B[] {
  if (len <= 0) {
    return [];
  }
  return flatten<BScale>([
    AScales(len - 3).map((a: A): BScale => ({ head: [3], tail: a })),
    CScales(len - 2).map((c: C) => ({ head: [2], tail: c })),
    CScales(len - 5).map((c: C) => ({ head: [2, 3], tail: c })),
  ]).map((b: BScale) => ({ tag: "B", scale: b }));
}

function CScales(len: number): C[] {
  if (len < 0) {
    return [];
  } else if (len === 0) {
    return [{ tag: "C", scale: null }];
  } else {
    return flatten<A | B>([AScales(len), BScales(len)]).map((c: CScale) => ({
      tag: "C",
      scale: c,
    }));
  }
}

function getStepsA(a: A): Steps {
  const head: Steps = a.scale.head;
  if (a.scale.tail === null) {
    return head;
  }
  return head.concat(getStepsB(a.scale.tail));
}

function getStepsB(b: B): Steps {
  const head: Steps = b.scale.head;
  switch (b.scale.tail.tag) {
    case "A":
      return head.concat(getStepsA(b.scale.tail));
    case "C":
      return head.concat(getStepsC(b.scale.tail));
  }
}

function getStepsC(c: C): Steps {
  if (c.scale === null) {
    return [];
  }
  switch (c.scale.tag) {
    case "A":
      return getStepsA(c.scale);
    case "B":
      return getStepsB(c.scale);
  }
}

export function hasDoubleHalfSteps(scale: Steps): boolean {
  return zip(scale, rotate(scale, 1)).some(([a, b]) => a === 1 && b === 1);
}

export function hasAug2nd(scale: Steps): boolean {
  return scale.some((s) => s === 3);
}

function arrayEqual<X>(a: X[], b: X[]): boolean {
  return zip(a, b).every(([a, b]) => a === b);
}

function isAdjacentHelper(
  check1: Steps,
  check2: Steps,
  rotated1: Steps,
  rotated2: Steps
): boolean {
  if (check1.length === 0 || check2.length === 0) return false; // no steps in common
  const [h1, ...t1] = check1;
  const [h2, ...t2] = check2;
  assert(h1 === rotated1[rotated1.length - 1]);
  assert(h2 === rotated2[rotated2.length - 1]);
  if (h1 === h2) {
    const [r11, r12, ...r1] = rotated1;
    const [r21, r22, ...r2] = rotated2;
    let isAdjacent;

    if (r11 !== r12 && r11 + r12 === r21 + r22) isAdjacent = arrayEqual(r1, r2); // sharpened/flattened
    if (r11 + r12 === r21) {
      isAdjacent = arrayEqual(r1, [r22].concat(r2));
    } // split
    if (r21 + r22 === r11) isAdjacent = arrayEqual(r2, [r12].concat(r1)); // merge
    if (isAdjacent) return true;
  }
  return isAdjacentHelper(t1, t2, rotate(rotated1, 1), rotate(rotated2, 1));
}

function isAdjacent(scale1: Steps, scale2: Steps) {
  return isAdjacentHelper(scale1, scale2, rotate(scale1, 1), rotate(scale2, 1));
}

export const patterns: Steps[] = flatten(
  CScales(NUM_NOTES)
    .map(getStepsC)
    .map((p) => p.map((_, i) => rotate(p, i)))
);

export function adjacentTo(scale: Steps): Steps[] {
  return patterns.filter((scale2) => isAdjacent(scale, scale2));
}

export function isValidA(scale: Steps): boolean {
  const [head1, head2, ...tail] = scale;
  if (head1 === undefined) {
    return false;
  } else {
    if (head1 === 1 && head2 === 1) {
      return isValidB(tail);
    } else if (head1 === 1) {
      return isValidB([head2, ...tail]);
    } else {
      return false;
    }
  }
}

export function isValidB(scale: Steps): boolean {
  const [head1, head2, ...tail] = scale;
  if (head1 === 2 && head2 === 3) {
    return isValid(tail);
  } else if (head1 === 2) {
    return isValid([head2, ...tail]);
  } else if (head1 === 3) {
    return isValidA([head2, ...tail]);
  } else {
    return false;
  }
}

export function isValid(steps: Steps): boolean {
  const [head] = steps;
  if (head === undefined) {
    return true;
  } else {
    return isValidA(steps) || isValidB(steps);
  }
}

// function dbg(scale1: Steps, scale2: Steps) {
//   const rotated1 = rotate(scale1, 1);
//   const rotated2 = rotate(scale2, 1);
//   console.log(
//     scale1,
//     scale2,
//     rotated1,
//     rotated2,
//     isAdjacentHelper(scale1, scale2, rotated1, rotated2)
//   );
//   // console.log(
//   //   scale2,
//   //   scale1,
//   //   rotated2,
//   //   rotated1,
//   //   isAdjacentHelper(scale2, scale1, rotated2, rotated1)
//   // );
// }

// dbg([1, 3, 1, 1, 2, 3, 1], [1, 3, 1, 1, 2, 2, 2]);
export type Scale = { root: number; steps: Steps; rootStep: number };
