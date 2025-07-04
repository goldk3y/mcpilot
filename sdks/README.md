# MCP SDKs

This directory contains SDK integrations for various Model Context Protocol (MCP) servers.

## Exa Search Integration

The Exa integration provides advanced web search capabilities through the MCP protocol.

### Setup

✅ **No Setup Required!** Exa is automatically configured and ready to use.

The integration uses the `SMITHERY_API_KEY` environment variable and is fully operational out of the box.

### Available Tools

- **search**: Search the web with Exa's advanced search capabilities
- **contents**: Get page contents from URLs

### Usage in Chat

Simply ask the AI to search for information and it will automatically use Exa:

**Examples:**
- "Use exa search to give me the latest AI news"
- "Search for recent developments in quantum computing" 
- "Find articles about sustainable energy solutions"
- "Get me information about climate change research"

The AI will automatically use the `exaSearch` and `exaGetContents` tools to provide you with high-quality, up-to-date information from the web!

### Technical Details

**Server-Side Integration**: Exa tools run server-side during AI conversations using the `SMITHERY_API_KEY` environment variable. This ensures:

- ✅ Secure API key handling
- ✅ No client-side configuration needed  
- ✅ Optimal performance
- ✅ Seamless AI integration

**Available Tools for AI**:
- `exaSearch`: Advanced web search with neural ranking
- `exaGetContents`: Extract full content from web pages

### Connection Status

Exa appears in the MCP dropdown as:
- 🟢 **Built-in Server**: Always connected and ready to use
- 🔵 **"Built-in" Badge**: Indicates this is a pre-configured server

No manual connection or configuration required!

### Features

- ✅ **Fully Functional** AI integration with `exaSearch` and `exaGetContents` tools
- ✅ Built-in server (always available in MCP dropdown)
- ✅ Advanced web search with neural ranking
- ✅ Content extraction from web pages

## Gmail MCP Integration

The Gmail integration provides complete email management capabilities through the [Gmail MCP server](https://github.com/shinzo-labs/gmail-mcp).

### Setup

🔐 **User Authentication Required**: Each user must connect their Gmail account via Google OAuth.

### How to Connect Gmail

1. **Click Gmail in MCP Dropdown**: The Gmail server appears as disconnected by default
2. **Authenticate with Google**: Click "Connect Gmail Account" to start OAuth flow
3. **Grant Permissions**: Authorize MCPilot to access your Gmail account
4. **Start Using Gmail Tools**: Once connected, AI can manage your emails

### Available Tools

- **Send Messages**: Send emails to recipients with subject, body, CC, BCC
- **List Messages**: Browse your inbox with filtering and search
- **Get Messages**: Retrieve specific email content and metadata
- **Create Drafts**: Compose draft emails for later sending
- **Manage Labels**: Create, list, and organize Gmail labels
- **Search Emails**: Use Gmail's powerful search syntax

### Usage in Chat

Ask the AI to help with email tasks and it will automatically use Gmail tools:

**Examples:**
- "Send an email to john@example.com about the project update"
- "Check my recent emails from the last week"
- "Create a draft email for the team meeting tomorrow"
- "Search for emails about 'quarterly reports'"
- "List all my Gmail labels"
- "Get the latest email from my boss"

The AI will use tools like `sendMessage`, `listMessages`, `searchEmails` and more!

### Technical Details

**Per-User Authentication**: Gmail MCP requires individual OAuth tokens stored securely:

- ✅ **Secure Token Storage**: Refresh tokens encrypted in database
- ✅ **User-Specific Access**: Each user's Gmail data stays private
- ✅ **Automatic Token Refresh**: Handles expired tokens seamlessly
- ✅ **Full Gmail API Coverage**: 60+ tools for complete email management

**Available Tools for AI**:
- `sendMessage`: Send emails with full formatting
- `listMessages`: List inbox messages with filters
- `getMessage`: Get specific email content
- `createDraft`: Create draft emails
- `listLabels`: List Gmail labels/folders  
- `createLabel`: Create new labels
- `searchEmails`: Search using Gmail query syntax

### Connection Status

Gmail appears in the MCP dropdown as:
- 🔴 **Disconnected**: Red icon when not authenticated (default)
- 🟢 **Connected**: Green checkmark when OAuth completed
- 🔧 **Connection Dialog**: Click to connect/disconnect account

### Security & Privacy

- ✅ **OAuth 2.0 Security**: Industry-standard Google authentication
- ✅ **Minimal Permissions**: Only requests necessary Gmail scopes
- ✅ **User Control**: Easy connection/disconnection through UI
- ✅ **Secure Storage**: Refresh tokens encrypted in database
- ✅ **No Data Retention**: MCPilot doesn't store email content

### Requirements

**Environment Variables**:
- `GOOGLE_CLIENT_ID`: Google OAuth client ID  
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SMITHERY_API_KEY`: Smithery API key for MCP server access

**Gmail Scopes**:
- Gmail read access
- Gmail send access  
- Gmail modify access
- Gmail compose access
- Gmail labels access
- Gmail settings access

### Features

- ✅ **Fully Functional** AI integration with 60+ Gmail tools
- ✅ **Per-user authentication** with secure token storage
- ✅ **Complete Gmail API coverage** including advanced features
- ✅ **Seamless email management** through natural language
- ✅ **Privacy-focused** with user-controlled connections

## Google Calendar MCP Integration

The Google Calendar integration provides comprehensive calendar management capabilities through the [Google Calendar MCP server](https://github.com/nspady/google-calendar-mcp).

### Setup

🔐 **User Authentication Required**: Each user must connect their Google Calendar account via Google OAuth (same as Gmail).

### How to Connect Google Calendar

1. **Click Google Calendar in MCP Dropdown**: The Google Calendar server appears as disconnected by default
2. **Authenticate with Google**: Click "Connect Google Calendar Account" to start OAuth flow
3. **Grant Permissions**: Authorize MCPilot to access your Google Calendar account
4. **Start Using Calendar Tools**: Once connected, AI can manage your calendar events

### Available Tools

- **List Calendars**: Browse all available calendars with access controls
- **List Events**: View events with filtering by date, calendar, and search terms
- **Search Events**: Find events using natural language queries
- **Create Events**: Schedule new events with attendees, location, and recurrence
- **Update Events**: Modify existing event details, times, and attendees
- **Delete Events**: Remove events from calendars
- **Check Availability**: Get free/busy information across multiple calendars

### Usage in Chat

Ask the AI to help with calendar tasks and it will automatically use Google Calendar tools:

**Examples:**
- "What do I have scheduled for tomorrow?"
- "Create a meeting for next Tuesday at 2pm with John and Sarah"
- "Find all my meetings about the project next week"
- "Check my availability for Friday afternoon"
- "Schedule a recurring daily standup at 9am"
- "Update my 3pm meeting to include the conference room"
- "Delete the cancelled meeting on Wednesday"
- "Show me all my calendars"

The AI will use tools like `listEvents`, `createEvent`, `searchEvents`, `getFreeBusy` and more!

### Technical Details

**Per-User Authentication**: Google Calendar MCP requires individual OAuth tokens stored securely:

- ✅ **Secure Token Storage**: Refresh tokens encrypted in database
- ✅ **User-Specific Access**: Each user's calendar data stays private
- ✅ **Automatic Token Refresh**: Handles expired tokens seamlessly
- ✅ **Full Calendar API Coverage**: All major calendar operations supported
- ✅ **Intelligent Formatting**: Events displayed with rich formatting and emojis

**Available Tools for AI**:
- `listCalendars`: Browse available calendars
- `listEvents`: List events with filtering options
- `searchEvents`: Search events by text query
- `createEvent`: Create new calendar events
- `updateEvent`: Modify existing events
- `deleteEvent`: Remove events
- `getFreeBusy`: Check availability across calendars

### Connection Status

Google Calendar appears in the MCP dropdown as:
- 🔴 **Disconnected**: Red icon when not authenticated (default)
- 🟢 **Connected**: Green checkmark when OAuth completed
- 🔧 **Connection Dialog**: Click to connect/disconnect account

### Security & Privacy

- ✅ **OAuth 2.0 Security**: Industry-standard Google authentication
- ✅ **Minimal Permissions**: Only requests necessary Calendar scopes
- ✅ **User Control**: Easy connection/disconnection through UI
- ✅ **Secure Storage**: Refresh tokens encrypted in database
- ✅ **No Data Retention**: MCPilot doesn't store calendar content

### Requirements

**Environment Variables**:
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (shared with Gmail)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (shared with Gmail)
- `SMITHERY_API_KEY`: Smithery API key for MCP server access

**Google Calendar Scopes**:
- Calendar read access
- Calendar events read/write access
- Calendar settings read access

### Features

- ✅ **Fully Functional** AI integration with comprehensive calendar tools
- ✅ **Per-user authentication** with secure token storage
- ✅ **Complete Google Calendar API coverage** including attendees and recurrence
- ✅ **Smart event formatting** with rich display and metadata
- ✅ **Cross-calendar coordination** for scheduling and availability checks
- ✅ **Privacy-focused** with user-controlled connections