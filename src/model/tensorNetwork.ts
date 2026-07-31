export interface NamedTensor {
  tensorId: string
  indices: string[]
  dimensions: number[]
  values: number[]
}

export interface ClosedNetworkValidation {
  valid: true
  danglingIndexCount: 0
  indexDimensions: Record<string, number>
}

export interface TensorContractionResult {
  contractionOrder: ['A×I→M', 'M×B→scalar']
  scalar: number
  singularValues: [number, number]
  internalVolume: number
}

const EPSILON = 1e-12

export function createClosedTensorNetwork(coupling: number): NamedTensor[] {
  if (!Number.isFinite(coupling)) throw new Error('coupling must be finite')
  return [
    { tensorId: 'A', indices: ['a', 'b'], dimensions: [2, 2], values: [1, 0, 0, 0.5] },
    { tensorId: 'I', indices: ['b', 'c'], dimensions: [2, 2], values: [1, coupling, coupling, 1] },
    { tensorId: 'B', indices: ['c', 'a'], dimensions: [2, 2], values: [0.75, 0.25, 0.25, 0.75] },
  ]
}

export function validateClosedTensorNetwork(
  tensors: NamedTensor[],
): ClosedNetworkValidation {
  if (tensors.length === 0) throw new Error('tensor network must be non-empty')
  const occurrences = new Map<string, number>()
  const indexDimensions: Record<string, number> = {}
  const tensorIds = new Set<string>()

  for (const tensor of tensors) {
    if (tensorIds.has(tensor.tensorId)) throw new Error(`duplicate tensor ID: ${tensor.tensorId}`)
    tensorIds.add(tensor.tensorId)
    if (tensor.indices.length !== tensor.dimensions.length) {
      throw new Error(`tensor rank and dimensions disagree: ${tensor.tensorId}`)
    }
    let valueCount = 1
    for (const [indexPosition, dimension] of tensor.dimensions.entries()) {
      if (!Number.isInteger(dimension) || dimension <= 0) {
        throw new Error(`invalid tensor dimension: ${tensor.tensorId}`)
      }
      valueCount *= dimension
      const index = tensor.indices[indexPosition]
      const existingDimension = indexDimensions[index]
      if (existingDimension !== undefined && existingDimension !== dimension) {
        throw new Error(`inconsistent dimension for index ${index}`)
      }
      indexDimensions[index] = dimension
      occurrences.set(index, (occurrences.get(index) ?? 0) + 1)
    }
    if (tensor.values.length !== valueCount) {
      throw new Error(`tensor value count does not match dimensions: ${tensor.tensorId}`)
    }
    if (tensor.values.some((value) => !Number.isFinite(value))) {
      throw new Error(`tensor values must be finite: ${tensor.tensorId}`)
    }
  }

  const dangling = [...occurrences.entries()].filter(([, count]) => count !== 2)
  if (dangling.length > 0) {
    throw new Error(`each tensor index must occur exactly twice; dangling indices: ${dangling.map(([id]) => id).join(', ')}`)
  }

  return { valid: true, danglingIndexCount: 0, indexDimensions }
}

function asMatrix(tensor: NamedTensor): [[number, number], [number, number]] {
  if (tensor.dimensions.length !== 2
    || tensor.dimensions[0] !== 2
    || tensor.dimensions[1] !== 2
    || tensor.values.length !== 4) {
    throw new Error(`Phase 1 contraction requires a 2×2 tensor: ${tensor.tensorId}`)
  }
  return [
    [tensor.values[0], tensor.values[1]],
    [tensor.values[2], tensor.values[3]],
  ]
}

function multiply(
  left: [[number, number], [number, number]],
  right: [[number, number], [number, number]],
): [[number, number], [number, number]] {
  return [
    [left[0][0] * right[0][0] + left[0][1] * right[1][0], left[0][0] * right[0][1] + left[0][1] * right[1][1]],
    [left[1][0] * right[0][0] + left[1][1] * right[1][0], left[1][0] * right[0][1] + left[1][1] * right[1][1]],
  ]
}

function singularValues2x2(matrix: [[number, number], [number, number]]): [number, number] {
  const a = matrix[0][0] ** 2 + matrix[1][0] ** 2
  const b = matrix[0][0] * matrix[0][1] + matrix[1][0] * matrix[1][1]
  const d = matrix[0][1] ** 2 + matrix[1][1] ** 2
  const discriminant = Math.sqrt((a - d) ** 2 + 4 * b ** 2)
  const rawEigenvalues = [(a + d + discriminant) / 2, (a + d - discriminant) / 2]
  const eigenvalues = rawEigenvalues.map((value) => {
    if (value < -EPSILON) throw new Error('MᵀM has a materially negative eigenvalue')
    return Math.max(0, value)
  })
  return [Math.sqrt(eigenvalues[0]), Math.sqrt(eigenvalues[1])]
}

function effectiveRank(singularValues: [number, number]): number {
  const squared = singularValues.map((value) => value ** 2)
  const total = squared[0] + squared[1]
  if (total === 0) return 0
  const entropy = squared.reduce((sum, value) => {
    if (value === 0) return sum
    const probability = value / total
    return sum - probability * Math.log(probability)
  }, 0)
  return Math.exp(entropy)
}

export function contractClosedTensorNetwork(
  tensors: NamedTensor[],
): TensorContractionResult {
  validateClosedTensorNetwork(tensors)
  const byId = new Map(tensors.map((tensor) => [tensor.tensorId, tensor]))
  const tensorA = byId.get('A')
  const tensorI = byId.get('I')
  const tensorB = byId.get('B')
  if (!tensorA || !tensorI || !tensorB || tensors.length !== 3) {
    throw new Error('Phase 1 contraction requires exactly tensors A, I, and B')
  }
  if (tensorA.indices.join(',') !== 'a,b'
    || tensorI.indices.join(',') !== 'b,c'
    || tensorB.indices.join(',') !== 'c,a') {
    throw new Error('Phase 1 tensor index order does not match the fixed contraction')
  }

  const intermediate = multiply(asMatrix(tensorA), asMatrix(tensorI))
  const contracted = multiply(intermediate, asMatrix(tensorB))
  const singularValues = singularValues2x2(intermediate)
  return {
    contractionOrder: ['A×I→M', 'M×B→scalar'],
    scalar: contracted[0][0] + contracted[1][1],
    singularValues,
    internalVolume: effectiveRank(singularValues),
  }
}
