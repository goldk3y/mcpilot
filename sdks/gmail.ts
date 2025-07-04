import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

export interface GmailConfig {
  debug?: boolean;
}

export class GmailService {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;

  async connect(
    smitheryApiKey: string, 
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    config: GmailConfig = { debug: false }
  ): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Create the server URL using Smithery SDK with Gmail MCP server
      const serverUrl = createSmitheryUrl(
        "https://server.smithery.ai/@shinzo-labs/gmail-mcp", 
        { 
          config: {
            ...config,
            CLIENT_ID: clientId,
            CLIENT_SECRET: clientSecret,
            REFRESH_TOKEN: refreshToken,
          }, 
          apiKey: smitheryApiKey
        }
      );

      // Create transport
      this.transport = new StreamableHTTPClientTransport(serverUrl);

      // Create MCP client
      this.client = new Client({
        name: "MCPilot Gmail Client",
        version: "1.0.0"
      });

      // Connect to the MCP
      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log('Gmail MCP connected successfully');
    } catch (error) {
      console.error('Failed to connect to Gmail MCP:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      this.transport = null;
    }
    this.isConnected = false;
  }

  async listTools() {
    if (!this.client || !this.isConnected) {
      throw new Error('Gmail client is not connected');
    }
    
    return await this.client.listTools();
  }

  async callTool(name: string, arguments_: any) {
    if (!this.client || !this.isConnected) {
      throw new Error('Gmail client is not connected');
    }

    return await this.client.callTool({ name, arguments: arguments_ });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
} 