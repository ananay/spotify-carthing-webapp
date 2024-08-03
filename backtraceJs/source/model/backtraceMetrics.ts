import { BacktraceApi } from '@src/backtraceApi';
import { SEC_TO_MILLIS } from '../consts';
import { currentTimestamp, getEndpointParams, uuid } from '../utils';
import { IBacktraceClientOptions } from './backtraceClientOptions';

/**
 * Handles Backtrace Metrics.
 */
export class BacktraceMetrics {
  private readonly universe: string;
  private readonly token: string;
  private readonly hostname: string;
  // Thirty minutes in milliseconds.
  private readonly persistenceInterval: number = 1800000;

  // One minutes in milliseconds.
  private readonly heartbeatInterval: number = 60000;

  private readonly timestamp = currentTimestamp();

  private summedEndpoint: string;
  private uniqueEndpoint: string;

  private sessionId: string;
  private lastActive;

  constructor(
    configuration: IBacktraceClientOptions,
    private readonly _backtraceApi: BacktraceApi,
    private readonly attributeProvider: () => object,
  ) {
    if (!configuration.endpoint) {
      throw new Error(`Backtrace: missing 'endpoint' option.`);
    }
    const endpointParameters = getEndpointParams(
      configuration.endpoint,
      configuration.token,
    );
    if (!endpointParameters) {
      throw new Error(
        `Invalid Backtrace submission parameters. Cannot create a submission URL to metrics support`,
      );
    }
    const { universe, token } = endpointParameters;

    if (!universe) {
      throw new Error(
        `Backtrace: 'universe' could not be parsed from the endpoint.`,
      );
    }

    if (!token) {
      throw new Error(
        `Backtrace: missing 'token' option or it could not be parsed from the endpoint.`,
      );
    }

    this.universe = universe;
    this.token = token;
    this.hostname =
      configuration.metricsSubmissionUrl ?? 'https://events.backtrace.io';

    this.summedEndpoint = `${this.hostname}/api/summed-events/submit?universe=${this.universe}&token=${this.token}`;
    this.uniqueEndpoint = `${this.hostname}/api/unique-events/submit?universe=${this.universe}&token=${this.token}`;

    // Get current sessionId. If it is not defined, create new session and "Launch Application"
    const currentSessionId = this.getSessionId();
    if (currentSessionId) {
      this.sessionId = currentSessionId;
    } else {
      this.sessionId = this.createNewSession();
      this.sendUniqueEvent();
      // An "application launch" loosely / temporarily means first session creation.
      this.sendSummedEvent('Application Launches');
    }
    this.lastActive = this.getLastActive();

    this.persistSession(); // Create/persist session on construction.

    // Persist session if page is focused on heartbeat interval
    const intervalId: ReturnType<typeof setInterval> | undefined = setInterval(
      () => this.persistIfFocused(),
      this.heartbeatInterval,
    );
  }

  /**
   * Handle persisting of session. When called, will create or manage current session.
   * when appropriate.
   */
  private persistSession(): void {
    if (
      (this.lastActive || this.timestamp) <
      this.timestamp - this.persistenceInterval / SEC_TO_MILLIS
    ) {
      this.createNewSession();
      this.sendUniqueEvent();
    }

    this.setLastActive(this.timestamp); // update lastActive. User is active.
  }

  /**
   * Persist session if page is focused.
   */
  private persistIfFocused(): void {
    if (!document.hidden) {
      this.persistSession();
    }
  }

  /**
   * Send POST to unique-events API endpoint
   */
  public async sendUniqueEvent(): Promise<void> {
    const attributes = this.getEventAttributes();

    const payload = {
      application: attributes.application,
      appversion: attributes['application.version'],
      metadata: {
        dropped_events: 0,
      },
      unique_events: [
        {
          timestamp: currentTimestamp(),
          unique: ['guid'],
          attributes: this.getEventAttributes(),
        },
      ],
    };

    await this._backtraceApi.sendMetrics(this.uniqueEndpoint, payload);
  }

  /**
   * Send POST to summed-events API endpoint
   */
  public async sendSummedEvent(metricGroup: string): Promise<void> {
    const attributes = this.getEventAttributes();

    const payload = {
      application: attributes.application,
      appversion: attributes['application.version'],
      metadata: {
        dropped_events: 0,
      },
      summed_events: [
        {
          timestamp: currentTimestamp(),
          metric_group: metricGroup,
          attributes: this.getEventAttributes(),
        },
      ],
    };

    await this._backtraceApi.sendMetrics(this.summedEndpoint, payload);
  }

  private getEventAttributes(): { [index: string]: any } {
    const clientAttributes = this.attributeProvider() as {
      [index: string]: any;
    };
    const result: { [index: string]: string } = {
      'application.session': this.sessionId,
      'application.version': 'unknown', // This will be overwritten if application.version is provided in clientAtrributes.
    };

    for (const attributeName in clientAttributes) {
      if (
        Object.prototype.hasOwnProperty.call(clientAttributes, attributeName)
      ) {
        const element = clientAttributes[attributeName];
        const elementType = typeof element;

        if (
          elementType === 'string' ||
          elementType === 'boolean' ||
          elementType === 'number'
        ) {
          const attributeValue = element.toString();
          if (attributeValue) {
            result[attributeName] = attributeValue;
          }
        }
      }
    }
    return result;
  }

  /**
   * Create new sessionId and set local sessionId.
   */
  private createNewSession(): string {
    const newSessionId = uuid();
    this.sessionId = newSessionId;
    this.lastActive = this.timestamp;
    localStorage.setItem('sessionId', newSessionId);
    this.setLastActive(this.timestamp);
    return newSessionId;
  }

  /**
   * Get stored sessionId
   */
  private getSessionId(): string | undefined {
    return localStorage.getItem('sessionId') || undefined;
  }

  /**
   * Get stored time since last page navigation or current time
   */
  private getLastActive(): number | undefined {
    const lastActiveStr = localStorage.getItem('lastActive');
    return lastActiveStr ? parseInt(lastActiveStr, 10) : undefined;
  }

  /**
   * Set time to localStorage "lastActive" and class variable `lastActive`.
   * @param time Integer seconds since epoch
   */
  private setLastActive(time = this.timestamp): void {
    this.lastActive = time;
    localStorage.setItem('lastActive', time.toString());
  }
}
