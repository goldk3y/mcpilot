import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

export interface ExaConfig {
  debug?: boolean;
}

/**
 * Creates a URL to connect to the Smithery MCP server.
 * Based on @smithery/sdk implementation
 */
function createSmitheryUrl(baseUrl: string, options?: { config?: any; apiKey?: string; profile?: string }): URL {
  const url = new URL(`${baseUrl}/mcp`);
  
  if (options?.config) {
    const param = typeof window !== "undefined"
      ? btoa(JSON.stringify(options.config))
      : Buffer.from(JSON.stringify(options.config)).toString("base64");
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

export class ExaService {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;

  async connect(smitheryApiKey: string, config: ExaConfig = { debug: false }): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Create the server URL using Smithery SDK
      const serverUrl = createSmitheryUrl(
        "https://server.smithery.ai/exa", 
        { 
          config: config, 
          apiKey: smitheryApiKey
        }
      );

      // Create transport
      this.transport = new StreamableHTTPClientTransport(serverUrl);

      // Create MCP client
      this.client = new Client({
        name: "MCPilot Exa Client",
        version: "1.0.0"
      });

      // Connect to the MCP
      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log('Exa MCP connected successfully');
    } catch (error) {
      console.error('Failed to connect to Exa MCP:', error);
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
      throw new Error('Exa client is not connected');
    }
    
    return await this.client.listTools();
  }

  async callTool(name: string, arguments_: any) {
    if (!this.client || !this.isConnected) {
      throw new Error('Exa client is not connected');
    }

    return await this.client.callTool({ name, arguments: arguments_ });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export a singleton instance
export const exaService = new ExaService(); 