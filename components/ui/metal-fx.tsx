'use client'

import { useTheme } from 'next-themes'
import { useReducedMotion } from 'motion/react'
import { MetalFx as MetalFxBase, type MetalFxProps } from 'metal-fx'

export type { MetalFxPreset, MetalFxVariant, MetalFxTheme } from 'metal-fx'

/**
 * Animated metallic ring, wrapped for KOVA.
 *
 * The library is sound on its own — one shared WebGL context for every
 * instance on the page, no runtime dependencies — but two of its defaults are
 * wrong for this app, and both are easy to get wrong at each call site. So the
 * corrections live here rather than being repeated by hand.
 *
 *   1. Theme. Upstream `theme="auto"` reads
 *      `matchMedia('(prefers-color-scheme: dark)')`, i.e. the operating
 *      system. KOVA's theme is next-themes stamping `[data-theme]`, so a user
 *      on a light OS who switches the app to dark would get the light metal
 *      tuning on a near-black surface. We pass the app's resolved theme.
 *
 *   2. Reduced motion. The library has no `prefers-reduced-motion` handling
 *      at all — a continuously animating shader regardless. Every other
 *      animated component here gates on it, so this one does too. Because the
 *      library paints one frame before honouring `paused`, the reduced-motion
 *      result is a still metal ring rather than a blank canvas: the design
 *      survives, only the animation stops.
 *
 * Default preset is `silver`. `gold` is close to the palette the app moved
 * away from, and `chromatic` reads as generic AI iridescence.
 */
export function MetalFx({ preset = 'silver', paused, theme, ...props }: MetalFxProps) {
  const { resolvedTheme } = useTheme()
  const reduced = useReducedMotion()

  return (
    <MetalFxBase
      preset={preset}
      // An explicit `theme` prop from a call site still wins; otherwise follow
      // the app. Before next-themes has resolved on first paint it is
      // undefined, and dark is this app's primary surface.
      theme={theme ?? (resolvedTheme === 'light' ? 'light' : 'dark')}
      paused={paused || !!reduced}
      {...props}
    />
  )
}

export default MetalFx
