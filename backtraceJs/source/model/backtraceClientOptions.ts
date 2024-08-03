import { BacktraceReport } from '../model/backtraceReport';

export interface IBacktraceClientOptions {
  timeout: number;
  endpoint: string;
  token?: string;
  userAttributes: object | { [index: string]: any };

  disableGlobalHandler: boolean;
  handlePromises: boolean;

  sampling?: number;
  rateLimit: number;
  filter?: (report: BacktraceReport) => boolean;

  breadcrumbLimit?: number;

  enableMetricsSupport: boolean;
  metricsSubmissionUrl?: string;

  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  debugBacktrace?: boolean;

  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  tabWidth: number;

  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  contextLineCount: number;
}

export type InitBacktraceClientOptions = Pick<
  IBacktraceClientOptions,
  'endpoint'
> &
  Partial<IBacktraceClientOptions>;

/**
 * @deprecated Use `IBacktraceClientOptions` instead.
 */
export class BacktraceClientOptions implements IBacktraceClientOptions {
  public timeout: number = 15000;
  public endpoint!: string;
  public token?: string;
  public userAttributes: object | { [index: string]: any } = {};

  public disableGlobalHandler: boolean = false;
  public handlePromises: boolean = false;

  public sampling?: number | undefined = undefined;
  public rateLimit: number = 0;
  public filter?: (report: BacktraceReport) => boolean = undefined;

  public breadcrumbLimit?: number = -1;

  public enableMetricsSupport: boolean = true;
  public metricsSubmissionUrl?: string;

  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  public debugBacktrace?: boolean = false;
  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  public tabWidth: number = 8;
  /**
   * @deprecated This option is not used anymore and has been left only for backwards compatibility. Please don't use this option anymore.
   */
  public contextLineCount: number = 200;
}
