import { tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getUserGmailToken, saveGmailSearchHistory } from '@/lib/db/queries';

// Cache for search results (simple in-memory cache)
const searchCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Schema definitions for Gmail tools
const sendMessageSchema = z.object({
  to: z.array(z.string()).describe('Recipient email addresses'),
  subject: z.string().optional().describe('Email subject (optional)'),
  body: z.string().describe('Email body content'),
  cc: z.array(z.string()).optional().describe('CC email addresses'),
  bcc: z.array(z.string()).optional().describe('BCC email addresses'),
});

const listMessagesSchema = z.object({
  q: z.string().optional().describe('Gmail search query using Gmail query syntax'),
  maxResults: z.number().optional().default(10).describe('Maximum number of messages to return'),
  labelIds: z.array(z.string()).optional().describe('Label IDs to filter by'),
});

const getMessageSchema = z.object({
  id: z.string().describe('Message ID'),
  format: z.enum(['minimal', 'full', 'raw', 'metadata']).optional().default('full').describe('Message format'),
});

const createDraftSchema = z.object({
  to: z.array(z.string()).describe('Recipient email addresses'),
  subject: z.string().optional().describe('Email subject (optional)'),
  body: z.string().describe('Email body content'),
  cc: z.array(z.string()).optional().describe('CC email addresses'),
  bcc: z.array(z.string()).optional().describe('BCC email addresses'),
});

const listLabelsSchema = z.object({
  userId: z.string().optional().default('me').describe('User ID (defaults to authenticated user)'),
});

const createLabelSchema = z.object({
  name: z.string().describe('Label name'),
  messageListVisibility: z.enum(['show', 'hide']).optional().default('show').describe('Visibility in message list'),
  labelListVisibility: z.enum(['labelShow', 'labelHide']).optional().default('labelShow').describe('Visibility in label list'),
});

const searchEmailsSchema = z.object({
  q: z.string().describe('Gmail search query using Gmail query syntax'),
  maxResults: z.number().optional().default(10).describe('Maximum number of emails to return'),
});

// Enhanced search schema with more options
const enhancedSearchSchema = z.object({
  q: z.string().describe('Gmail search query using Gmail query syntax'),
  maxResults: z.number().optional().default(20).describe('Maximum number of emails to return (max 50)'),
  pageToken: z.string().optional().describe('Token for pagination'),
  includeSpamTrash: z.boolean().optional().default(false).describe('Include spam and trash emails'),
  format: z.enum(['minimal', 'full', 'metadata']).optional().default('metadata').describe('Message format detail level'),
  labelIds: z.array(z.string()).optional().describe('Label IDs to filter by'),
});

// Semantic search with natural language understanding
const semanticSearchSchema = z.object({
  naturalQuery: z.string().describe('Natural language search query'),
  maxResults: z.number().optional().default(10).describe('Maximum results'),
  dateRange: z.object({
    start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    end: z.string().optional().describe('End date (YYYY-MM-DD)'),
  }).optional(),
  sender: z.string().optional().describe('Specific sender email or name'),
  hasAttachment: z.boolean().optional().describe('Filter by attachment presence'),
  isUnread: z.boolean().optional().describe('Filter by unread status'),
});

// Enhanced tool execution with retry logic and caching
async function executeGmailToolEnhanced(
  toolName: string, 
  args: any, 
  userId: string,
  options: { useCache?: boolean; retries?: number; timeout?: number } = {}
): Promise<string> {
  const { useCache = true, retries = 2, timeout = 45000 } = options;
  
  // Check cache for search operations
  if (useCache && (toolName === 'list_messages' || toolName === 'search_emails')) {
    const cacheKey = `${userId}:${toolName}:${JSON.stringify(args)}`;
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
  }

  const smitheryApiKey = process.env.SMITHERY_API_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!smitheryApiKey || !clientId || !clientSecret) {
    throw new Error('Gmail configuration missing');
  }

  const refreshToken = await getUserGmailToken(userId);
  if (!refreshToken) {
    throw new Error('Gmail not connected. Please connect your Gmail account first.');
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    
    try {
  const serverUrl = createSmitheryUrl(
    "https://server.smithery.ai/@shinzo-labs/gmail-mcp", 
    { 
      config: { 
        debug: false,
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        REFRESH_TOKEN: refreshToken,
      }, 
      apiKey: smitheryApiKey
    }
  );

  const transport = new StreamableHTTPClientTransport(serverUrl);
  const client = new Client({
        name: `MCPilot Gmail Enhanced ${toolName} Client`,
        version: "2.0.0"
  });

  const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Gmail tool ${toolName} timed out after ${timeout}ms`)), timeout);
  });

  try {
        await Promise.race([client.connect(transport), timeoutPromise]);
    const result = await Promise.race([
      client.callTool({ name: toolName, arguments: args }),
      timeoutPromise
        ]) as any;
        
    await client.close();
    
        let resultText: string;
    if (result.content && Array.isArray(result.content) && result.content[0]?.type === 'text') {
          resultText = result.content[0].text;
        } else {
          resultText = JSON.stringify(result.content, null, 2);
        }

        // Cache successful search results
        if (useCache && (toolName === 'list_messages' || toolName === 'search_emails')) {
          const cacheKey = `${userId}:${toolName}:${JSON.stringify(args)}`;
          searchCache.set(cacheKey, { result: resultText, timestamp: Date.now() });
          
          // Limit cache size
          if (searchCache.size > 100) {
            const oldestKey = searchCache.keys().next().value;
            if (oldestKey) {
              searchCache.delete(oldestKey);
            }
          }
        }
        
        return resultText;
  } catch (error) {
    try {
      await client.close();
    } catch (closeError) {
      // Silently handle close errors
          }
          throw error as Error;
      }
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to execute ${toolName} after ${retries + 1} attempts`);
}

// Legacy executeGmailTool for non-search operations
async function executeGmailTool(toolName: string, args: any, userId: string): Promise<string> {
  return executeGmailToolEnhanced(toolName, args, userId, { useCache: false, retries: 1 });
}

// Convert natural language to Gmail query syntax
function buildGmailQuery(params: {
  naturalQuery?: string;
  dateRange?: { start?: string; end?: string };
  sender?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
}): string {
  const queryParts: string[] = [];
  
  if (params.naturalQuery) {
    queryParts.push(params.naturalQuery);
  }
  
  if (params.dateRange?.start) {
    queryParts.push(`after:${params.dateRange.start}`);
  }
  
  if (params.dateRange?.end) {
    queryParts.push(`before:${params.dateRange.end}`);
  }
  
  if (params.sender) {
    queryParts.push(`from:${params.sender}`);
  }
  
  if (params.hasAttachment) {
    queryParts.push('has:attachment');
  }
  
  if (params.isUnread) {
    queryParts.push('is:unread');
  }
  
  return queryParts.join(' ');
}

// Format email results for better user experience
function formatEmailResults(emailData: string): string {
  try {
    const parsed = JSON.parse(emailData);
    
    if (!parsed || !Array.isArray(parsed.messages)) {
      return emailData; // Return original if parsing fails
    }

    const emails = parsed.messages;
    if (emails.length === 0) {
      return "No emails found matching your search criteria.";
    }

    let formattedResult = `📧 Found ${emails.length} email${emails.length !== 1 ? 's' : ''}:\n\n`;

    emails.forEach((email: any, index: number) => {
      const subject = email.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = email.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
      const date = email.payload?.headers?.find((h: any) => h.name === 'Date')?.value || 'Unknown Date';
      const snippet = email.snippet || '';
      
      // Parse and format date
      let formattedDate = 'Unknown Date';
      try {
        formattedDate = new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        formattedDate = date;
      }

      // Extract just email from "Name <email>" format
      const emailMatch = from.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from;
      const senderName = from.replace(/<[^>]+>/, '').trim() || senderEmail;

      // Determine read status
      const isUnread = email.labelIds?.includes('UNREAD') ? '🔵 ' : '';
      const hasAttachment = email.payload?.parts?.some((part: any) => part.filename) ? '📎 ' : '';

      formattedResult += `${index + 1}. ${isUnread}${hasAttachment}**${subject}**\n`;
      formattedResult += `   📤 From: ${senderName} (${senderEmail})\n`;
      formattedResult += `   📅 Date: ${formattedDate}\n`;
      
      if (snippet) {
        const truncatedSnippet = snippet.length > 100 ? `${snippet.substring(0, 100)}...` : snippet;
        formattedResult += `   💬 Preview: ${truncatedSnippet}\n`;
      }
      
      formattedResult += `   🔗 ID: ${email.id}\n\n`;
    });

    formattedResult += `💡 **Tip**: Ask me to "get the content of email ID [email-id]" to read the full email.`;
    
    return formattedResult;
  } catch (error) {
    // Fallback to original data if formatting fails
    return emailData;
  }
}

// Format email results for better user experience with automatic content fetching
async function formatEmailResultsWithContent(emailData: string, userId: string): Promise<string> {
  try {
    const parsed = JSON.parse(emailData);
    
    if (!parsed || !Array.isArray(parsed.messages)) {
      return emailData; // Return original if parsing fails
    }

    const emails = parsed.messages;
    if (emails.length === 0) {
      return "No emails found matching your search criteria.";
    }

    let formattedResult = `📧 Found ${emails.length} email${emails.length !== 1 ? 's' : ''}:\n\n`;

    // Limit to first 5 emails to avoid overwhelming output and rate limits
    const emailsToProcess = emails.slice(0, 5);
    
    for (let index = 0; index < emailsToProcess.length; index++) {
      const email = emailsToProcess[index];
      
      try {
        // Fetch full email content using the message ID
        const fullEmailData = await executeGmailTool('get_message', { 
          id: email.id, 
          format: 'full' 
        }, userId);
        
        const fullEmail = JSON.parse(fullEmailData);
        
        // Extract email details from full content
        const headers = fullEmail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const to = headers.find((h: any) => h.name === 'To')?.value || 'Unknown Recipient';
        const date = headers.find((h: any) => h.name === 'Date')?.value || 'Unknown Date';
        
        // Parse and format date
        let formattedDate = 'Unknown Date';
        try {
          formattedDate = new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          formattedDate = date;
        }

        // Extract just email from "Name <email>" format
        const fromEmailMatch = from.match(/<([^>]+)>/);
        const senderEmail = fromEmailMatch ? fromEmailMatch[1] : from;
        const senderName = from.replace(/<[^>]+>/, '').trim() || senderEmail;

        // Determine read status and attachments
        const isUnread = fullEmail.labelIds?.includes('UNREAD') ? '🔵 ' : '';
        const hasAttachment = fullEmail.payload?.parts?.some((part: any) => part.filename) ? '📎 ' : '';

        // Extract email body
        let emailBody = '';
        const extractTextFromPayload = (payload: any): string => {
          if (payload.body?.data) {
            try {
              return Buffer.from(payload.body.data, 'base64').toString('utf-8');
            } catch (e) {
              return '';
            }
          }
          
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                try {
                  return Buffer.from(part.body.data, 'base64').toString('utf-8');
                } catch (e) {
                  continue;
                }
              }
              if (part.parts) {
                const nestedText = extractTextFromPayload(part);
                if (nestedText) return nestedText;
              }
            }
          }
          
          return fullEmail.snippet || '';
        };

        emailBody = extractTextFromPayload(fullEmail.payload);
        
        // Clean up the email body
        emailBody = emailBody
          .replace(/=\r?\n/g, '') // Remove soft line breaks
          .replace(/\r?\n\s*\r?\n/g, '\n\n') // Normalize paragraph breaks
          .trim();

        // Truncate if too long
        if (emailBody.length > 500) {
          emailBody = `${emailBody.substring(0, 500)}... [truncated]`;
        }

        formattedResult += `${index + 1}. ${isUnread}${hasAttachment}**${subject}**\n`;
        formattedResult += `   📤 **From:** ${senderName} (${senderEmail})\n`;
        formattedResult += `   📥 **To:** ${to}\n`;
        formattedResult += `   📅 **Date:** ${formattedDate}\n`;
        formattedResult += `   📄 **Content:**\n`;
        formattedResult += `   ${emailBody.split('\n').map(line => `   ${line}`).join('\n')}\n\n`;
        formattedResult += `   🔗 **Message ID:** ${email.id}\n\n`;
        formattedResult += `---\n\n`;
        
      } catch (error) {
        // Fallback to basic info if full email fetch fails
        const subject = email.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const snippet = email.snippet || 'No preview available';
        
        formattedResult += `${index + 1}. **${subject}**\n`;
        formattedResult += `   💬 Preview: ${snippet}\n`;
        formattedResult += `   🔗 ID: ${email.id}\n`;
        formattedResult += `   ⚠️ Could not fetch full content\n\n`;
      }
    }

    if (emails.length > 5) {
      formattedResult += `📝 **Note:** Showing first 5 of ${emails.length} emails. Ask me to search with more specific criteria to narrow results.\n\n`;
    }

    formattedResult += `💡 **Tip:** I automatically fetched the email content for you. No need to ask for individual emails by ID!`;
    
    return formattedResult;
  } catch (error) {
    // Fallback to original data if formatting fails
    return emailData;
  }
}

// Gmail tool implementations
export const sendMessage = (userId: string) => tool({
  description: 'Send an email message through Gmail. Use arrays for email addresses: to: ["email@example.com"], cc: ["email1@example.com", "email2@example.com"]',
  parameters: sendMessageSchema,
  execute: async (args) => {
    return await executeGmailTool('send_message', args, userId);
  },
});

export const listMessages = (userId: string) => tool({
  description: 'List messages in Gmail mailbox with optional filtering and automatic content fetching',
  parameters: listMessagesSchema,
  execute: async (args) => {
    // Add INBOX filter if no labelIds specified and not searching sent mail
    const searchArgs = { ...args };
    if (!searchArgs.labelIds && (!args.q || !args.q.includes('in:sent'))) {
      searchArgs.labelIds = ['INBOX'];
    }
    
    const result = await executeGmailTool('list_messages', searchArgs, userId);
    return await formatEmailResultsWithContent(result, userId);
  },
});

export const getMessage = (userId: string) => tool({
  description: 'Get a specific Gmail message by ID',
  parameters: getMessageSchema,
  execute: async (args) => {
    return await executeGmailTool('get_message', args, userId);
  },
});

export const createDraft = (userId: string) => tool({
  description: 'Create a draft email in Gmail. Use arrays for email addresses: to: ["email@example.com"], cc: ["email1@example.com", "email2@example.com"]',
  parameters: createDraftSchema,
  execute: async (args) => {
    return await executeGmailTool('create_draft', args, userId);
  },
});

export const listLabels = (userId: string) => tool({
  description: 'List all labels in Gmail mailbox',
  parameters: listLabelsSchema,
  execute: async (args) => {
    return await executeGmailTool('list_labels', args, userId);
  },
});

export const createLabel = (userId: string) => tool({
  description: 'Create a new label in Gmail',
  parameters: createLabelSchema,
  execute: async (args) => {
    return await executeGmailTool('create_label', args, userId);
  },
});

export const searchEmails = (userId: string) => tool({
  description: 'Search emails using Gmail query syntax with automatic content fetching',
  parameters: searchEmailsSchema,
  execute: async (args) => {
    // Modify args to search in INBOX only (received emails) unless searching for sent emails
    const searchArgs = { 
      ...args,
      labelIds: ['INBOX'] // Only search in inbox for received emails
    };
    
    const startTime = Date.now();
    const result = await executeGmailToolEnhanced('list_messages', searchArgs, userId, { useCache: true });
    const executionTime = Date.now() - startTime;
    
    // Save search history
    try {
      const parsed = JSON.parse(result);
      const resultCount = parsed.messages?.length || 0;
      await saveGmailSearchHistory({
        userId,
        query: args.q,
        resultCount,
        executionTime,
      });
    } catch (e) {
      // Continue if history saving fails
    }
    
    const formattedResult = await formatEmailResultsWithContent(result, userId);
    
    return formattedResult;
  },
});

// Enhanced search with semantic understanding
export const semanticEmailSearch = (userId: string) => tool({
  description: 'Search emails using natural language with automatic query optimization and human-readable results',
  parameters: semanticSearchSchema,
  execute: async (args) => {
    const gmailQuery = buildGmailQuery(args);
    
    // Determine which folder to search based on query content
    let labelIds = ['INBOX']; // Default to inbox for received emails
    if (gmailQuery.includes('in:sent') || gmailQuery.includes(`from:${userId}`)) {
      labelIds = ['SENT'];
    }
    
    const searchArgs = {
      q: gmailQuery,
      maxResults: args.maxResults,
      labelIds: labelIds,
    };
    
    const startTime = Date.now();
    const result = await executeGmailToolEnhanced('list_messages', searchArgs, userId, { useCache: true });
    const executionTime = Date.now() - startTime;
    
    // Save search history
    try {
      const parsed = JSON.parse(result);
      const resultCount = parsed.messages?.length || 0;
      await saveGmailSearchHistory({
        userId,
        query: gmailQuery,
        resultCount,
        executionTime,
      });
    } catch (e) {
      // Continue if history saving fails
    }
    
    const formattedResult = formatEmailResults(result);
    
    return formattedResult;
  },
});

// Enhanced search with pagination and caching
export const enhancedEmailSearch = (userId: string) => tool({
  description: 'Enhanced email search with pagination, caching, and human-readable results',
  parameters: enhancedSearchSchema,
  execute: async (args) => {
    // Add INBOX filter if no labelIds specified and not searching sent mail
    const searchArgs = { ...args };
    if (!searchArgs.labelIds && (!args.q || !args.q.includes('in:sent'))) {
      searchArgs.labelIds = ['INBOX'];
    }
    
    const startTime = Date.now();
    const result = await executeGmailToolEnhanced('list_messages', searchArgs, userId, { useCache: true });
    const executionTime = Date.now() - startTime;
    
    // Save search history
    try {
      const parsed = JSON.parse(result);
      const resultCount = parsed.messages?.length || 0;
      await saveGmailSearchHistory({
        userId,
        query: args.q,
        resultCount,
        executionTime,
      });
    } catch (e) {
      // Continue if history saving fails
    }
    
    const formattedResult = formatEmailResults(result);
    
    return formattedResult;
  },
}); 

// Clear search cache (utility function)
export function clearGmailSearchCache(): void {
  searchCache.clear();
} 