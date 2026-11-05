// src/web/reanimated-lite.tsx: the web build's stand-in for react-native-reanimated.
//
// metro.config.js resolves `react-native-reanimated` to this file for the web platform only. iOS and
// Android keep the real library. On web, Reanimated plus react-native-worklets were ~750 KB of
// minified JS (about a quarter of the first load) for a handful of small UI animations: the Button3D
// press, the mascot bob, the path node pulse, the lesson progress fill, feedback slide-in and the
// ceremony pops. This module implements exactly the API surface those components use, on the JS
// thread with requestAnimationFrame, which is all the web build ever had anyway (no UI thread).
//
// Supported: default export { View, createAnimatedComponent }, useSharedValue, useAnimatedStyle,
// withTiming, withSpring, withDelay, withSequence, withRepeat, cancelAnimation, runOnJS, Easing.
// An animation may be assigned to a shared value or returned directly as a style value inside
// useAnimatedStyle (Reanimated animates that style property from its previous value).
//
// If a component starts using a Reanimated API that is not here, the import is undefined on web and the
// first call throws (a render error on that screen), so a gap is loud rather than a silently frozen
// animation. Add the API here when that happens; __tests__/web/reanimated-lite.test.tsx covers each one.

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useReducer,
  useState,
  type ComponentType,
  type ForwardedRef,
} from 'react';
import { StyleSheet, View as RNView } from 'react-native';

type Runner = (now: number) => { value: number; done: boolean };
/** A not-yet-started animation: given the value it starts from and the start time, it runs. */
interface Animation {
  __lite: true;
  target: number;
  start(from: number, now: number): Runner;
  /** The same animation heading to another target (timing and spring; used by reversing repeats). */
  retarget?(target: number): Animation;
}

function isAnimation(v: unknown): v is Animation {
  return typeof v === 'object' && v !== null && (v as Animation).__lite === true;
}

// ---------------------------------------------------------------------------------------------
// Frame loop: one requestAnimationFrame drives every running shared value.

const running = new Set<SharedValueImpl>();
let frame: number | null = null;

function tick(now: number): void {
  frame = null;
  for (const sv of [...running]) sv.step(now);
  if (running.size > 0) frame = requestAnimationFrame(tick);
}

function schedule(): void {
  if (frame === null && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------------------------
// Shared values

// The shared values read while an animated style function runs, so the style can subscribe to them.
let reads: Set<SharedValueImpl> | null = null;

class SharedValueImpl {
  private current: number;
  private runner: Runner | null = null;
  private pending: Animation | null = null;
  private listeners = new Set<() => void>();

  constructor(initial: number) {
    this.current = initial;
  }

  get value(): number {
    reads?.add(this);
    return this.current;
  }

  set value(next: number | Animation) {
    if (isAnimation(next)) {
      // Started on the next frame so its clock begins when it is first drawn.
      this.pending = next;
      this.runner = null;
      running.add(this);
      schedule();
      return;
    }
    this.stop();
    this.set(next);
  }

  get(): number {
    return this.current;
  }

  stop(): void {
    this.pending = null;
    this.runner = null;
    running.delete(this);
  }

  step(now: number): void {
    if (this.pending) {
      this.runner = this.pending.start(this.current, now);
      this.pending = null;
    }
    if (!this.runner) {
      running.delete(this);
      return;
    }
    const { value, done } = this.runner(now);
    if (done) this.stop();
    this.set(value);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(next: number): void {
    if (next === this.current) return;
    this.current = next;
    for (const listener of [...this.listeners]) listener();
  }
}

export type SharedValue<T> = { value: T };

export function useSharedValue(initial: number): SharedValue<number> {
  const [sv] = useState(() => new SharedValueImpl(initial));
  useEffect(() => () => sv.stop(), [sv]);
  return sv as unknown as SharedValue<number>;
}

export function cancelAnimation(sv: SharedValue<number>): void {
  (sv as unknown as SharedValueImpl).stop();
}

export function runOnJS<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return fn;
}

// ---------------------------------------------------------------------------------------------
// Easing and animations

type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  ease: (t: number) => cubicBezier(0.25, 0.1, 0.25, 1)(t),
  in: (fn: EasingFn) => fn,
  out: (fn: EasingFn) => (t: number) => 1 - fn(1 - t),
  inOut: (fn: EasingFn) => (t: number) => (t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2),
  bezier: (x1: number, y1: number, x2: number, y2: number) => cubicBezier(x1, y1, x2, y2),
};

function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const bez = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

// Reanimated's default timing curve.
const DEFAULT_EASING = Easing.inOut(Easing.quad);

export function withTiming(
  target: number,
  config: { duration?: number; easing?: EasingFn } = {},
): number {
  const duration = config.duration ?? 300;
  const easing = config.easing ?? DEFAULT_EASING;
  const animation: Animation = {
    __lite: true,
    target,
    retarget: (next) => withTiming(next, config) as unknown as Animation,
    start(from, t0) {
      return (now) => {
        const t = duration <= 0 ? 1 : Math.min(1, (now - t0) / duration);
        return { value: from + (target - from) * easing(t), done: t >= 1 };
      };
    },
  };
  // Typed as number, like Reanimated's own signature, so it can be assigned to `.value`.
  return animation as unknown as number;
}

export function withSpring(
  target: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
): number {
  // Reanimated 4's defaults (GentleSpringConfig): a config that sets only damping and stiffness still
  // springs with mass 4, as it does on native.
  const damping = config.damping ?? 120;
  const stiffness = config.stiffness ?? 900;
  const mass = config.mass ?? 4;
  const animation: Animation = {
    __lite: true,
    target,
    retarget: (next) => withSpring(next, config) as unknown as Animation,
    start(from, t0) {
      let x = from - target; // displacement from rest
      let v = 0;
      let last = t0;
      return (now) => {
        // Semi-implicit Euler in 1 ms steps: stable for the stiffness/damping range the app uses.
        let dt = Math.min(64, now - last);
        last = now;
        while (dt > 0) {
          const h = Math.min(1, dt) / 1000;
          const a = (-stiffness * x - damping * v) / mass;
          v += a * h;
          x += v * h;
          dt -= 1;
        }
        const done = Math.abs(x) < 0.001 && Math.abs(v) < 0.01;
        return { value: done ? target : target + x, done };
      };
    },
  };
  return animation as unknown as number;
}

export function withDelay(delay: number, inner: number): number {
  const anim = inner as unknown as Animation;
  const animation: Animation = {
    __lite: true,
    target: anim.target,
    start(from, t0) {
      let runner: Runner | null = null;
      return (now) => {
        if (now - t0 < delay) return { value: from, done: false };
        runner ??= anim.start(from, t0 + delay);
        return runner(now);
      };
    },
  };
  return animation as unknown as number;
}

export function withSequence(...inner: number[]): number {
  const anims = inner as unknown as Animation[];
  const animation: Animation = {
    __lite: true,
    target: anims[anims.length - 1]?.target ?? 0,
    start(from, t0) {
      let index = 0;
      let runner = anims[0] ? anims[0].start(from, t0) : null;
      return (now) => {
        if (!runner) return { value: from, done: true };
        let result = runner(now);
        while (result.done && index < anims.length - 1) {
          index += 1;
          runner = anims[index].start(result.value, now);
          result = runner(now);
        }
        return { value: result.value, done: result.done && index === anims.length - 1 };
      };
    },
  };
  return animation as unknown as number;
}

export function withRepeat(inner: number, count = 2, reverse = false): number {
  const anim = inner as unknown as Animation;
  const animation: Animation = {
    __lite: true,
    target: anim.target,
    start(from, t0) {
      let origin = from;
      let iteration = 0;
      let current = anim;
      let runner = anim.start(from, t0);
      return (now) => {
        const result = runner(now);
        if (!result.done) return result;
        iteration += 1;
        if (count > 0 && iteration >= count) return { value: result.value, done: true };
        if (reverse && current.retarget) {
          // Run the same curve back to where this iteration started.
          const back = origin;
          origin = current.target;
          current = current.retarget(back);
          runner = current.start(result.value, now);
        } else {
          runner = anim.start(origin, now);
        }
        return { value: result.value, done: false };
      };
    },
  };
  return animation as unknown as number;
}

// ---------------------------------------------------------------------------------------------
// Animated styles

type StyleObject = Record<string, unknown>;

/** What useAnimatedStyle hands to Animated.View: a live style it can read and subscribe to. */
class AnimatedStyleHandle {
  __liteStyle = true as const;
  private listeners = new Set<() => void>();
  private unsubs: (() => void)[] = [];
  // Style properties whose value was an animation are driven by their own shared value.
  private propValues = new Map<string, SharedValueImpl>();
  private computed: StyleObject = {};

  constructor(private fn: () => StyleObject) {}

  /** Swap in this render's style function (it closes over fresh props) and re-run it. */
  update(fn: () => StyleObject): void {
    this.fn = fn;
    this.evaluate();
  }

  current(): StyleObject {
    return this.computed;
  }

  /** Re-run the style function, re-subscribing to whatever shared values it reads now. */
  evaluate(): void {
    const seen = new Set<SharedValueImpl>();
    const previous = reads;
    reads = seen;
    let raw: StyleObject;
    try {
      raw = this.fn() ?? {};
    } finally {
      reads = previous;
    }
    for (const [key, value] of Object.entries(raw)) {
      if (isAnimation(value)) {
        let sv = this.propValues.get(key);
        const prev = this.computed[key];
        if (!sv) {
          sv = new SharedValueImpl(typeof prev === 'number' ? prev : value.target);
          this.propValues.set(key, sv);
          sv.subscribe(() => this.emitProps());
        }
        if (sv.get() !== value.target) sv.value = value as unknown as number;
        raw[key] = sv.get();
      } else {
        const sv = this.propValues.get(key);
        if (sv) {
          sv.stop();
          this.propValues.delete(key);
        }
      }
    }
    this.computed = raw;
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [...seen].map((sv) => sv.subscribe(() => this.onRead()));
    this.emit();
  }

  private onRead(): void {
    this.evaluate();
  }

  private emitProps(): void {
    const next = { ...this.computed };
    for (const [key, sv] of this.propValues) next[key] = sv.get();
    this.computed = next;
    this.emit();
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    for (const sv of this.propValues.values()) sv.stop();
  }
}

export function useAnimatedStyle(fn: () => StyleObject, deps?: unknown[]): StyleObject {
  const [handle] = useState(() => {
    const created = new AnimatedStyleHandle(fn);
    created.evaluate();
    return created;
  });
  // Like Reanimated without a dependency list, re-run on every render so closed-over props apply.
  const key = deps ?? [{}];
  useLayoutEffect(() => {
    handle.update(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);
  useEffect(() => () => handle.dispose(), [handle]);
  return handle as unknown as StyleObject;
}

function isHandle(v: unknown): v is AnimatedStyleHandle {
  return typeof v === 'object' && v !== null && (v as AnimatedStyleHandle).__liteStyle === true;
}

function collectHandles(style: unknown, out: AnimatedStyleHandle[]): void {
  if (Array.isArray(style)) for (const s of style) collectHandles(s, out);
  else if (isHandle(style)) out.push(style);
}

function resolveStyle(style: unknown): unknown {
  if (Array.isArray(style)) return style.map(resolveStyle);
  if (isHandle(style)) return style.current();
  return style;
}

type AnimatableProps = { style?: unknown } & Record<string, unknown>;

export function createAnimatedComponent(Component: ComponentType<AnimatableProps>) {
  const Animated = forwardRef(function Animated(props: AnimatableProps, ref: ForwardedRef<unknown>) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const handles: AnimatedStyleHandle[] = [];
    collectHandles(props.style, handles);
    const handleKey = handles;
    useLayoutEffect(() => {
      const unsubs = handleKey.map((h) => h.subscribe(rerender));
      return () => unsubs.forEach((u) => u());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, handleKey);
    const style = handles.length > 0 ? StyleSheet.flatten(resolveStyle(props.style) as never) : props.style;
    const Host = Component as ComponentType<AnimatableProps & { ref?: ForwardedRef<unknown> }>;
    return <Host {...props} style={style} ref={ref} />;
  });
  Animated.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return Animated;
}

export const View = createAnimatedComponent(RNView as ComponentType<AnimatableProps>);

const AnimatedDefault = { View, createAnimatedComponent };
export default AnimatedDefault;
