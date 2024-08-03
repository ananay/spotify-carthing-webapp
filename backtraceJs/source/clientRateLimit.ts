import { BacktraceReport } from './model/backtraceReport';

export class ClientRateLimit {
  private readonly _watcherEnable: boolean;
  private readonly _reportQueue: number[] = [];

  constructor(private reportPerMin: number) {
    if (reportPerMin < 0) {
      throw new Error(
        'ReportPerMinute argument must be greater or equal to zero',
      );
    }
    this._watcherEnable = reportPerMin > 0;
  }

  public skipReport(report: BacktraceReport): boolean {
    if (!this._watcherEnable) {
      return false;
    }
    this.clear();
    if (this._reportQueue.length >= this.reportPerMin) {
      return true;
    }
    this._reportQueue.push(report.timestamp);
    return false;
  }

  private clear(): void {
    const time = Math.floor(new Date().getTime() / 1000);
    if (this._reportQueue.length === 0) {
      return;
    }
    if (time - this._reportQueue[0] > 60) {
      this._reportQueue.length = 0;
    }
  }
}
