import { BacktraceReport } from './../model/backtraceReport';

export enum BacktraceResultStatus {
  /**
   * Set when sampling method decide to skip report
   */
  SamplingHit = 0,
  /**
   * Set when client limit is reached
   */
  LimitReached = 1,
  /**
   * Set when error occurs while sending diagnostic data
   */
  ServerError = 2,
  /**
   * Set when data were send to API
   */
  Ok = 4,
  /**
   * Data were send to API and waiting for server result
   */
  InProcessing = 8,
  /**
   * Filter function hit
   */
  FilterHit = 16,
}

/**
 * Send method result
 */
export class BacktraceResult {
  public static Processing(report: BacktraceReport): BacktraceResult {
    return new BacktraceResult(
      report,
      'Data were send to API and waiting for server result',
      BacktraceResultStatus.InProcessing,
    );
  }

  public static Ok(report: BacktraceReport, result: string): BacktraceResult {
    return new BacktraceResult(
      report,
      'Report is available on the Backtrace server',
      BacktraceResultStatus.Ok,
      undefined,
      result,
    );
  }
  /**
   * Set result when client rate limit reached
   * @param report Executed report
   * @returns  BacktraceResult with limit reached information
   */
  public static OnLimitReached(report: BacktraceReport): BacktraceResult {
    return new BacktraceResult(
      report,
      'Client report limit reached',
      BacktraceResultStatus.LimitReached,
    );
  }

  public static OnSamplingHit(report: BacktraceReport): BacktraceResult {
    return new BacktraceResult(
      report,
      'Sampling hit',
      BacktraceResultStatus.SamplingHit,
    );
  }

  public static OnFilterHit(report: BacktraceReport): BacktraceResult {
    return new BacktraceResult(
      report,
      'Filter hit',
      BacktraceResultStatus.FilterHit,
    );
  }
  /**
   * Set result when error occurs while sending data to API
   * @param report Executed report
   * @param err Error
   * @returns  BacktraceResult with exception information
   */
  public static OnError(report: BacktraceReport, err: Error): BacktraceResult {
    return new BacktraceResult(
      report,
      err.message,
      BacktraceResultStatus.ServerError,
      err,
    );
  }

  private readonly _objectId: string = '';
  private readonly _rxId: string = '';

  get ObjectId(): string {
    return this._objectId ? this._objectId : this._rxId;
  }

  get Report(): BacktraceReport {
    return this.report;
  }
  get Message(): string {
    return this.message;
  }
  get Error(): Error | undefined {
    return this.err;
  }
  get Status(): BacktraceResultStatus {
    return this.status;
  }

  private constructor(
    private report: BacktraceReport,
    private message: string,
    private status: BacktraceResultStatus,
    private err?: Error | undefined,
    data?: any | undefined,
  ) {
    if (!data) {
      return;
    }
    this._rxId = data._rxid;
    this._objectId = data.object;
    this.message = data.message ? data.message : message;
  }
}
