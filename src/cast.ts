export type Motion = "breathe" | "sway" | "float" | "flutter" | "sob" | "bob"

export type Eye = {
  x: string
  y: string
  w: string
  h: string
  color: string
}

export type Actor = {
  src: string
  motion: Motion
  blink?: string
  eyes?: Eye[]
  spread?: boolean
  x?: string
  r?: string
  b?: string
  t?: string
  w: string
}

/** Cut-out characters that are not already painted into the picture. */
export const cast: Record<string, Actor[]> = {}

/**
 * Eyelids drawn on the painted character, as a percentage of the picture.
 * A blink closes them for a moment, then they open again.
 */
export const sceneEyes: Record<string, Eye[]> = {}

export const fatherEyes: Eye[] = []
