import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

export interface CalculationRecord {
  recordId: string
  metric: string
  value: number
  unit: string
  source: 'COMPUTED'
  algorithm: string
  algorithmVersion: string
  formula: string
  inputIds: string[]
  inputDigest: string
}

interface CalculationRecordInput {
  recordId: string
  metric: string
  value: number
  unit: string
  algorithm: string
  algorithmVersion: string
  formula: string
  inputIds: string[]
  inputs: unknown
}

const encoder = new TextEncoder()

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function hasNativeUint8ArrayPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value)
  if (prototype === null) return false
  const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value
  return typeof constructor === 'function'
    && constructor.name === 'Uint8Array'
    && constructor.prototype === prototype
    && Function.prototype.toString.call(constructor).includes('[native code]')
}

function canonicalValue(value: unknown, active: WeakSet<object>): string {
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonical numbers must be finite')
    if (Object.is(value, -0)) throw new Error('canonical numbers must not use negative zero')
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value !== 'object') {
    throw new Error(`unsupported canonical value type: ${typeof value}`)
  }
  if (active.has(value)) throw new Error('cyclic canonical value')
  active.add(value)
  try {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error('symbol keys are unsupported in canonical values')
    }
    if (ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === '[object Uint8Array]') {
      if (!hasNativeUint8ArrayPrototype(value)) {
        throw new Error('unsupported canonical byte-array prototype')
      }
      const names = Object.getOwnPropertyNames(value)
      if (names.some((name) => !/^(0|[1-9]\d*)$/.test(name)
        || Number(name) >= (value as Uint8Array).length)) {
        throw new Error('extra property is unsupported on canonical byte arrays')
      }
      return canonicalValue(Array.from(value as Uint8Array), active)
    }
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new Error('unsupported canonical array prototype')
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) throw new Error('sparse canonical array')
      }
      const names = Object.getOwnPropertyNames(value)
      if (names.some((name) => name !== 'length'
        && (!/^(0|[1-9]\d*)$/.test(name) || Number(name) >= value.length))) {
        throw new Error('extra property is unsupported on canonical arrays')
      }
      const entries: string[] = []
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))!
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          throw new Error('accessor or non-enumerable property is unsupported on canonical arrays')
        }
        entries.push(canonicalValue(descriptor.value, active))
      }
      return `[${entries.join(',')}]`
    }
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype) {
      throw new Error('unsupported canonical object prototype')
    }

    const object = value as Record<string, unknown>
    const entries = Object.getOwnPropertyNames(object)
      .sort(codeUnitCompare)
      .map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(object, key)!
        if (!descriptor.enumerable) {
          throw new Error('non-enumerable property is unsupported in canonical objects')
        }
        if (!Object.hasOwn(descriptor, 'value')) {
          throw new Error('accessor property is unsupported in canonical objects')
        }
        return `${JSON.stringify(key)}:${canonicalValue(descriptor.value, active)}`
      })
    return `{${entries.join(',')}}`
  } finally {
    active.delete(value)
  }
}

export function canonicalStringify(value: unknown): string {
  return canonicalValue(value, new WeakSet())
}

export function createCalculationRecord(
  input: CalculationRecordInput,
): CalculationRecord {
  if (!Number.isFinite(input.value)) throw new Error('calculation value must be finite')
  const requiredStrings = [
    input.recordId,
    input.metric,
    input.unit,
    input.algorithm,
    input.algorithmVersion,
    input.formula,
  ]
  if (requiredStrings.some((value) => value.length === 0)) {
    throw new Error('calculation provenance fields must be non-empty')
  }
  return {
    recordId: input.recordId,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    source: 'COMPUTED',
    algorithm: input.algorithm,
    algorithmVersion: input.algorithmVersion,
    formula: input.formula,
    inputIds: [...input.inputIds],
    inputDigest: bytesToHex(sha256(encoder.encode(canonicalStringify(input.inputs)))),
  }
}

export function assertProvenanceCoverage(
  displayedRecordIds: string[],
  records: CalculationRecord[],
): void {
  const counts = new Map<string, number>()
  for (const record of records) counts.set(record.recordId, (counts.get(record.recordId) ?? 0) + 1)
  for (const recordId of displayedRecordIds) {
    const count = counts.get(recordId) ?? 0
    if (count === 0) throw new Error(`missing provenance for displayed metric: ${recordId}`)
    if (count > 1) throw new Error(`duplicate provenance for displayed metric: ${recordId}`)
  }
}
