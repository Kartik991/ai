/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32).
 * Ensures repeatable results across runs when the same random seed is provided.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed?: number) {
    const actualSeed = seed !== undefined && seed !== null ? seed : Math.floor(Math.random() * 2147483647);
    this.state = actualSeed >>> 0;
  }

  /**
   * Generates a pseudorandom float between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Selects an element randomly from an array.
   */
  public choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }

  /**
   * Returns a shuffled copy of the array using Fisher-Yates shuffle.
   */
  public shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
