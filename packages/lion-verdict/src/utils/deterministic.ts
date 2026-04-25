export function simpleHash(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function deterministicIndex(seedInput: string, length: number): number {
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error("deterministicIndex requires a positive length");
  }

  return simpleHash(seedInput) % length;
}

export function deterministicPick<T>(items: readonly T[], seedInput: string): T {
  if (items.length === 0) {
    throw new Error("deterministicPick requires at least one item");
  }

  return items[deterministicIndex(seedInput, items.length)]!;
}
