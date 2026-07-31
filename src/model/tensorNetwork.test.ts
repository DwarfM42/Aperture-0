import { describe, expect, it } from 'vitest'
import {
  contractClosedTensorNetwork,
  createClosedTensorNetwork,
  validateClosedTensorNetwork,
} from './tensorNetwork'
import type { NamedTensor } from './tensorNetwork'

describe('closed tensor network', () => {
  it('has no dangling indices and a fixed deterministic contraction order', () => {
    const network = createClosedTensorNetwork(0.4)
    const validation = validateClosedTensorNetwork(network)
    const result = contractClosedTensorNetwork(network)

    expect(validation).toEqual({
      valid: true,
      danglingIndexCount: 0,
      indexDimensions: { a: 2, b: 2, c: 2 },
    })
    expect(result.contractionOrder).toEqual(['A×I→M', 'M×B→scalar'])
    expect(result.scalar).toBeCloseTo(1.275, 12)
    expect(result.singularValues[0]).toBeCloseTo(1.1471497813164107, 12)
    expect(result.singularValues[1]).toBeCloseTo(0.36612481372574524, 12)
    expect(result.internalVolume).toBeCloseTo(1.3609211851696628, 12)
  })

  it.each([
    [0.9, 1.4625, 1.0130447438368164],
    [0.3, 1.2375, 1.4656772669577116],
  ])('matches golden contraction values at coupling %s', (coupling, scalar, volume) => {
    const result = contractClosedTensorNetwork(createClosedTensorNetwork(coupling))
    expect(result.scalar).toBeCloseTo(scalar, 12)
    expect(result.internalVolume).toBeCloseTo(volume, 12)
  })

  it('rejects dangling indices and inconsistent dimensions', () => {
    const dangling: NamedTensor[] = createClosedTensorNetwork(0.4).map((tensor) => (
      tensor.tensorId === 'B' ? { ...tensor, indices: ['c', 'z'] } : tensor
    ))
    expect(() => validateClosedTensorNetwork(dangling)).toThrow(/dangling|exactly twice/i)

    const mismatch: NamedTensor[] = createClosedTensorNetwork(0.4).map((tensor) => (
      tensor.tensorId === 'I'
        ? { ...tensor, dimensions: [3, 2], values: [1, 0, 0, 0, 1, 0] }
        : tensor
    ))
    expect(() => validateClosedTensorNetwork(mismatch)).toThrow(/dimension/i)
  })
})
