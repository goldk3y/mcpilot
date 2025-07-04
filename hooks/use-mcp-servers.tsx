'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type MCPServer = {
  qualifiedName: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  isConnected: boolean;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
};

interface MCPContextType {
  servers: MCPServer[];
  toggleServer: (qualifiedName: string) => void;
  isLoading: boolean;
  error: string | null;
}

const MCPContext = createContext<MCPContextType | null>(null);

const STORAGE_KEY = 'mcp-connected-servers';

// Fallback servers in case API is unavailable
const FALLBACK_SERVERS: Record<string, Omit<MCPServer, 'isConnected'>> = {
  'exa': {
    qualifiedName: 'exa',
    displayName: 'Exa Search',
    description: 'Advanced web search and content discovery powered by Exa API',
    iconUrl: 'https://exa.ai/favicon.ico',
    tools: [
      {
        name: 'web_search_exa',
        description: 'Search the web using Exa AI',
        inputSchema: {},
      },
      {
        name: 'crawling_exa',
        description: 'Extract content from URLs',
        inputSchema: {},
      },
      {
        name: 'research_paper_search_exa',
        description: 'Search for academic papers and research',
        inputSchema: {},
      },
      {
        name: 'company_research_exa',
        description: 'Research companies and organizations',
        inputSchema: {},
      },
      {
        name: 'competitor_finder_exa',
        description: 'Find competitors for businesses',
        inputSchema: {},
      },
      {
        name: 'linkedin_search_exa',
        description: 'Search LinkedIn profiles and companies',
        inputSchema: {},
      },
      {
        name: 'wikipedia_search_exa',
        description: 'Search Wikipedia articles',
        inputSchema: {},
      },
      {
        name: 'github_search_exa',
        description: 'Search GitHub repositories and code',
        inputSchema: {},
      },
    ],
  },
  '@shinzo-labs/gmail-mcp': {
    qualifiedName: '@shinzo-labs/gmail-mcp',
    displayName: 'Gmail MCP',
    description: 'Manage your emails effortlessly with 60+ tools for drafting, sending, retrieving, and organizing messages. Streamline your email workflow with complete Gmail API coverage, including label and thread management.',
    iconUrl: 'https://icons.duckduckgo.com/ip3/developers.google.com.ico',
    tools: [
      {
        name: 'send_message',
        description: 'Send an email message to specified recipients',
        inputSchema: {},
      },
      {
        name: 'list_messages',
        description: 'List messages in the user\'s mailbox with optional filtering',
        inputSchema: {},
      },
      {
        name: 'get_message',
        description: 'Get a specific message by ID with format options',
        inputSchema: {},
      },
      {
        name: 'create_draft',
        description: 'Create a draft email in Gmail',
        inputSchema: {},
      },
      {
        name: 'send_draft',
        description: 'Send an existing draft',
        inputSchema: {},
      },
      {
        name: 'list_labels',
        description: 'List all labels in the user\'s mailbox',
        inputSchema: {},
      },
      {
        name: 'create_label',
        description: 'Create a new label',
        inputSchema: {},
      },
      {
        name: 'search_emails',
        description: 'Search emails with Gmail query syntax',
        inputSchema: {},
      },
    ],
  },

  '@goldk3y/google-calendar-mcp': {
    qualifiedName: '@goldk3y/google-calendar-mcp',
    displayName: 'Google Calendar Integration Server',
    description: 'Enable seamless interaction with Google Calendar through a secure and comprehensive MCP server. Manage calendars and events with full support for OAuth2 authentication, event details, and search capabilities.',
    iconUrl: 'https://spjawbfpwezjfmicopsl.supabase.co/storage/v1/object/public/server-icons/b0570bf4-cae7-4d26-bffe-f892a887aa16.svg',
    tools: [
      {
        name: 'generate_oauth_url',
        description: 'Generate OAuth2 authorization URL for user to grant calendar access',
        inputSchema: {},
      },
      {
        name: 'exchange_auth_code',
        description: 'Exchange authorization code for access and refresh tokens',
        inputSchema: {},
      },
      {
        name: 'check_auth_status',
        description: 'Check the current authentication status and token information',
        inputSchema: {},
      },
      {
        name: 'list_calendars',
        description: 'List all calendars accessible to the authenticated user',
        inputSchema: {},
      },
      {
        name: 'get_calendar',
        description: 'Get detailed information about a specific calendar',
        inputSchema: {},
      },
      {
        name: 'create_calendar',
        description: 'Create a new calendar',
        inputSchema: {},
      },
      {
        name: 'delete_calendar',
        description: 'Delete a calendar',
        inputSchema: {},
      },
      {
        name: 'list_events',
        description: 'List events from a calendar within a specified time range',
        inputSchema: {},
      },
      {
        name: 'get_event',
        description: 'Get detailed information about a specific event',
        inputSchema: {},
      },
      {
        name: 'create_event',
        description: 'Create a new calendar event',
        inputSchema: {},
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event',
        inputSchema: {},
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event',
        inputSchema: {},
      },
    ],
  }
};

async function fetchMCPServers(): Promise<Omit<MCPServer, 'isConnected'>[]> {
  try {
    const response = await fetch('/api/mcp-servers', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MCP servers: ${response.status}`);
    }

    const data = await response.json();
    return data.servers || [];
  } catch (error) {
    console.warn('Failed to fetch servers from API, using fallback servers:', error);
    return Object.values(FALLBACK_SERVERS);
  }
}

export function MCPProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check actual Gmail connection status from server
  const checkGmailConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/gmail/status', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.connected || false;
      }
    } catch (error) {
      console.warn('Failed to check Gmail connection status:', error);
    }
    return false;
  }, []);

  // Check actual Google Calendar connection status from server
  const checkGoogleCalendarConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/google-calendar/status', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.connected || false;
      }
    } catch (error) {
      console.warn('Failed to check Google Calendar connection status:', error);
    }
    return false;
  }, []);

  // Load servers function
  const loadServers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedServers = await fetchMCPServers();
      
      // Get stored connection preferences
      const storedConnections = localStorage.getItem(STORAGE_KEY);
      let connectedServers: string[] = [];
      let isFirstTimeUser = !storedConnections;
      
      if (storedConnections) {
        try {
          connectedServers = JSON.parse(storedConnections);
        } catch (error) {
          console.warn('Failed to parse stored connections:', error);
          isFirstTimeUser = true;
        }
      }
      
      // For first-time users, connect Exa by default but not Gmail
      if (isFirstTimeUser) {
        console.log('First-time user detected, connecting Exa by default');
        connectedServers = ['exa']; // Only Exa connected by default
        localStorage.setItem(STORAGE_KEY, JSON.stringify(connectedServers));
      }
      
      // Check actual Gmail and Google Calendar connection status from server
      const gmailConnected = await checkGmailConnection();
      const googleCalendarConnected = await checkGoogleCalendarConnection();
      
      // Map servers with connection status
      const serversWithStatus: MCPServer[] = fetchedServers.map(server => {
        if (server.qualifiedName === '@shinzo-labs/gmail-mcp') {
          // Use actual connection status from server for Gmail
          return { ...server, isConnected: gmailConnected };
        } else if (server.qualifiedName === '@goldk3y/google-calendar-mcp') {
          // Use actual connection status from server for Google Calendar
          return { ...server, isConnected: googleCalendarConnected };
        } else {
          // Use localStorage for other servers
          return { ...server, isConnected: connectedServers.includes(server.qualifiedName) };
        }
      });
      
      setServers(serversWithStatus);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      setError('Failed to load MCP servers');
      
      // Use fallback servers with proper connection status
      const gmailConnected = await checkGmailConnection();
      const googleCalendarConnected = await checkGoogleCalendarConnection();
      
      const fallbackWithStatus = Object.values(FALLBACK_SERVERS).map(server => {
        if (server.qualifiedName === '@shinzo-labs/gmail-mcp') {
          return { ...server, isConnected: gmailConnected };
        } else if (server.qualifiedName === '@goldk3y/google-calendar-mcp') {
          return { ...server, isConnected: googleCalendarConnected };
        } else {
          return { ...server, isConnected: server.qualifiedName === 'exa' }; // Only Exa connected by default
        }
      });
      setServers(fallbackWithStatus);
    } finally {
      setIsLoading(false);
    }
  }, [checkGmailConnection, checkGoogleCalendarConnection]);

  // Check if returning from OAuth (Gmail or Google Calendar)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true' || urlParams.get('google_calendar_connected') === 'true') {
      // OAuth was just completed, refresh the page to clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // Force a re-fetch of server status from the API
      loadServers();
    }
  }, [loadServers]);

  // Fetch servers from our API route
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const toggleServer = useCallback((qualifiedName: string) => {
    setServers(currentServers => {
      const updatedServers = currentServers.map(server => {
        if (server.qualifiedName === qualifiedName) {
          return { ...server, isConnected: !server.isConnected };
        }
        return server;
      });

      // Update localStorage
      const connectedServerNames = updatedServers
        .filter(server => server.isConnected)
        .map(server => server.qualifiedName);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connectedServerNames));
      
      return updatedServers;
    });
  }, []);

  const contextValue: MCPContextType = {
    servers,
    toggleServer,
    isLoading,
    error,
  };

  return <MCPContext.Provider value={contextValue}>{children}</MCPContext.Provider>;
}

export function useMCPServers() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCPServers must be used within MCPProvider');
  }
  return context;
}
