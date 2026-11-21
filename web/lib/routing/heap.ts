// A binary min-heap of (key, node) pairs: the priority queue every search in this folder uses.
// "Lazy deletion": when a node gets a better key we just push it again; the search skips stale pops.
// For a max-heap, push the negated key.

export class MinHeap {
  private keys: number[] = [];
  private ids: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, id: number): void {
    this.keys.push(key);
    this.ids.push(id);
    let i = this.keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Removes and returns the smallest key, or undefined when empty. */
  pop(): { key: number; id: number } | undefined {
    if (this.keys.length === 0) return undefined;
    const top = { key: this.keys[0], id: this.ids[0] };
    const lastKey = this.keys.pop() as number;
    const lastId = this.ids.pop() as number;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey;
      this.ids[0] = lastId;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.keys.length && this.keys[left] < this.keys[smallest]) smallest = left;
        if (right < this.keys.length && this.keys[right] < this.keys[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
  }
}
