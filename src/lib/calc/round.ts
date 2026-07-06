export type RoundingMode = "bankers" | "half_up" | "floor" | "ceil"

export function roundCurrency(amount: number, mode: RoundingMode = "bankers"): number {
  const factor = 100
  const scaled = amount * factor

  switch (mode) {
    case "bankers": {
      const floored = Math.floor(scaled)
      const frac = scaled - floored
      if (frac < 1e-9) {
        return floored / factor
      }
      const diffFromHalf = Math.abs(frac - 0.5)
      if (diffFromHalf < 1e-9) {
        return floored % 2 === 0 ? floored / factor : (floored + 1) / factor
      }
      return Math.round(scaled) / factor
    }
    case "half_up": {
      const sign = scaled >= 0 ? 1 : -1
      const rounded = Math.floor(Math.abs(scaled) + 0.5) * sign
      return rounded / factor
    }
    case "floor":
      return Math.floor(scaled) / factor
    case "ceil":
      return Math.ceil(scaled) / factor
  }
}
