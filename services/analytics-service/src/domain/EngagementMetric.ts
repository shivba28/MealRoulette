/**
 * Domain entity: aggregated engagement metrics (e.g. per recipe or per user).
 */
export class EngagementMetric {
  constructor(
    public readonly entityId: string,
    public readonly likes: number,
    public readonly passes: number,
    public readonly totalSwipes: number,
    public readonly periodStart: string,
    public readonly periodEnd: string
  ) {}

  get likeRate(): number {
    return this.totalSwipes > 0 ? this.likes / this.totalSwipes : 0;
  }
}
