export class FrameBudgetQueue {
  private readonly budgetMs: number;
  private queue: (() => void)[] = [];
  private head = 0;

  constructor(budgetMs = 3.5) {
    this.budgetMs = budgetMs;
  }

  public enqueue(taskFn: () => void): void {
    this.queue.push(taskFn);
  }

  public get pending(): number {
    return this.queue.length - this.head;
  }

  public clear(): void {
    this.queue.length = 0;
    this.head = 0;
  }

  public flush(): void {
    if (this.head >= this.queue.length) return;
    const start = performance.now();
    while (this.head < this.queue.length) {
      const task = this.queue[this.head++];
      task();
      if (performance.now() - start >= this.budgetMs) {
        break; // Yield to the next frame so movement stays smooth
      }
    }
    if (this.head >= this.queue.length) {
      this.queue.length = 0;
      this.head = 0;
    } else if (this.head > 64) {
      this.queue = this.queue.slice(this.head);
      this.head = 0;
    }
  }
}
