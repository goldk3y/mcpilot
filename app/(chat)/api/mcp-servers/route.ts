import { NextResponse } from 'next/server';

const SMITHERY_REGISTRY_API = 'https://registry.smithery.ai';

// Fallback server data in case API is unavailable
const FALLBACK_SERVERS = [
  {
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
  {
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

  {
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
];

async function fetchServerFromRegistry(qualifiedName: string, apiKey: string) {
  try {
    const response = await fetch(`${SMITHERY_REGISTRY_API}/servers/${encodeURIComponent(qualifiedName)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch server ${qualifiedName}: ${response.status}`);
    }

    const serverData = await response.json();
    
    // Use shorter descriptions for better UX
    let description = serverData.description;
    if (qualifiedName === 'exa') {
      description = 'Advanced web search and content discovery';
    } else if (qualifiedName === '@shinzo-labs/gmail-mcp') {
      description = 'Send, read, organize emails and manage Gmail settings';
    }
    
    return {
      qualifiedName: serverData.qualifiedName,
      displayName: serverData.displayName,
      description: description,
      iconUrl: serverData.iconUrl,
      tools: serverData.tools || [],
    };
  } catch (error) {
    console.warn(`Failed to fetch server ${qualifiedName} from API:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const smitheryApiKey = process.env.SMITHERY_API_KEY;
    
    if (!smitheryApiKey) {
      console.warn('SMITHERY_API_KEY not found, using fallback servers');
      return NextResponse.json({ servers: FALLBACK_SERVERS });
    }

    // Fetch specific servers that we want to include
    const serverNames = ['exa', '@shinzo-labs/gmail-mcp', '@goldk3y/google-calendar-mcp'];
    const serverPromises = serverNames.map(name => 
      fetchServerFromRegistry(name, smitheryApiKey)
    );

    const fetchedServers = await Promise.all(serverPromises);
    
    // Filter out failed fetches and use fallbacks where needed
    const servers = fetchedServers.map((server, index) => {
      if (server) {
        return server;
      }
      // Use fallback for failed fetches
      const fallbackServer = FALLBACK_SERVERS.find(
        fs => fs.qualifiedName === serverNames[index]
      );
      return fallbackServer || null;
    }).filter(Boolean);

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json({ servers: FALLBACK_SERVERS });
  }
} 