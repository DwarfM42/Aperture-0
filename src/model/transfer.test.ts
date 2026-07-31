import { describe, expect, it } from 'vitest'
import { deriveChannelCertificate } from './channel'
import { createClosedTensorNetwork } from './tensorNetwork'
import {
  attemptTransfer,
  computeThroatCapacity,
  scramblePayload,
} from './transfer'

const payload = new TextEncoder().encode('A0')
const key = new Uint8Array([0xa7, 0x3c])
const openCertificate = deriveChannelCertificate(createClosedTensorNetwork(0.9), 'OPEN')
const closedCertificate = deriveChannelCertificate(createClosedTensorNetwork(0.3), 'CLOSED')

describe('certificate-bound throat capacity and transfer control', () => {
  it('derives capacity only from a sealed tensor-network certificate', () => {
    expect(computeThroatCapacity(openCertificate)).toBe(1)
    expect(computeThroatCapacity(closedCertificate)).toBe(0)

    const forged = {
      ...closedCertificate,
      phase: 'OPEN' as const,
      transportEnabled: true,
    }
    expect(() => computeThroatCapacity(forged)).toThrow(/certificate/i)
  })

  it('routes every OPEN symbol through b then c before B-side recovery', () => {
    expect(Array.from(scramblePayload(payload, key))).toEqual([0xe6, 0x0c])

    const result = attemptTransfer({
      payload,
      key,
      certificate: openCertificate,
      channelUses: 16,
    })

    expect(result.status).toBe('TRANSFERRED')
    expect(result.capacityBitsPerUse).toBe(1)
    expect(Array.from(result.input)).toEqual(Array.from(payload))
    expect(Array.from(result.recovered ?? [])).toEqual(Array.from(payload))
    expect(result.verified).toBe(true)
    expect(result.routeRecords).toHaveLength(16)
    expect(result.routeRecords.every((record) => (
      record.traversedBonds.join(',') === 'b,c'
      && record.basisIndex === record.bit
    ))).toBe(true)
  })

  it('attempts the same CLOSED payload without routing or exposing B-side recovery', () => {
    const result = attemptTransfer({
      payload,
      key,
      certificate: closedCertificate,
      channelUses: 16,
    })

    expect(result.status).toBe('BLOCKED_CLOSED_CHANNEL')
    expect(result.capacityBitsPerUse).toBe(0)
    expect(Array.from(result.input)).toEqual(Array.from(payload))
    expect(Array.from(result.scrambled)).toEqual([0xe6, 0x0c])
    expect(result.routeRecords).toEqual([])
    expect(result.recovered).toBeNull()
    expect(result.verified).toBe(false)
  })

  it('fails closed when an OPEN certificate does not provide enough uses', () => {
    const result = attemptTransfer({
      payload,
      key,
      certificate: openCertificate,
      channelUses: 8,
    })
    expect(result.status).toBe('BLOCKED_INSUFFICIENT_CAPACITY')
    expect(result.routeRecords).toEqual([])
    expect(result.recovered).toBeNull()
  })
})
