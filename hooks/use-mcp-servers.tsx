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
  isDeployed: boolean;
  remote: boolean;
  useCount: number;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
};

export type ConnectedMCPServer = MCPServer & {
  connectionId: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  error?: string;
};

interface MCPContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  servers: MCPServer[];
  connectedServers: ConnectedMCPServer[];
  searchServers: (query: string) => Promise<void>;
  connectToServer: (
    server: MCPServer,
    config?: Record<string, any>,
  ) => Promise<void>;
  disconnectServer: (connectionId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const MCPContext = createContext<MCPContextType | null>(null);

const SMITHERY_API_BASE = 'https://registry.smithery.ai';
const STORAGE_KEY = 'mcp-api-key';
const CONNECTED_SERVERS_KEY = 'mcp-connected-servers';

export function MCPProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [connectedServers, setConnectedServers] = useState<
    ConnectedMCPServer[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load API key and connected servers from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(STORAGE_KEY);
    const storedConnectedServers = localStorage.getItem(CONNECTED_SERVERS_KEY);

    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }

    if (storedConnectedServers) {
      try {
        const parsed = JSON.parse(storedConnectedServers);
        setConnectedServers(parsed);
      } catch (e) {
        console.error('Failed to parse stored connected servers:', e);
      }
    }
  }, []);

  const setApiKey = useCallback((key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const searchServers = useCallback(
    async (query: string) => {
      if (!apiKey) {
        setError('API key is required');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(
          `${SMITHERY_API_BASE}/servers?q=${encodedQuery}&pageSize=50`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        setServers(data.servers || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to search servers',
        );
        setServers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey],
  );

  const connectToServer = useCallback(
    async (server: MCPServer, config: Record<string, any> = {}) => {
      if (!apiKey) {
        setError('API key is required');
        return;
      }

      const connectionId = `${server.qualifiedName}-${Date.now()}`;

      // Add server as connecting
      const connectingServer: ConnectedMCPServer = {
        ...server,
        connectionId,
        status: 'connecting',
      };

      setConnectedServers((prev) => {
        // Remove any existing connection to this server
        const filtered = prev.filter(
          (s) => s.qualifiedName !== server.qualifiedName,
        );
        return [...filtered, connectingServer];
      });

      try {
        // Get server details for connection info
        const response = await fetch(
          `${SMITHERY_API_BASE}/servers/${server.qualifiedName}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get server details: ${response.statusText}`,
          );
        }

        const serverDetails = await response.json();

        // For now, we'll mark it as connected
        // In a real implementation, you would establish the actual MCP connection here
        const connectedServer: ConnectedMCPServer = {
          ...server,
          connectionId,
          status: 'connected',
          tools: serverDetails.tools,
        };

        setConnectedServers((prev) => {
          const updated = prev.map((s) =>
            s.connectionId === connectionId ? connectedServer : s,
          );

          // Save to localStorage
          localStorage.setItem(CONNECTED_SERVERS_KEY, JSON.stringify(updated));

          return updated;
        });
      } catch (err) {
        const errorServer: ConnectedMCPServer = {
          ...server,
          connectionId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Connection failed',
        };

        setConnectedServers((prev) =>
          prev.map((s) => (s.connectionId === connectionId ? errorServer : s)),
        );
      }
    },
    [apiKey],
  );

  const disconnectServer = useCallback((connectionId: string) => {
    setConnectedServers((prev) => {
      const updated = prev.filter((s) => s.connectionId !== connectionId);
      localStorage.setItem(CONNECTED_SERVERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: MCPContextType = {
    apiKey,
    setApiKey,
    servers,
    connectedServers,
    searchServers,
    connectToServer,
    disconnectServer,
    isLoading,
    error,
  };

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}

export function useMCPServers() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCPServers must be used within MCPProvider');
  }
  return context;
}
