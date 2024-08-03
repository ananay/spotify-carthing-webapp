import { BacktraceApi } from './backtraceApi';
import { ClientRateLimit } from './clientRateLimit';
import { pageStartTime } from './index';
import {
  BacktraceClientOptions,
  IBacktraceClientOptions,
  InitBacktraceClientOptions,
} from './model/backtraceClientOptions';
import { BacktraceMetrics } from './model/backtraceMetrics';
import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';
import { Breadcrumbs } from './model/breadcrumbs';
import { getBacktraceGUID } from './utils';
import {
  getBrowserName,
  getBrowserVersion,
  getOs,
  isMobile,
} from './utils/agentUtils';
declare const __VERSION__: string;

/**
 * Backtrace client
 */
export class BacktraceClient {
  public options: IBacktraceClientOptions;
  public breadcrumbs: Breadcrumbs;
  public readonly attributes: { [index: string]: any };

  private _backtraceApi: BacktraceApi;
  public readonly _backtraceMetrics: BacktraceMetrics | undefined;
  private _clientRateLimit: ClientRateLimit;

  constructor(clientOptions: InitBacktraceClientOptions) {
    if (!clientOptions.endpoint) {
      throw new Error(`Backtrace: missing 'endpoint' option.`);
    }
    this.options = this.getOptionsWithDefaults(clientOptions);
    this.breadcrumbs = new Breadcrumbs(this.options.breadcrumbLimit);
    this._backtraceApi = new BacktraceApi(
      this.getSubmitUrl(),
      this.options.timeout,
    );
    this._clientRateLimit = new ClientRateLimit(this.options.rateLimit);
    this.registerHandlers();

    this.attributes = this.getClientAttributes();
    if (this.options.enableMetricsSupport) {
      this._backtraceMetrics = new BacktraceMetrics(
        this.options,
        this._backtraceApi,
        () => {
          return this.getClientAttributes();
        },
      );
    }
  }

  private getClientAttributes() {
    return {
      ...this.readAttributes(),
      ...this.options.userAttributes,
    };
  }
  /**
   * Memorize selected values from application.
   * Memorized attributes will be available in your Backtrace report.
   * Memorized attributes will be only available for one report.
   * @param key attribute key
   * @param value attribute value
   */
  public memorize(key: string, value: any): void {
    this.attributes[key] = value;
  }

  /**
   * Set custom client attribute
   * Memorized attributes will be available in your Backtrace report.
   * Memorized attributes will be only available for one report.
   * @param key attribute key
   * @param value attribute value
   */
  public setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  public createReport(
    payload: Error | string,
    reportAttributes: object | undefined = {},
    attachment?: string | object,
  ): BacktraceReport {
    const breadcrumbs = this.breadcrumbs.isEnabled()
      ? this.breadcrumbs.get()
      : undefined;
    const report = new BacktraceReport(
      payload,
      reportAttributes,
      breadcrumbs,
      attachment,
    );

    report.send = (callback) => {
      this.sendAsync(report)
        .then(() => {
          if (callback) {
            callback(undefined);
          }
        })
        .catch((e) => {
          if (callback) {
            callback(e);
          }
        });
    };
    report.sendSync = (callback) => {
      this.sendReport(report, callback);
    };

    return report;
  }
  /**
   * Send report asynchronously to Backtrace
   * @param payload report payload
   * @param reportAttributes attributes
   * @param attachment data to be converted to a Blob and sent as attachment with report
   */
  public async reportAsync(
    payload: Error | string,
    reportAttributes: object | undefined = {},
    attachment?: string | object,
  ): Promise<BacktraceResult> {
    const report = this.createReport(payload, reportAttributes, attachment);
    return new Promise<BacktraceResult>((res, rej) => {
      this.sendReport(report, (err?: Error, response?: BacktraceResult) => {
        if (err || !response) {
          rej(err);
          return;
        }
        res(response);
      });
    });
  }

  /**
   * Send report synchronosuly to Backtrace
   * @param payload report payload - error or string
   * @param reportAttributes attributes
   * @param attachment data to be converted to a Blob and sent as attachment with report
   */
  public reportSync(
    payload: Error | string,
    reportAttributes: object | undefined = {},
    attachment?: string | object,
  ): BacktraceResult {
    const report = this.createReport(payload, reportAttributes, attachment);
    return this.sendReport(report);
  }

  public sendReport(
    report: BacktraceReport,
    callback?: (err?: Error, res?: BacktraceResult) => void,
  ): BacktraceResult {
    if (!report.uuid) {
      throw new Error(
        'Invalid backtrace report object. Please pass an instance of the Backtrace report object.',
      );
    }
    if (this.options.filter && this.options.filter(report)) {
      return BacktraceResult.OnFilterHit(report);
    }
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }

    // apply default attributes
    report.addObjectAttributes(this.attributes);

    this._backtraceApi
      .send(report)
      .then((result) => {
        if (this.breadcrumbs.isEnabled()) {
          this.breadcrumbs.add(
            'Report sent to Backtrace',
            {
              error: result.Error,
              message: result.Message,
              objectId: result.ObjectId,
            },
            Date.now(),
            'error',
            'log',
          );
        }

        if (callback) {
          callback(result.Error, result);
        }
      })
      .catch((err) => {
        if (callback) {
          callback(err);
        }
      });

    return BacktraceResult.Processing(report);
  }

  public async sendAsync(report: BacktraceReport): Promise<BacktraceResult> {
    if (this.options.filter && this.options.filter(report)) {
      return BacktraceResult.OnFilterHit(report);
    }
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }
    return await this._backtraceApi.send(report);
  }

  private testClientLimits(
    report: BacktraceReport,
  ): BacktraceResult | undefined {
    if (this.samplingHit()) {
      return BacktraceResult.OnSamplingHit(report);
    }

    const limitReach = this._clientRateLimit.skipReport(report);
    if (limitReach) {
      return BacktraceResult.OnLimitReached(report);
    }
    return undefined;
  }

  private samplingHit(): boolean {
    return !!this.options.sampling && Math.random() > this.options.sampling;
  }

  private getSubmitUrl(): string {
    const url = this.options.endpoint;
    if (url.includes('submit.backtrace.io') || url.includes('token=')) {
      return url;
    }

    if (!this.options.token) {
      throw new Error(
        'Token configuration option is required for this type of submission url.',
      );
    }
    const uriSeparator = url.endsWith('/') ? '' : '/';
    return `${this.options.endpoint}${uriSeparator}post?format=json&token=${this.options.token}`;
  }

  private registerHandlers(): void {
    if (!this.options.disableGlobalHandler) {
      this.registerGlobalHandler();
    }
    if (this.options.handlePromises) {
      this.registerPromiseHandler();
    }
  }

  private registerPromiseHandler(): void {
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const err = new Error(event.reason);
      const report = this.createReport(err);
      report.addAnnotation('onunhandledrejection', event);

      this.sendReport(report);
    };
  }

  private registerGlobalHandler(): void {
    window.onerror = (
      msg: string | Event,
      url,
      lineNumber,
      columnNumber,
      error,
    ) => {
      if (!error) {
        if (typeof msg === 'string') {
          error = new Error(msg);
        } else {
          error = new Error((msg as ErrorEvent).error);
        }
      }

      this.reportSync(error, {
        'exception.lineNumber': lineNumber,
        'exception.columnNumber': columnNumber,
      });
    };
  }

  private readAttributes(): { [index: string]: any } {
    const browserName = getBrowserName();
    return {
      application: document.title || 'unknown', // application is required. Using unknown string if it is not found.
      'process.age': Math.floor(
        (new Date().getTime() - pageStartTime.getTime()) / 1000,
      ),
      hostname: window.location && window.location.hostname,
      referer: window.location && window.location.href,
      'user.agent.full': navigator.userAgent,
      'location.port': document.location.port,
      'location.protocol': document.location.protocol,
      'location.origin': window.location.origin,
      'location.href': window.location.href || document.URL,
      language: navigator.language,
      'browser.name': browserName,
      'browser.version': getBrowserVersion(browserName),
      'browser.platform': navigator.platform,
      'browser.vendor': navigator.vendor,
      'cookies.enable': navigator.cookieEnabled,
      'document.domain': document.domain,
      'document.baseURI': document.baseURI,
      'document.title': document.title,
      'document.referrer': document.referrer,
      mobile: isMobile(),
      'localstorage.enable': !!window.localStorage,
      'uname.sysname': getOs(),
      'window.innerHeight': window.innerHeight,
      'window.innerWidth': window.innerWidth,
      'window.outerHeight': window.outerHeight,
      'window.outerWidth': window.outerWidth,
      'window.pageXOffset': window.pageXOffset,
      'window.pageYOffset': window.pageYOffset,
      'window.screenX': window.screenX,
      'window.screenY': window.screenY,
      'window.screenLeft': window.screenLeft,
      'window.screenTop': window.screenTop,
      'backtrace.version': __VERSION__,
      guid: getBacktraceGUID(),
    };
  }

  private getOptionsWithDefaults(
    init: InitBacktraceClientOptions,
  ): IBacktraceClientOptions {
    return {
      ...new BacktraceClientOptions(),
      ...init,
    };
  }
}
