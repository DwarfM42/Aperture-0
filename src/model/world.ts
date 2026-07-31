import type { DomainId, TransitionRule, WorldState } from './types'

interface WorldConfiguration {
  domainId: DomainId
  initialLocalTime?: number
  initialSignal: number
  transition: TransitionRule
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`)
}

export function createWorld(configuration: WorldConfiguration): WorldState {
  const initialLocalTime = configuration.initialLocalTime ?? 0
  if (!Number.isInteger(initialLocalTime) || initialLocalTime < 0) {
    throw new Error('initial local time must be a non-negative integer')
  }
  requireFinite(configuration.initialSignal, 'initial signal')
  requireFinite(configuration.transition.operand, 'transition operand')
  return {
    domainId: configuration.domainId,
    localTime: initialLocalTime,
    signal: configuration.initialSignal,
    transition: { ...configuration.transition },
  }
}

export function advanceWorld(world: WorldState, ticks = 1): WorldState {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new Error('tick count must be a non-negative integer')
  }

  let signal = world.signal
  requireFinite(signal, 'world signal')
  for (let tick = 0; tick < ticks; tick += 1) {
    signal = world.transition.kind === 'ADD'
      ? signal + world.transition.operand
      : signal * 2 + world.transition.operand
    requireFinite(signal, 'transition result')
  }

  return {
    ...world,
    transition: { ...world.transition },
    localTime: world.localTime + ticks,
    signal,
  }
}
