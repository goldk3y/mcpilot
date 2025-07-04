export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  accessRole?: string;
  selected?: boolean;
  primary?: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    email: string;
    name?: string;
  };
  expiresAt?: string;
}

export interface FreeBusyQuery {
  timeMin: string;
  timeMax: string;
  items: Array<{ id: string }>;
}

export interface FreeBusyResponse {
  calendars: Record<string, {
    busy: Array<{
      start: string;
      end: string;
    }>;
  }>;
}

export class GoogleCalendarService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private refreshToken?: string;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    refreshToken?: string;
  }) {
    this.baseUrl = 'https://server.smithery.ai/@goldk3y/google-calendar-mcp';
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri || 'http://localhost:3000/api/auth/google-calendar';
    this.refreshToken = config.refreshToken;
  }

  private async makeRequest(tool: string, args: any = {}) {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: tool,
          arguments: {
            ...args,
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            redirectUri: this.redirectUri,
            ...(this.refreshToken && { refreshToken: this.refreshToken }),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Google Calendar tool error: ${data.error.message || data.error}`);
    }

    return data.result?.content?.[0]?.text || data.result;
  }

  // OAuth Methods
  async generateOAuthUrl(): Promise<string> {
    const result = await this.makeRequest('generate_oauth_url');
    return typeof result === 'string' ? result : result.url;
  }

  async exchangeAuthCode(authCode: string): Promise<any> {
    return await this.makeRequest('exchange_auth_code', { code: authCode });
  }

  async checkAuthStatus(): Promise<AuthStatus> {
    return await this.makeRequest('check_auth_status');
  }

  // Calendar Methods
  async listCalendars(): Promise<Calendar[]> {
    return await this.makeRequest('list_calendars');
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    return await this.makeRequest('get_calendar', { calendarId });
  }

  async createCalendar(calendar: {
    summary: string;
    description?: string;
    timeZone?: string;
  }): Promise<Calendar> {
    return await this.makeRequest('create_calendar', calendar);
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    return await this.makeRequest('delete_calendar', { calendarId });
  }

  // Event Methods
  async listEvents(
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      q?: string;
      maxResults?: number;
      orderBy?: 'startTime' | 'updated';
      singleEvents?: boolean;
    }
  ): Promise<CalendarEvent[]> {
    return await this.makeRequest('list_events', { calendarId, ...options });
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    return await this.makeRequest('get_event', { calendarId, eventId });
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<CalendarEvent> {
    return await this.makeRequest('create_event', { calendarId, event });
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    return await this.makeRequest('update_event', { calendarId, eventId, event });
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    return await this.makeRequest('delete_event', { calendarId, eventId });
  }
} 