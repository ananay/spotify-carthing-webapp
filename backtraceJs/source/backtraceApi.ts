import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';

export class BacktraceApi {
  constructor(
    private readonly _backtraceUri: string,
    private readonly _timeout: number,
  ) {}

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    return new Promise<BacktraceResult>((res) => {
      try {
        const formData = report.toFormData();
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.timeout = this._timeout;
        xmlHttpRequest.open('POST', this._backtraceUri, true);
        xmlHttpRequest.send(formData);
        xmlHttpRequest.onload = (e) => {
          if (xmlHttpRequest.readyState === XMLHttpRequest.DONE) {
            if (xmlHttpRequest.status === 200) {
              res(BacktraceResult.Ok(report, xmlHttpRequest.responseText));
            } else if (xmlHttpRequest.status === 429) {
              res(
                BacktraceResult.OnError(
                  report,
                  new Error(`Backtrace - reached report limit.`),
                ),
              );
            } else {
              res(
                BacktraceResult.OnError(
                  report,
                  new Error(
                    `Invalid attempt to submit error to Backtrace. Result: ${xmlHttpRequest.responseText}`,
                  ),
                ),
              );
            }
          }
        };

        xmlHttpRequest.onerror = (e: ProgressEvent) => {
          res(
            BacktraceResult.OnError(
              report,
              e instanceof ErrorEvent ? e.error : new Error('unknown error'),
            ),
          );
        };
      } catch (err) {
        return BacktraceResult.OnError(report, err as Error);
      }
    });
  }

  public sendMetrics(
    url: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return new Promise<boolean>((res) => {
      try {
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.timeout = this._timeout;
        xmlHttpRequest.open('POST', url, true);
        xmlHttpRequest.setRequestHeader('Content-type', 'application/json');
        xmlHttpRequest.send(JSON.stringify(data));
        xmlHttpRequest.onload = () => {
          if (xmlHttpRequest.readyState === XMLHttpRequest.DONE) {
            if (xmlHttpRequest.status === 200) {
              return res(true);
            }
            return res(false);
          }
        };

        xmlHttpRequest.onerror = () => {
          res(false);
        };
      } catch (err) {
        return Promise.resolve(false);
      }
    });
  }
}
