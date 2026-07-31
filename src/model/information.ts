const EPSILON = 1e-12

function validateProbabilityVector(probabilities: number[], requireNormalized = true): void {
  if (probabilities.length === 0) throw new Error('probability vector must be non-empty')
  for (const probability of probabilities) {
    if (!Number.isFinite(probability)) throw new Error('probability must be finite')
    if (probability < 0) throw new Error('probability must be non-negative')
  }
  if (requireNormalized) {
    const total = probabilities.reduce((sum, probability) => sum + probability, 0)
    if (Math.abs(total - 1) > EPSILON) throw new Error('probabilities must sum to 1')
  }
}

function validateJoint(joint: number[][]): void {
  if (joint.length === 0 || joint[0]?.length === 0) {
    throw new Error('joint distribution must be non-empty')
  }
  const width = joint[0].length
  if (joint.some((row) => row.length !== width)) {
    throw new Error('joint distribution must be rectangular')
  }
  validateProbabilityVector(joint.flat())
}

export function entropyBits(probabilities: number[]): number {
  validateProbabilityVector(probabilities)
  return -probabilities.reduce(
    (entropy, probability) => probability === 0
      ? entropy
      : entropy + probability * Math.log2(probability),
    0,
  )
}

function marginals(joint: number[][]): { rows: number[]; columns: number[] } {
  const rows = joint.map((row) => row.reduce((sum, value) => sum + value, 0))
  const columns = joint[0].map((_, column) => (
    joint.reduce((sum, row) => sum + row[column], 0)
  ))
  return { rows, columns }
}

export function mutualInformation(joint: number[][]): number {
  validateJoint(joint)
  const { rows, columns } = marginals(joint)
  let information = 0
  for (const [rowIndex, row] of joint.entries()) {
    for (const [columnIndex, probability] of row.entries()) {
      if (probability === 0) continue
      const denominator = rows[rowIndex] * columns[columnIndex]
      if (denominator <= 0) throw new Error('positive joint probability has zero marginal')
      information += probability * Math.log2(probability / denominator)
    }
  }
  if (information < -EPSILON) throw new Error('mutual information is materially negative')
  return Math.abs(information) <= EPSILON ? 0 : information
}

export function normalizedMutualInformation(joint: number[][]): number {
  validateJoint(joint)
  const { rows, columns } = marginals(joint)
  const denominator = Math.max(entropyBits(rows), entropyBits(columns))
  if (denominator === 0) return 0
  const normalized = mutualInformation(joint) / denominator
  if (normalized < -EPSILON || normalized > 1 + EPSILON) {
    throw new Error('normalized mutual information is outside [0, 1]')
  }
  return Math.min(1, Math.max(0, normalized))
}

export function mutualInformationDistance(joint: number[][]): number {
  return 1 - normalizedMutualInformation(joint)
}
