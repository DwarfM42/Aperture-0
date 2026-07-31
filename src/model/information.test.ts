import { describe, expect, it } from 'vitest'
import {
  entropyBits,
  mutualInformation,
  mutualInformationDistance,
  normalizedMutualInformation,
} from './information'

const independent = [[0.25, 0.25], [0.25, 0.25]]
const perfectlyCorrelated = [[0.5, 0], [0, 0.5]]
const deterministic = [[1, 0], [0, 0]]

describe('information measures', () => {
  it('matches analytic entropy and mutual-information vectors', () => {
    expect(entropyBits([0.5, 0.5])).toBeCloseTo(1, 12)
    expect(mutualInformation(independent)).toBeCloseTo(0, 12)
    expect(normalizedMutualInformation(independent)).toBeCloseTo(0, 12)
    expect(mutualInformationDistance(independent)).toBeCloseTo(1, 12)
    expect(mutualInformation(perfectlyCorrelated)).toBeCloseTo(1, 12)
    expect(normalizedMutualInformation(perfectlyCorrelated)).toBeCloseTo(1, 12)
    expect(mutualInformationDistance(perfectlyCorrelated)).toBeCloseTo(0, 12)
  })

  it('uses the preregistered zero-entropy rule', () => {
    expect(mutualInformation(deterministic)).toBeCloseTo(0, 12)
    expect(normalizedMutualInformation(deterministic)).toBe(0)
    expect(mutualInformationDistance(deterministic)).toBe(1)
  })

  it('uses the preregistered zero-entropy rule when only one marginal is deterministic', () => {
    const oneDeterministicMarginal = [[0.5, 0.5], [0, 0]]

    expect(mutualInformation(oneDeterministicMarginal)).toBeCloseTo(0, 12)
    expect(normalizedMutualInformation(oneDeterministicMarginal)).toBe(0)
    expect(mutualInformationDistance(oneDeterministicMarginal)).toBe(1)
  })

  it('matches the preregistered symmetric correlated vector', () => {
    const joint = [[0.4, 0.1], [0.1, 0.4]]
    const transposed = joint[0].map((_, column) => joint.map((row) => row[column]))

    expect(mutualInformation(joint)).toBeCloseTo(0.27807190511263785, 12)
    expect(mutualInformation(transposed)).toBeCloseTo(mutualInformation(joint), 12)
  })

  it('is symmetric under transposition for asymmetric valid joint distributions', () => {
    const joint = [[0.6, 0.1], [0.2, 0.1]]
    const transposed = joint[0].map((_, column) => joint.map((row) => row[column]))

    expect(Math.abs(mutualInformation(transposed) - mutualInformation(joint))).toBeLessThanOrEqual(1e-12)
    expect(mutualInformation(joint)).toBeGreaterThanOrEqual(0)
  })

  it('fails closed for invalid probability distributions', () => {
    expect(() => mutualInformation([])).toThrow(/non-empty/i)
    expect(() => mutualInformation([[0.5], [0.25, 0.25]])).toThrow(/rectangular/i)
    expect(() => mutualInformation([[0.6, 0.6]])).toThrow(/sum/i)
    expect(() => mutualInformation([[1.1, -0.1]])).toThrow(/non-negative/i)
    expect(() => entropyBits([Number.NaN, 1])).toThrow(/finite/i)
  })
})
