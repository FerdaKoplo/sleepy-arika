export class ArikaRing {
  private virtualReplicas: number;
  private ring: number[];
  private nodeMap: Map<number, string>;

  constructor(nodes: string[], virtualReplicas = 150) {
    this.virtualReplicas = virtualReplicas;
    this.ring = [];
    this.nodeMap = new Map();

    nodes.forEach((node) => this.addNode(node));
  }

  private hash(key: string): number {
    let h = 0;
    // black magic, i dont even know what this is does actually stil learning though
    for (let i = 0; i < key.length; i++) {
      let k = key.charCodeAt(i);
      k = Math.imul(k, 0xcc9e2d51);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, 0x1b873593);

      h ^= k;
      h = (h << 13) | (h >>> 19);
      h = Math.imul(h, 5) + 0xe6546b64;
    }
    h ^= key.length;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  public addNode(node: string) {
    for (let i = 0; i < this.virtualReplicas; i++) {
      const virtualKey = `${node}:replica:${i}`;
      const position = this.hash(virtualKey);

      this.ring.push(position);
      this.nodeMap.set(position, node);
    }
    this.ring.sort((a, b) => a - b);
  }

  public getNodeKey(key: string): string {
    if (this.ring.length === 0) return "";
    const position = this.hash(key);
    let low = 0;
    let high = this.ring.length - 1;
    let targetIndex = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ring[mid] >= position) {
        targetIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    if (low > this.ring.length - 1) {
      targetIndex = 0;
    }

    const ringKey = this.ring[targetIndex];
    const node = this.nodeMap.get(ringKey);

    if (!node) {
      const fallbackNode = this.nodeMap.values().next().value;
      if (!fallbackNode) {
        throw new Error("HashRing is corrupted: No active worker nodes found.");
      }
      return fallbackNode;
    }

    return node;
  }
}
