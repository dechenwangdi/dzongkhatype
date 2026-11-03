import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Finger, PressResult } from "./finger-map";

type Box = { x: number; y: number; w: number; h: number };
type Layout = Record<string, Box>;
type Point = { x: number; y: number };
/** A digit on screen: knuckle position, rotation (deg, 0 = pointing up) and length. */
type Pose = { x: number; y: number; angle: number; length: number };
type LeftFinger = "left-pinky" | "left-ring" | "left-middle" | "left-index";

/*
 * Geometry for a human left hand seen from above, in units of a 62px key
 * pitch (scaled to the real keyboard). The right hand is its mirror.
 * [finger, home key, finger length, knuckle x offset, base width, tip width]
 * Lengths are shortened from a flat hand because typing fingers are curled.
 */
const SPEC: [LeftFinger, string, number, number, number, number][] = [
  ["left-pinky", "A", 91, 16, 37, 31],
  ["left-ring", "S", 99, 6, 41, 35],
  ["left-middle", "D", 105, -4, 43, 37],
  ["left-index", "F", 99, -14, 42, 36],
];
const MIRROR: Record<LeftFinger, Finger> = { "left-pinky": "right-pinky", "left-ring": "right-ring", "left-middle": "right-middle", "left-index": "right-index" };

/** Centres of every element marked with data-key, relative to the container. */
function measure(container: HTMLElement): Layout {
  const origin = container.getBoundingClientRect();
  const layout: Layout = {};
  container.querySelectorAll<HTMLElement>("[data-key]").forEach(element => {
    const rect = element.getBoundingClientRect();
    layout[element.dataset.key!] = { x: rect.left - origin.left + rect.width / 2, y: rect.top - origin.top + rect.height / 2, w: rect.width, h: rect.height };
  });
  return layout;
}

function pose(base: Point, tip: Point): Pose {
  const dx = tip.x - base.x, dy = tip.y - base.y;
  return { x: base.x, y: base.y, angle: Math.atan2(dx, -dy) * 180 / Math.PI, length: Math.hypot(dx, dy) };
}

/** Ease every pose towards its target so fingers glide rather than jump. */
function useTween(target: Record<string, Pose>, duration = 160) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const signature = JSON.stringify(target);
  useEffect(() => {
    const from = current.current;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { current.current = target; setValue(target); return; }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - (1 - t) ** 3;
      const next: Record<string, Pose> = {};
      for (const key in target) {
        const a = from[key] ?? target[key], b = target[key];
        next[key] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, angle: a.angle + (b.angle - a.angle) * e, length: a.length + (b.length - a.length) * e };
      }
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [signature]);
  return value;
}

/** Finger outline: knuckle at the origin, pointing up, swelling at each joint, rounded pad. */
function fingerPath(L: number, w0: number, w3: number, closed = true) {
  const b = w0 / 2, j1 = w0 * 0.51, j2 = w3 * 0.54, t = w3 / 2;
  return `M${-b} 0C${-b} ${-L * .25} ${-j1} ${-L * .3} ${-j1} ${-L * .45}`
    + `C${-j1} ${-L * .6} ${-j2} ${-L * .64} ${-j2} ${-L * .75}`
    + `C${-j2} ${-L * .83} ${-t} ${-L * .86} ${-t} ${-L + t}`
    + `A${t} ${t * 1.08} 0 0 1 ${t} ${-L + t}`
    + `C${t} ${-L * .86} ${j2} ${-L * .83} ${j2} ${-L * .75}`
    + `C${j2} ${-L * .64} ${j1} ${-L * .6} ${j1} ${-L * .45}`
    + `C${j1} ${-L * .3} ${b} ${-L * .25} ${b} 0${closed ? "Z" : ""}`;
}

/** Smooth closed outline through points (Catmull-Rom as cubic Béziers). */
function through(points: Point[]) {
  const n = points.length;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    d += `C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d + "Z";
}

const SKIN = "#eebf9a", SKIN_LIGHT = "#f8d9bf", SKIN_SHADE = "#cf9369", SKIN_LINE = "#98603d", NAIL = "#f7e1d6";
const at = (p: Pose) => `translate(${p.x} ${p.y}) rotate(${p.angle})`;

type Digit = { key: string; finger: Finger; pose: Pose; w0: number; w3: number; thumb?: boolean };

/**
 * Two human hands over the on-screen keyboard, fingertips on the home row and
 * thumbs on Space. The finger for the next key reaches to it and is outlined;
 * the finger that pressed a key dips and flashes green (correct) or red
 * (wrong). The hands tint the keys (see .keyboard-hands in globals.css) rather
 * than cover them, and pointer events pass through.
 */
export function KeyboardHands({ targetKey, targetFinger, pressedFinger, pressResult }: {
  targetKey: string | null;
  targetFinger: Finger | null;
  pressedFinger: Finger | null;
  pressResult: PressResult;
}) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");

  // Measure the keyboard this overlay sits in (its positioned parent).
  useLayoutEffect(() => {
    const element = svg.current?.parentElement;
    if (!element) return;
    const update = () => setLayout(measure(element));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    void document.fonts?.ready.then(update);
    return () => observer.disconnect();
  }, []);

  const ready = !!(layout && SPEC.every(([, key]) => layout[key]) && layout.J && layout.K && layout.L && layout[";"] && layout.Space);
  const L = layout!;
  const k = ready ? (L.S.x - L.A.x) / 62 : 1;               // scale from the 62px design pitch
  const mirrorX = ready ? L.A.x + L[";"].x : 0;               // right hand = mirror of the left
  const toLeft = (box: Box) => ({ x: mirrorX - box.x, y: box.y });

  // Targets are computed in left-hand space; the right hand is drawn mirrored.
  const targets: Record<string, Pose> = {};
  const hands: { side: "left" | "right"; palm: string; knuckles: Point[]; fadeFrom: number; fadeTo: number }[] = [];
  if (ready) {
    for (const side of ["left", "right"] as const) {
      const knuckles: Point[] = [];
      for (const [left, key, len, off] of SPEC) {
        const finger = side === "left" ? left : MIRROR[left];
        const home = L[key];
        const restTip = { x: home.x, y: home.y + home.h * 0.12 };
        const knuckle = { x: home.x + off * k, y: restTip.y + len * k };
        const target = finger === targetFinger && targetKey && L[targetKey] ? L[targetKey] : null;
        const reach = target ? (side === "left" ? target : toLeft(target)) : null;
        const tip = reach ? { x: reach.x, y: reach.y + (target!.h * 0.12) } : restTip;
        const p = pose(knuckle, tip);
        targets[`${side}:${left}`] = { ...p, length: p.length * (finger === pressedFinger ? 0.94 : 1) };
        knuckles.push(knuckle);
      }
      const [kP, , kM, kI] = knuckles;
      // Thumb: from the side of the palm to Space, stopping short of the middle.
      const space = side === "left" ? L.Space : { ...L.Space, ...toLeft(L.Space) };
      const middle = side === "left" ? (L.F.x + L.J.x) / 2 : mirrorX - (L.F.x + L.J.x) / 2;
      const thumbTip = { x: kI.x + Math.min(62 * k * 1.2, Math.abs(middle - kI.x) * 0.72), y: space.y + space.h * 0.15 };
      const thumb = pose({ x: kI.x + 8 * k, y: kI.y + 62 * k }, thumbTip);
      targets[`${side}:thumb`] = { ...thumb, length: thumb.length * (pressedFinger === "thumb" ? 0.94 : 1) };
      const palm = through([
        { x: kP.x - 21 * k, y: kP.y + 8 * k }, { x: kP.x - 24 * k, y: kP.y + 60 * k }, { x: kP.x - 14 * k, y: kP.y + 134 * k }, { x: kP.x, y: kP.y + 194 * k },
        { x: kI.x + 8 * k, y: kI.y + 206 * k }, { x: kI.x + 30 * k, y: kI.y + 146 * k }, { x: kI.x + 40 * k, y: kI.y + 86 * k }, { x: kI.x + 26 * k, y: kI.y + 40 * k },
        { x: kI.x + 22 * k, y: kI.y + 4 * k }, { x: kI.x, y: kI.y - 12 * k }, { x: kM.x, y: kM.y - 14 * k }, { x: knuckles[1].x, y: knuckles[1].y - 12 * k }, { x: kP.x, y: kP.y - 10 * k },
      ]);
      // Fade the palm out just below the keyboard so the hands don't spill down the page.
      const keyboardBottom = L.Space.y + L.Space.h / 2;
      hands.push({ side, palm, knuckles, fadeFrom: Math.min(kM.y + 20 * k, keyboardBottom), fadeTo: keyboardBottom + 40 * k });
    }
  }
  const poses = useTween(targets);

  if (!ready) return <svg ref={svg} aria-hidden className="pointer-events-none absolute inset-0" />;

  const digitsFor = (side: "left" | "right"): Digit[] => [
    ...SPEC.map(([left, , , , w0, w3]) => ({ key: `${side}:${left}`, finger: side === "left" ? left : MIRROR[left], pose: poses[`${side}:${left}`], w0: w0 * k, w3: w3 * k })),
    { key: `${side}:thumb`, finger: "thumb" as Finger, pose: poses[`${side}:thumb`], w0: 52 * k, w3: 43 * k, thumb: true },
  ].filter(d => d.pose);

  const highlight = (finger: Finger) =>
    finger === pressedFinger && pressResult === "correct" ? "var(--pressed)"
      : finger === pressedFinger && pressResult === "wrong" ? "var(--destructive)" : null;
  const outline = { fill: SKIN_LINE, stroke: SKIN_LINE, strokeWidth: 2.4, strokeLinejoin: "round" as const };
  const wrinkle = { fill: "none", stroke: SKIN_LINE, strokeWidth: 1, strokeLinecap: "round" as const, opacity: 0.38 };

  return (
    <svg ref={svg} aria-hidden className="keyboard-hands pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
      <defs>
        <linearGradient id={`${id}finger`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={SKIN_SHADE} /><stop offset=".38" stopColor={SKIN_LIGHT} /><stop offset=".62" stopColor={SKIN} /><stop offset="1" stopColor={SKIN_SHADE} />
        </linearGradient>
        <radialGradient id={`${id}palm`} cx=".45" cy=".3" r=".75">
          <stop offset="0" stopColor={SKIN_LIGHT} /><stop offset=".6" stopColor={SKIN} /><stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
        <linearGradient id={`${id}nail`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={NAIL} /><stop offset="1" stopColor={SKIN_LIGHT} />
        </linearGradient>
        {hands.map(hand => (
          <g key={hand.side}>
            {/* Fade each palm out towards the wrist, below the keyboard. */}
            <linearGradient id={`${id}fade-${hand.side}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={hand.fadeFrom} y2={hand.fadeTo}>
              <stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={`${id}mask-${hand.side}`} maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000">
              <rect x="-5000" y="-5000" width="10000" height="10000" fill={`url(#${id}fade-${hand.side})`} />
              <rect x="-5000" y="-5000" width="10000" height={5000 + hand.fadeFrom} fill="#fff" />
            </mask>
          </g>
        ))}
      </defs>

      {hands.map(hand => {
        const digits = digitsFor(hand.side);
        const fingers = digits.filter(d => !d.thumb);
        const kM = hand.knuckles[2];
        return (
          <g key={hand.side} mask={`url(#${id}mask-${hand.side})`} opacity="0.5">
            <g transform={hand.side === "right" ? `translate(${mirrorX} 0) scale(-1 1)` : undefined}>
              {/* Silhouette: every part stroked, then skin filled over it, so only the outer edge keeps a line. */}
              <path d={hand.palm} {...outline} />
              {digits.map(d => <path key={d.key} d={fingerPath(d.pose.length, d.w0, d.w3)} transform={at(d.pose)} {...outline} />)}
              {digits.map(d => <path key={d.key} d={fingerPath(d.pose.length, d.w0, d.w3)} transform={at(d.pose)} fill={`url(#${id}finger)`} />)}
              <path d={hand.palm} fill={`url(#${id}palm)`} />
              {/* Tendons and knuckles on the back of the hand. */}
              {fingers.map((d, i) => {
                const kn = hand.knuckles[i];
                return (
                  <g key={d.key}>
                    <path d={`M${kn.x} ${kn.y + 14 * k}Q${(kn.x + kM.x) / 2} ${kn.y + 100 * k} ${kM.x + (kn.x - kM.x) * 0.35} ${kn.y + 170 * k}`}
                      fill="none" stroke={SKIN_SHADE} strokeWidth={4 * k} strokeLinecap="round" opacity="0.28" />
                    <ellipse cx={kn.x} cy={kn.y - 4 * k} rx={d.w0 * 0.33} ry={8 * k} fill={SKIN_LIGHT} opacity="0.75" />
                  </g>
                );
              })}
              {/* Joint wrinkles and nails. */}
              {digits.map(d => {
                const len = d.pose.length, t = d.w3 / 2;
                return (
                  <g key={d.key} transform={at(d.pose)}>
                    {(d.thumb ? [0.5] : [0.45, 0.74]).map((j, i) => {
                      const y = -len * j, half = (i === 0 ? d.w0 : d.w3) * 0.22;
                      return <g key={j}><path d={`M${-half} ${y}Q0 ${y + 3} ${half} ${y}`} {...wrinkle} /><path d={`M${-half * .7} ${y + 4}Q0 ${y + 6.5} ${half * .7} ${y + 4}`} {...wrinkle} /></g>;
                    })}
                    <rect x={-t * 0.64} y={-len + 3 * k} width={t * 1.28} height={Math.min(len * 0.21, (d.thumb ? 30 : 26) * k)} rx={t * 0.58}
                      fill={`url(#${id}nail)`} stroke={SKIN_LINE} strokeWidth="0.8" strokeOpacity="0.4" />
                  </g>
                );
              })}
              {/* Next finger: gold outline. Pressing finger: green or red tint. */}
              {digits.map(d => {
                const tint = highlight(d.finger);
                const ring = tint ?? (d.finger === targetFinger ? "var(--primary)" : null);
                if (!ring) return null;
                return (
                  <g key={`hl-${d.key}`} transform={at(d.pose)}>
                    {tint && <path d={fingerPath(d.pose.length, d.w0, d.w3)} fill={tint} fillOpacity="0.4" />}
                    <path d={fingerPath(d.pose.length, d.w0, d.w3, false)} fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
