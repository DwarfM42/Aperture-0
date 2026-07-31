import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { canonicalStringify } from './provenance'
import {
  createClosedTensorNetwork,
  validateClosedTensorNetwork,
  type NamedTensor,
} from './tensorNetwork'

export type ChannelPhase = 'CORRELATING' | 'OPEN' | 'CLOSED'

export interface ChannelCertificate {
  readonly phase: ChannelPhase
  readonly networkInputDigest: string
  readonly tensorRoute: readonly ['A', 'I', 'B']
  readonly bondRoute: readonly ['b', 'c']
  readonly routeBondDimensions: readonly [number, number]
  readonly transportEnabled: boolean
  readonly certificateDigest: string
}

const encoder = new TextEncoder()
const issuedCertificates = new WeakSet<object>()
const PHASE_COUPLINGS: Record<ChannelPhase, number> = {
  CORRELATING: 0.4,
  OPEN: 0.9,
  CLOSED: 0.3,
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function digest(value: unknown): string {
  return bytesToHex(sha256(encoder.encode(canonicalStringify(value))))
}

function canonicalNetworkInput(tensors: NamedTensor[]): NamedTensor[] {
  return [...tensors]
    .sort((left, right) => codeUnitCompare(left.tensorId, right.tensorId))
    .map((tensor) => ({
      tensorId: tensor.tensorId,
      indices: [...tensor.indices],
      dimensions: [...tensor.dimensions],
      values: [...tensor.values],
    }))
}

function assertPhase1ChannelTopology(tensors: NamedTensor[], phase: ChannelPhase): void {
  if (typeof phase !== 'string' || !Object.hasOwn(PHASE_COUPLINGS, phase)) {
    throw new Error('unsupported Phase 1 channel phase')
  }
  canonicalStringify(tensors)
  const tensorKeys = ['dimensions', 'indices', 'tensorId', 'values']
  for (const tensor of tensors) {
    if (Object.getPrototypeOf(tensor) !== Object.prototype) {
      throw new Error('Phase 1 tensors must use the plain object prototype')
    }
    const ownKeys = Object.getOwnPropertyNames(tensor).sort(codeUnitCompare)
    if (canonicalStringify(ownKeys) !== canonicalStringify(tensorKeys)) {
      throw new Error('Phase 1 tensor properties must exactly match the preregistered schema')
    }
    if (ownKeys.some((key) => !Object.hasOwn(Object.getOwnPropertyDescriptor(tensor, key) ?? {}, 'value'))) {
      throw new Error('Phase 1 tensor properties must be plain data properties')
    }
  }
  const byId = new Map(tensors.map((tensor) => [tensor.tensorId, tensor]))
  const tensorA = byId.get('A')
  const tensorI = byId.get('I')
  const tensorB = byId.get('B')
  if (!tensorA || !tensorI || !tensorB || tensors.length !== 3) {
    throw new Error('Phase 1 channel route requires exactly tensors A, I, and B')
  }
  if (tensorA.indices.join(',') !== 'a,b'
    || tensorI.indices.join(',') !== 'b,c'
    || tensorB.indices.join(',') !== 'c,a') {
    throw new Error('Phase 1 channel topology must be A[a,b] to I[b,c] to B[c,a]')
  }
  const expected = canonicalNetworkInput(createClosedTensorNetwork(PHASE_COUPLINGS[phase]))
  if (canonicalStringify(canonicalNetworkInput(tensors)) !== canonicalStringify(expected)) {
    throw new Error('channel network does not match the preregistered phase input')
  }
}

function certificateBody(certificate: Omit<ChannelCertificate, 'certificateDigest'>): Omit<ChannelCertificate, 'certificateDigest'> {
  return {
    phase: certificate.phase,
    networkInputDigest: certificate.networkInputDigest,
    tensorRoute: certificate.tensorRoute,
    bondRoute: certificate.bondRoute,
    routeBondDimensions: certificate.routeBondDimensions,
    transportEnabled: certificate.transportEnabled,
  }
}

export function deriveChannelCertificate(
  tensors: NamedTensor[],
  phase: ChannelPhase,
): ChannelCertificate {
  const validation = validateClosedTensorNetwork(tensors)
  assertPhase1ChannelTopology(tensors, phase)
  const tensorRoute = Object.freeze(['A', 'I', 'B'] as const)
  const bondRoute = Object.freeze(['b', 'c'] as const)
  const routeBondDimensions = Object.freeze([
    validation.indexDimensions.b,
    validation.indexDimensions.c,
  ] as const)
  const body = certificateBody({
    phase,
    networkInputDigest: digest(canonicalNetworkInput(tensors)),
    tensorRoute,
    bondRoute,
    routeBondDimensions,
    transportEnabled: phase === 'OPEN',
  })
  const certificate = Object.freeze({
    ...body,
    certificateDigest: digest(body),
  })
  issuedCertificates.add(certificate)
  return certificate
}

export function verifyChannelCertificate(certificate: ChannelCertificate): boolean {
  try {
    if (!issuedCertificates.has(certificate)) return false
    if (certificate.tensorRoute.join(',') !== 'A,I,B') return false
    if (certificate.bondRoute.join(',') !== 'b,c') return false
    if (certificate.routeBondDimensions.length !== 2) return false
    if (certificate.routeBondDimensions.some((dimension) => !Number.isInteger(dimension) || dimension <= 0)) return false
    if (certificate.transportEnabled !== (certificate.phase === 'OPEN')) return false
    return certificate.certificateDigest === digest(certificateBody(certificate))
  } catch {
    return false
  }
}
