import { BacktraceClient } from './backtraceClient';
import { InitBacktraceClientOptions } from './model/backtraceClientOptions';
import * as btReport from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';

export { BacktraceClient } from './backtraceClient';
export {
  BacktraceClientOptions,
  IBacktraceClientOptions,
  InitBacktraceClientOptions,
} from './model/backtraceClientOptions';
export { BacktraceReport as BtReport } from './model/backtraceReport';

export const pageStartTime = new Date();

let backtraceClient: BacktraceClient | undefined;

/**
 * Initalize Backtrace Client and Backtrace node integration
 * @param configuration Backtrace configuration
 */
export function initialize(
  configuration: InitBacktraceClientOptions,
): BacktraceClient {
  backtraceClient = new BacktraceClient(configuration);
  return backtraceClient;
}

/**
 * Returns used BacktraceClient
 */
export function getBacktraceClient() {
  return backtraceClient;
}

export function use(client: BacktraceClient) {
  backtraceClient = client;
}
/**
 * Send report asynchronously to Backtrace
 * @param payload report payload
 * @param attributes attributes
 * @param attachment client-provided info sent as attachment with report
 */
export async function report(
  payload: (() => void) | Error | string | object,
  attributes: object | undefined = {},
  attachment?: string | object,
): Promise<BacktraceResult> {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  let data: Error | string = '';
  if (payload instanceof Error || typeof payload === 'string') {
    data = payload;
  }
  if (typeof payload === 'object' && attributes === {}) {
    attributes = payload;
  }
  const result = await backtraceClient.reportAsync(
    data,
    attributes,
    attachment,
  );
  if (payload instanceof Function) {
    payload();
  }
  return result;
}

/**
 * Send report synchronosuly to Backtrace
 * @param data report payload
 * @param attributes attributes
 * @param attachment client-provided info sent as attachment with report
 */
export function reportSync(
  data: Error | string,
  attributes: object | undefined = {},
  attachment?: string | object,
): BacktraceResult {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  return backtraceClient.reportSync(data, attributes, attachment);
}

/**
 * Generate BacktraceReport with default configuration
 */
export function createReport(): btReport.BacktraceReport {
  return BacktraceReport();
}

/**
 * Generate BacktraceReport with default configuration
 */
export function BacktraceReport(): btReport.BacktraceReport {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  const client = backtraceClient;
  const backtraceReport = backtraceClient.createReport('');
  backtraceReport.send = (callback: (err?: Error) => void) => {
    client.sendReport(backtraceReport, callback);
  };
  backtraceReport.sendSync = (callback: (err?: Error) => void) => {
    client.sendReport(backtraceReport, callback);
  };

  return backtraceReport;
}

export function errorHandlerMiddleware(
  err: Error,
  req: any,
  resp: any,
  next: any,
) {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  backtraceClient.reportSync(err, { ...req, ...resp });
  next(err);
}

/**
 * Record an event in the breadcrumbs buffer
 * @param message description of event
 * @param attributes object of values related to event
 * @param timestamp time of event
 * @param level log level
 * @param type type of event (e.g. "USER")
 */
export function leaveBreadcrumb(
  message: string,
  attributes?: object,
  timestamp?: number,
  level?: string,
  type?: string,
) {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  if (!message) {
    throw new Error('Breadcrumb must include message');
  }
  backtraceClient.breadcrumbs.add(message, attributes, timestamp, level, type);
}
