import React, { useEffect, useState } from "react";
import "./scales";
import { scales } from "./scales";
import { Note, notes } from "./notes";
import { Synth } from "tone";
import * as d3 from "d3";
import "./styles.scss";
import { animated, useSpring } from "react-spring";
import { zip } from "fp-ts/Array";

const highlightColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--hl");
const lowLightColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--ll");
const playingColor = getComputedStyle(
  document.documentElement
).getPropertyValue("--pl");

export type Scale = number[];
export type State =
  | { loaded: false }
  | {
      loaded: true;
      synth: Synth;
      notesToPlay: Scale;
    };

function randomNumber(n: number): number {
  return Math.floor(Math.random() * n);
}

function rotate<X>(array: X[], start: number) {
  let modStart = mod(start, array.length);
  return array.slice(modStart).concat(array.slice(0, modStart));
}

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

function modNotes(a: number) {
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
function useNearestModulo(pp: number, m: number): number {
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

export default function App(): JSX.Element {
  const [stepsBetween, setStepsBetween] = React.useState<Scale>(scales[0]);
  const [offset, setOffset] = React.useState<number>(0);
  const [root, setRoot] = React.useState<number>(0);
  const [state, setState] = useState<State>({ loaded: false });
  const [{ width, height }, setWindow] = React.useState<{
    width: number;
    height: number;
  }>({ width: window.innerWidth, height: window.innerHeight });
  const targetRoot = useNearestModulo(root, notes.length);
  const targetOffset = useNearestModulo(offset, notes.length);
  const { springRoot, springOffset } = useSpring({
    springRoot: targetRoot,
    springOffset: targetOffset,
    config: { tension: 100, friction: 60, mass: 10 },
  });
  const playing: boolean = state.loaded && state.notesToPlay.length > 0;

  React.useEffect(() => {
    const listener = () =>
      setWindow({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [setWindow]);

  useEffect(() => {
    setState({
      loaded: true,
      synth: new Synth().toDestination(),
      notesToPlay: [],
    });
  }, [setState]);

  useEffect(() => {
    if (state.loaded) {
      const [head, ...tail]: Scale = state.notesToPlay;
      if (playing) {
        let interval: number | null = null;
        const note = notes[head % notes.length];
        state.synth.triggerAttack(
          `${note.sharp}${head < notes.length ? octave : octave + 1}`
        );
        // @ts-ignore
        interval = setInterval(() => {
          setState({ ...state, notesToPlay: tail });
        }, 300);
        return () => {
          state.synth.triggerRelease();
          if (interval) clearInterval(interval);
        };
      }
    }
  }, [state, playing]);

  const setRootNearestModule = (newRoot: number) => setRoot(newRoot);
  const setOffsetNearestModule = (newOffset: number) => setOffset(newOffset);
  const octave: number = 3;
  const containerSize = Math.min(width - 30, height - 30);
  const fontSize = `${containerSize / 50}pt`;
  const arcSize = (2 * Math.PI) / notes.length;
  const fontStyle = { "--f": fontSize } as any;
  const setRandomRoot = () => {
    setRootNearestModule(randomNumber(notes.length));
    setOffsetNearestModule(0);
  };
  let setRandomScale = () => {
    const newScale = scales[randomNumber(scales.length)];
    setStepsBetween(rotate(newScale, randomNumber(newScale.length)));
  };
  const setNotesToPlay = () => {
    if (state.loaded)
      setState({
        ...state,
        notesToPlay: playing ? [] : absIndices,
      });
  };

  const absIndices: Scale = stepsBetween.reduce(
    (soFar: Scale, n: number) => soFar.concat(soFar[soFar.length - 1] + n),
    [root]
  );
  const modIndices = absIndices.map((i) => i % notes.length);
  const included = notes.map((_, i) => {
    return modIndices.includes(i);
  });
  const colors = included.map((inc, i) => {
    if (
      state.loaded &&
      state.notesToPlay.length > 0 &&
      modNotes(state.notesToPlay[0]) == i
    )
      return playingColor;
    if (inc) return highlightColor;
    return lowLightColor;
  });
  const arcGen = d3
    .arc<number>()
    .padAngle(0.02)
    .innerRadius(containerSize / 2.5)
    .outerRadius(containerSize / 2)
    .startAngle((i: number) => (i - 0.5) * arcSize)
    .endAngle((i: number) => (i + 0.5) * arcSize)
    .cornerRadius(containerSize);
  const arcs = notes.map((_, i) => arcGen(i) as string);
  const arcInfo: [[number, boolean, string], string][] = zip(
    rotate(
      zip(included, colors).map(([...x], i) => [i, ...x]),
      root - offset
    ),
    arcs
  );

  const noteNames = notes.map((note: Note) =>
    note.sharp == note.flat
      ? note.sharp
      : `${note.sharp}/${note.flat}`
          .replace(/(\w)#/, "$1♯")
          .replace(/(\w)b/, "$1♭")
  );
  const noteNamesInfo = rotate(zip(noteNames, colors), root);

  return (
    <div
      className={"container"}
      style={{ "--s": `${containerSize}px`, "--m": notes.length } as any}
    >
      <div className={"buttons"}>
        <button style={fontStyle} onClick={setRandomRoot}>
          Randomize Root
        </button>
        <button style={fontStyle} onClick={setRandomScale}>
          Randomize Scale
        </button>
        <button style={fontStyle} onClick={setNotesToPlay}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className={"necklace"}>
        {arcInfo.map(([[absIndex, included, color], d], i: number) => {
          return (
            <animated.svg
              className={"svg"}
              key={i}
              style={
                {
                  "--c": color,
                  "--r": springOffset.interpolate((r: number) => -r),
                } as any
              }
            >
              <path
                className={"path"}
                stroke={color}
                d={d}
                onClick={(e: React.MouseEvent<SVGPathElement>) => {
                  let newOffset = modNotes(offset + (absIndex - root));
                  if (e.shiftKey) {
                    if (included) {
                      setOffsetNearestModule(newOffset);
                      setStepsBetween(
                        rotate(stepsBetween, modIndices.indexOf(absIndex))
                      );
                    }
                  } else {
                    setRootNearestModule(absIndex);
                    setOffsetNearestModule(offset + (absIndex - root));
                  }
                }}
              />
            </animated.svg>
          );
        })}
        <div className={"note-names"}>
          {noteNamesInfo.map(([name, color], i) => (
            <animated.a
              style={
                {
                  "--i": springRoot.interpolate((r) => i + (root - r)),
                  "--c": color,
                  ...fontStyle,
                } as any
              }
              key={i}
            >
              {name}
            </animated.a>
          ))}
        </div>
      </div>
    </div>
  );
}
