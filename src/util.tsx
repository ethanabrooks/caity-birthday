import React from "react";
import { Synth } from "tone";
import { notes } from "./notes";

export const highlightColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--hl");
export const lowLightColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--ll");
export const playingColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--pl");
export type Steps = number[];
export type State =
  | { loaded: false }
  | {
      loaded: true;
      synth: Synth;
      notesToPlay: Steps;
    };

export function randomNumber(n: number): number {
  return Math.floor(Math.random() * n);
}

export function randomChoice<X>(array: X[]): X {
  return array[randomNumber(array.length)];
}

export function rotate<X>(array: X[], start: number) {
  let modStart = mod(start, array.length);
  return array.slice(modStart).concat(array.slice(0, modStart));
}

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function modNotes(a: number) {
  return mod(a, notes.length);
}

// useNearestModulo returns a value minimizing the distance traveled around a
// circle. It always satisfies useNearestModulo(P, M) % M = P.
//
// useNearestModulo(P', M) = Q' such that Q' % M = P' but minimizing |Q' - Q|,
// where Q is the return value from the previous call. The returned value Q' is
// then used as the Q for the next call, and so forth.
//
// In the code below, P' is pp and Q' is qq.
//
// Example (sequence of calls):
//   useNearestModulo( 0, 12) =  0
//   useNearestModulo(10, 12) = -2
//   useNearestModulo( 3, 12) =  3
//   useNearestModulo( 7, 12) =  7
//   useNearestModulo(10, 12) = 10
export function useNearestModulo(pp: number, m: number): number {
  const q = React.useRef<number | null>(null);

  // If the function hasn't been called yet, just return P' which satisfies
  // P' % M = P', but record it as Q for the next call.
  if (q.current == null) {
    q.current = pp;
    return pp;
  }

  // Calculate Q' that gets as close to Q as possible while satisfying
  // Q' % M = P'.
  const qq = Math.round((q.current - pp) / m) * m + pp;
  q.current = qq;
  return qq;
}
