import {
  verifyChannelCertificate,
  type ChannelCertificate,
} from './channel'

export type TransferStatus =
  | 'TRANSFERRED'
  | 'BLOCKED_CLOSED_CHANNEL'
  | 'BLOCKED_INSUFFICIENT_CAPACITY'

export interface TransferAttempt {
  payload: Uint8Array
  key: Uint8Array
  certificate: ChannelCertificate
  channelUses: number
}

export interface SymbolRouteRecord {
  symbolIndex: number
  bit: 0 | 1
  basisIndex: 0 | 1
  traversedBonds: readonly ['b', 'c']
}

export interface TransferResult {
  status: TransferStatus
  capacityBitsPerUse: number
  input: number[]
  scrambled: number[]
  routeRecords: SymbolRouteRecord[]
  recovered: number[] | null
  verified: boolean
}

export function computeThroatCapacity(certificate: ChannelCertificate): number {
  if (!verifyChannelCertificate(certificate)) {
    throw new Error('invalid channel certificate')
  }
  if (!certificate.transportEnabled) return 0
  return Math.log2(Math.min(...certificate.routeBondDimensions))
}

export function scramblePayload(payload: Uint8Array, key: Uint8Array): Uint8Array {
  if (key.length === 0) throw new Error('scramble key must be non-empty')
  return Uint8Array.from(payload, (byte, index) => byte ^ key[index % key.length])
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index])
}

function routeSymbols(scrambled: Uint8Array): SymbolRouteRecord[] {
  const records: SymbolRouteRecord[] = []
  for (const byte of scrambled) {
    for (let bitOffset = 7; bitOffset >= 0; bitOffset -= 1) {
      const bit = ((byte >> bitOffset) & 1) as 0 | 1
      records.push({
        symbolIndex: records.length,
        bit,
        basisIndex: bit,
        traversedBonds: ['b', 'c'],
      })
    }
  }
  return records
}

function routedBytes(records: SymbolRouteRecord[]): Uint8Array {
  if (records.length % 8 !== 0) throw new Error('routed symbol count must form complete bytes')
  const bytes = new Uint8Array(records.length / 8)
  for (const record of records) {
    if (record.symbolIndex < 0 || record.symbolIndex >= records.length) {
      throw new Error('invalid routed symbol index')
    }
    if (record.traversedBonds.join(',') !== 'b,c') {
      throw new Error('incomplete certificate route')
    }
    const byteIndex = Math.floor(record.symbolIndex / 8)
    const bitOffset = 7 - (record.symbolIndex % 8)
    bytes[byteIndex] |= record.bit << bitOffset
  }
  return bytes
}

export function attemptTransfer(attempt: TransferAttempt): TransferResult {
  if (!Number.isInteger(attempt.channelUses) || attempt.channelUses < 0) {
    throw new Error('channel uses must be a non-negative integer')
  }
  const capacityBitsPerUse = computeThroatCapacity(attempt.certificate)
  const input = Uint8Array.from(attempt.payload)
  const scrambled = scramblePayload(input, attempt.key)

  if (!attempt.certificate.transportEnabled) {
    return {
      status: 'BLOCKED_CLOSED_CHANNEL',
      capacityBitsPerUse,
      input: Array.from(input),
      scrambled: Array.from(scrambled),
      routeRecords: [],
      recovered: null,
      verified: false,
    }
  }
  if (capacityBitsPerUse * attempt.channelUses < input.length * 8) {
    return {
      status: 'BLOCKED_INSUFFICIENT_CAPACITY',
      capacityBitsPerUse,
      input: Array.from(input),
      scrambled: Array.from(scrambled),
      routeRecords: [],
      recovered: null,
      verified: false,
    }
  }

  const routeRecords = routeSymbols(scrambled)
  const receivedScrambled = routedBytes(routeRecords)
  const recovered = scramblePayload(receivedScrambled, attempt.key)
  return {
    status: 'TRANSFERRED',
    capacityBitsPerUse,
    input: Array.from(input),
    scrambled: Array.from(scrambled),
    routeRecords,
    recovered: Array.from(recovered),
    verified: equalBytes(input, recovered),
  }
}
