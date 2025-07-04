import { tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getUserGoogleCalendarToken } from '@/lib/db/queries';

/**
 * Creates a URL to connect to the Smithery MCP server.
 */
function createSmitheryUrl(baseUrl: string, options?: { config?: any; apiKey?: string; profile?: string }): URL {
  const url = new URL(`${baseUrl}/mcp`);
  
  if (options?.config) {
    const param = Buffer.from(JSON.stringify(options.config)).toString("base64");
    url.searchParams.set("config", param);
  }
  
  if (options?.apiKey) {
    url.searchParams.set("api_key", options.apiKey);
  }
  
  if (options?.profile) {
    url.searchParams.set("profile", options.profile);
  }
  
  return url;
}

// Response parsing functions to clean up MCP responses
function parseEventCreationResponse(rawResponse: string, originalArgs?: any): string {
  try {
    // Extract title from the response
    const titleMatch = rawResponse.match(/## ([^\n]+)/);
    
    if (titleMatch) {
      const title = titleMatch[1];
      
      // Use original request times if available (more reliable than MCP server's response)
      let startTime = 'Unknown time';
      let endTime = 'Unknown time';
      
      if (originalArgs?.start_time && originalArgs?.end_time) {
        try {
          // Parse the ISO datetime with timezone
          const startDate = new Date(originalArgs.start_time);
          const endDate = new Date(originalArgs.end_time);
          
          // Format in user's local time
          const timeOptions: Intl.DateTimeFormatOptions = {
            timeZone: originalArgs.time_zone || 'America/Los_Angeles',
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          };
          
          startTime = startDate.toLocaleString('en-US', timeOptions);
          endTime = endDate.toLocaleString('en-US', timeOptions);
        } catch (error) {
          console.warn('Failed to parse original times:', error);
          // Fallback to extracting from response
          const startMatch = rawResponse.match(/\*\*Start:\*\* ([^\n]+)/);
          const endMatch = rawResponse.match(/\*\*End:\*\* ([^\n]+)/);
          startTime = startMatch ? startMatch[1] : 'Unknown time';
          endTime = endMatch ? endMatch[1] : 'Unknown time';
        }
      }
      
      // Return properly formatted response (not literal string with \n)
      return `✅ **Event Created Successfully**

**${title}**
- **When:** ${startTime} - ${endTime}

The event has been added to your Google Calendar.`;
    }
  } catch (error) {
    console.warn('Failed to parse event creation response:', error);
  }
  
  // Fallback to simple success message
  return `✅ Event created successfully and added to your Google Calendar.`;
}

function parseEventListResponse(rawResponse: string): string {
  try {
    // If no events found
    if (rawResponse.includes('(0 found)')) {
      return "📅 No events found for the specified time range.";
    }
    
    // Extract event count
    const countMatch = rawResponse.match(/\((\d+) found\)/);
    const eventCount = countMatch ? countMatch[1] : 'Unknown';
    
    // Extract time range if present
    const rangeMatch = rawResponse.match(/Time Range:\*\* ([^\n]+)/);
    const timeRange = rangeMatch ? rangeMatch[1] : '';
    
    // Clean up the response by removing technical details
    const cleanResponse = rawResponse
      .replace(/# 📅 Calendar Events.*?\n---\n/s, '') // Remove header
      .replace(/\*\*Event ID:\*\* `[^`]+`\n/g, '') // Remove event IDs
      .replace(/\*\*\[View in Google Calendar\]\([^)]+\)\*\*\n/g, '') // Remove calendar links
      .replace(/---\n\*\*💡 Tip:.*$/s, '') // Remove tips
      .replace(/\n{3,}/g, '\n\n'); // Clean up extra newlines
    
    if (timeRange) {
      return `📅 **Found ${eventCount} event(s)**

${cleanResponse}`;
    } else {
      return `📅 **Your Calendar Events**

${cleanResponse}`;
    }
  } catch (error) {
    console.warn('Failed to parse event list response:', error);
  }
  
  // Fallback
  return rawResponse.replace(/\*\*Event ID:\*\* `[^`]+`\n/g, '').replace(/\*\*\[View in Google Calendar\]\([^)]+\)\*\*/g, '');
}

function parseCalendarListResponse(rawResponse: string): string {
  try {
    // Clean up the response by removing technical details
    const cleanResponse = rawResponse
      .replace(/# 📅 User Calendars.*?\n/s, '📅 **Your Calendars**\n\n') // Simplify header
      .replace(/\*\*ID:\*\* `[^`]+`\n/g, '') // Remove calendar IDs
      .replace(/\*\*Color:\*\* Color ID \d+ \| /g, '') // Remove color IDs
      .replace(/\*\*Default Reminders:\*\*\n[^#]*/g, '') // Remove reminder details
      .replace(/---\n\*\*💡 Tip:.*$/s, '') // Remove tips
      .replace(/\n{3,}/g, '\n\n'); // Clean up extra newlines
    
    return cleanResponse;
  } catch (error) {
    console.warn('Failed to parse calendar list response:', error);
  }
  
  return rawResponse;
}

function parseAuthStatusResponse(rawResponse: string): string {
  try {
    if (rawResponse.includes('Fully Authenticated')) {
      return `✅ **Google Calendar Connected**

Your Google Calendar account is successfully connected and ready to use.`;
    }
  } catch (error) {
    console.warn('Failed to parse auth status response:', error);
  }
  
  return rawResponse;
}

// Helper function to execute Google Calendar MCP tools with response parsing
async function executeGoogleCalendarTool(
  toolName: string, 
  args: any, 
  userId: string
): Promise<string> {
  console.log(`🗓️ Executing Google Calendar tool: ${toolName} with args:`, JSON.stringify(args, null, 2));
  
  const smitheryApiKey = process.env.SMITHERY_API_KEY;
  
  if (!smitheryApiKey) {
    throw new Error('SMITHERY_API_KEY environment variable is not set');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  // Get the refresh token for this user
  const refreshToken = await getUserGoogleCalendarToken(userId);
  
  if (!refreshToken) {
    throw new Error('User is not authenticated with Google Calendar. Please connect your Google Calendar account first.');
  }

  console.log(`🗓️ Using refresh token for user ${userId}: ${refreshToken.substring(0, 10)}...`);

  try {
    const serverUrl = createSmitheryUrl(
      "https://server.smithery.ai/@goldk3y/google-calendar-mcp", 
      { 
        config: { 
          clientId,
          clientSecret,
          redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google-calendar`,
          refreshToken,
        }, 
        apiKey: smitheryApiKey
      }
    );

    console.log(`🗓️ Connecting to Google Calendar MCP server at: ${serverUrl}`);

    const transport = new StreamableHTTPClientTransport(serverUrl);
    const client = new Client({
      name: `MCPilot Google Calendar ${toolName} Client`,
      version: "1.0.0"
    });

    await client.connect(transport);
    console.log(`🗓️ Connected to Google Calendar MCP server successfully`);

    const result = await client.callTool({ name: toolName, arguments: args });
    console.log(`🗓️ Google Calendar tool ${toolName} result:`, JSON.stringify(result, null, 2));
    
    await client.close();
    
    let resultText: string;
    if (result.content && Array.isArray(result.content) && result.content[0]?.type === 'text') {
      resultText = result.content[0].text;
    } else {
      resultText = JSON.stringify(result.content, null, 2);
    }
    
    // Parse and clean up the response based on tool type
    let cleanedResponse: string;
    switch (toolName) {
      case 'create_event':
        cleanedResponse = parseEventCreationResponse(resultText, args);
        break;
      case 'list_events':
        cleanedResponse = parseEventListResponse(resultText);
        break;
      case 'list_calendars':
        cleanedResponse = parseCalendarListResponse(resultText);
        break;
      case 'check_auth_status':
        cleanedResponse = parseAuthStatusResponse(resultText);
        break;
      default:
        cleanedResponse = resultText;
    }
    
    console.log(`🗓️ Google Calendar tool ${toolName} returning cleaned result: ${cleanedResponse}`);
    return cleanedResponse;
    
  } catch (error) {
    console.error(`🗓️ Google Calendar tool ${toolName} failed:`, error);
    throw error;
  }
}

// Google Calendar tool factories that require userId
export const checkCalendarAuthStatus = (userId: string) => tool({
  description: 'Check Google Calendar authentication status and user information',
  parameters: z.object({}),
  execute: async () => {
    console.log('🗓️ Google Calendar checkCalendarAuthStatus tool called');
    return await executeGoogleCalendarTool('check_auth_status', {}, userId);
  },
});

export const listCalendars = (userId: string) => tool({
  description: 'List all Google calendars accessible to the authenticated user',
  parameters: z.object({}),
  execute: async () => {
    console.log('🗓️ Google Calendar listCalendars tool called');
    return await executeGoogleCalendarTool('list_calendars', {}, userId);
  },
});

export const getCalendar = tool({
  description: 'Get detailed information about a specific Google calendar',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar to retrieve'),
  }),
  execute: async ({ calendarId }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'get_calendar',
      arguments: { calendarId },
    };
  },
});

export const createCalendar = tool({
  description: 'Create a new Google calendar',
  parameters: z.object({
    summary: z.string().describe('The name/title of the calendar'),
    description: z.string().optional().describe('Description of the calendar'),
    timeZone: z.string().optional().describe('Time zone for the calendar (e.g., "America/New_York")'),
  }),
  execute: async ({ summary, description, timeZone }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'create_calendar',
      arguments: { summary, description, timeZone },
    };
  },
});

export const deleteCalendar = tool({
  description: 'Delete a Google calendar',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar to delete'),
  }),
  execute: async ({ calendarId }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'delete_calendar',
      arguments: { calendarId },
    };
  },
});

// Event Management Tools
export const listEvents = (userId: string) => tool({
  description: 'List events from a Google calendar within a specified time range',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar to list events from'),
    timeMin: z.string().optional().describe('Lower bound for event start time (ISO 8601)'),
    timeMax: z.string().optional().describe('Upper bound for event start time (ISO 8601)'),
    q: z.string().optional().describe('Free text search terms to find events'),
    maxResults: z.number().optional().describe('Maximum number of events to return'),
    orderBy: z.enum(['startTime', 'updated']).optional().describe('How to order the events'),
    singleEvents: z.boolean().optional().describe('Whether to expand recurring events'),
  }),
  execute: async ({ calendarId, timeMin, timeMax, q, maxResults, orderBy, singleEvents }) => {
    console.log('🗓️ Google Calendar listEvents tool called with params:', { calendarId, timeMin, timeMax, q, maxResults, orderBy, singleEvents });
    
    // Convert parameters to match MCP server expectations
    const mcpArgs: any = {
      calendar_id: calendarId,
    };
    
    if (timeMin) mcpArgs.time_min = timeMin;
    if (timeMax) mcpArgs.time_max = timeMax;
    if (q) mcpArgs.q = q;
    if (maxResults) mcpArgs.max_results = maxResults;
    if (orderBy) mcpArgs.order_by = orderBy;
    if (singleEvents !== undefined) mcpArgs.single_events = singleEvents;
    
    console.log('🗓️ Google Calendar listEvents sending MCP args:', JSON.stringify(mcpArgs, null, 2));
    
    return await executeGoogleCalendarTool('list_events', mcpArgs, userId);
  },
});

export const getEvent = tool({
  description: 'Get detailed information about a specific calendar event',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar containing the event'),
    eventId: z.string().describe('The ID of the event to retrieve'),
  }),
  execute: async ({ calendarId, eventId }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'get_event',
      arguments: { calendarId, eventId },
    };
  },
});

export const createEvent = (userId: string) => tool({
  description: 'Create a new calendar event in Google Calendar',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar to create the event in'),
    summary: z.string().describe('The title/summary of the event'),
    description: z.string().optional().describe('Description of the event'),
    location: z.string().optional().describe('Location of the event'),
    startDateTime: z.string().optional().describe('Start date and time (ISO 8601 format)'),
    endDateTime: z.string().optional().describe('End date and time (ISO 8601 format)'),
    startDate: z.string().optional().describe('Start date for all-day events (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Time zone for the event'),
    attendees: z.array(z.object({
      email: z.string(),
      displayName: z.string().optional(),
    })).optional().describe('List of attendees'),
    reminders: z.object({
      useDefault: z.boolean().optional(),
      overrides: z.array(z.object({
        method: z.enum(['email', 'popup']),
        minutes: z.number(),
      })).optional(),
    }).optional().describe('Reminder settings'),
  }),
  execute: async ({ 
    calendarId, 
    summary, 
    description, 
    location, 
    startDateTime, 
    endDateTime,
    startDate,
    endDate,
    timeZone, 
    attendees, 
    reminders 
  }) => {
    console.log('🗓️ Google Calendar createEvent tool called with params:', {
      calendarId, 
      summary, 
      description, 
      location, 
      startDateTime, 
      endDateTime,
      startDate,
      endDate,
      timeZone, 
      attendees, 
      reminders 
    });

    const event: any = {
      summary,
      description,
      location,
      attendees,
      reminders,
    };

    // Handle start/end times
    if (startDateTime && endDateTime) {
      event.start = { dateTime: startDateTime, timeZone };
      event.end = { dateTime: endDateTime, timeZone };
    } else if (startDate && endDate) {
      event.start = { date: startDate };
      event.end = { date: endDate };
    }

    console.log('🗓️ Google Calendar createEvent prepared event object:', JSON.stringify(event, null, 2));

    // The @goldk3y/google-calendar-mcp server expects different parameter names
    // Based on the error, it expects: summary, start_time, end_time as top-level parameters
    const mcpArgs: any = {
      calendar_id: calendarId,
      summary: event.summary,
    };

    // Default timezone if none provided
    const defaultTimeZone = timeZone || 'America/New_York';

    // Handle start/end times - convert to the format the MCP server expects
    if (event.start?.dateTime) {
      // Ensure timezone is included in the datetime string
      let startTime = event.start.dateTime;
      if (!startTime.includes('T') || (!startTime.includes('+') && !startTime.includes('Z') && !startTime.endsWith('00'))) {
        // If datetime doesn't have timezone info, add it
        if (!startTime.includes('T')) {
          startTime += 'T00:00:00';
        }
        // Add timezone offset or use the time_zone parameter
        mcpArgs.start_time = startTime;
        mcpArgs.time_zone = defaultTimeZone;
      } else {
        mcpArgs.start_time = startTime;
      }
    } else if (event.start?.date) {
      mcpArgs.start_date = event.start.date;
    }

    if (event.end?.dateTime) {
      // Ensure timezone is included in the datetime string
      let endTime = event.end.dateTime;
      if (!endTime.includes('T') || (!endTime.includes('+') && !endTime.includes('Z') && !endTime.endsWith('00'))) {
        // If datetime doesn't have timezone info, add it
        if (!endTime.includes('T')) {
          endTime += 'T00:00:00';
        }
        // Add timezone offset or use the time_zone parameter
        mcpArgs.end_time = endTime;
        if (!mcpArgs.time_zone) {
          mcpArgs.time_zone = defaultTimeZone;
        }
      } else {
        mcpArgs.end_time = endTime;
      }
    } else if (event.end?.date) {
      mcpArgs.end_date = event.end.date;
    }

    // Add optional parameters if provided
    if (event.description) mcpArgs.description = event.description;
    if (event.location) mcpArgs.location = event.location;
    
    // Convert attendees from objects to email strings
    if (event.attendees && event.attendees.length > 0) {
      mcpArgs.attendees = event.attendees.map((attendee: any) => 
        typeof attendee === 'string' ? attendee : attendee.email
      ).filter(Boolean); // Remove any undefined emails
    }
    
    if (event.reminders) mcpArgs.reminders = event.reminders;
    
    // Only set time_zone if not already set in datetime processing above
    if (timeZone && !mcpArgs.time_zone) {
      mcpArgs.time_zone = timeZone;
    }

    console.log('🗓️ Google Calendar createEvent sending MCP args:', JSON.stringify(mcpArgs, null, 2));

    return await executeGoogleCalendarTool('create_event', mcpArgs, userId);
  },
});

export const updateEvent = tool({
  description: 'Update an existing calendar event in Google Calendar',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar containing the event'),
    eventId: z.string().describe('The ID of the event to update'),
    summary: z.string().optional().describe('The title/summary of the event'),
    description: z.string().optional().describe('Description of the event'),
    location: z.string().optional().describe('Location of the event'),
    startDateTime: z.string().optional().describe('Start date and time (ISO 8601 format)'),
    endDateTime: z.string().optional().describe('End date and time (ISO 8601 format)'),
    startDate: z.string().optional().describe('Start date for all-day events (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Time zone for the event'),
    attendees: z.array(z.object({
      email: z.string(),
      displayName: z.string().optional(),
    })).optional().describe('List of attendees'),
    status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().describe('Event status'),
  }),
  execute: async ({ 
    calendarId, 
    eventId,
    summary, 
    description, 
    location, 
    startDateTime, 
    endDateTime,
    startDate,
    endDate,
    timeZone, 
    attendees,
    status
  }) => {
    const event: any = {
      summary,
      description,
      location,
      attendees,
      status,
    };

    // Handle start/end times
    if (startDateTime && endDateTime) {
      event.start = { dateTime: startDateTime, timeZone };
      event.end = { dateTime: endDateTime, timeZone };
    } else if (startDate && endDate) {
      event.start = { date: startDate };
      event.end = { date: endDate };
    }

    // Remove undefined values
    Object.keys(event).forEach(key => event[key] === undefined && delete event[key]);

    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'update_event',
      arguments: { calendarId, eventId, event },
    };
  },
});

export const deleteEvent = tool({
  description: 'Delete a calendar event from Google Calendar',
  parameters: z.object({
    calendarId: z.string().describe('The ID of the calendar containing the event'),
    eventId: z.string().describe('The ID of the event to delete'),
  }),
  execute: async ({ calendarId, eventId }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'delete_event',
      arguments: { calendarId, eventId },
    };
  },
});

// For OAuth tools that don't need userId (they're static)
export const generateCalendarOAuthUrl = tool({
  description: 'Generate Google Calendar OAuth2 authorization URL for user authentication',
  parameters: z.object({}),
  execute: async () => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'generate_oauth_url',
      arguments: {},
    };
  },
});

export const exchangeCalendarAuthCode = tool({
  description: 'Exchange Google Calendar authorization code for access tokens',
  parameters: z.object({
    code: z.string().describe('Authorization code received from OAuth callback'),
  }),
  execute: async ({ code }) => {
    return {
      type: 'mcp_tool_call',
      server_id: '@goldk3y/google-calendar-mcp',
      tool_name: 'exchange_auth_code',
      arguments: { code },
    };
  },
});

export const debugCalendarConnection = (userId: string) => tool({
  description: 'Debug Google Calendar connection - shows auth status, user email, and available calendars',
  parameters: z.object({}),
  execute: async () => {
    console.log('🗓️ Google Calendar debugCalendarConnection tool called');
    
    try {
      // Get auth status first
      const authResult = await executeGoogleCalendarTool('check_auth_status', {}, userId);
      console.log('🔍 Auth Status Result:', authResult);
      
      // Get list of calendars
      const calendarsResult = await executeGoogleCalendarTool('list_calendars', {}, userId);
      console.log('🔍 Calendars Result:', calendarsResult);
      
      return `**🔍 Google Calendar Debug Information**\n\n**Authentication Status:**\n${authResult}\n\n**Available Calendars:**\n${calendarsResult}`;
      
    } catch (error) {
      console.error('🔍 Debug failed:', error);
      return `Debug failed: ${error}`;
    }
  },
});

// Export tool factory functions
export const googleCalendarTools = {
  generateCalendarOAuthUrl,
  exchangeCalendarAuthCode,
  checkCalendarAuthStatus,
  listCalendars,
  listEvents,
  createEvent,
  debugCalendarConnection,
  // Add more tools here...
}; 