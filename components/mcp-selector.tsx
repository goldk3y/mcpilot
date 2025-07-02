'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  LoaderIcon,
  CrossIcon,
  CheckCircleFillIcon,
  TrashIcon,
} from './icons';
import { Plug, Search, Check } from 'lucide-react';
import {
  useMCPServers,
  type MCPServer,
  type ConnectedMCPServer,
} from '@/hooks/use-mcp-servers';
import { toast } from './toast';

export function MCPSelector({
  className,
}: {
  className?: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const {
    apiKey,
    setApiKey,
    servers,
    connectedServers,
    searchServers,
    connectToServer,
    disconnectServer,
    isLoading,
    error,
  } = useMCPServers();

  const hasApiKey = Boolean(apiKey);
  const hasConnectedServers = connectedServers.length > 0;

  const handleSaveApiKey = useCallback(() => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      setShowApiKeyInput(false);
      toast({
        type: 'success',
        description: 'Smithery API key saved successfully',
      });
    }
  }, [apiKeyInput, setApiKey]);

  const handleRemoveApiKey = useCallback(() => {
    setApiKey(null);
    setShowApiKeyInput(false);
    setApiKeyInput('');
    toast({
      type: 'success',
      description: 'Smithery API key removed',
    });
  }, [setApiKey]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim()) {
      await searchServers(searchQuery.trim());
    }
  }, [searchQuery, searchServers]);

  const handleConnectServer = useCallback(
    async (server: MCPServer) => {
      await connectToServer(server);
      toast({
        type: 'success',
        description: `Connected to ${server.displayName}`,
      });
    },
    [connectToServer],
  );

  const handleDisconnectServer = useCallback(
    (connectionId: string) => {
      const server = connectedServers.find(
        (s) => s.connectionId === connectionId,
      );
      disconnectServer(connectionId);
      if (server) {
        toast({
          type: 'success',
          description: `Disconnected from ${server.displayName}`,
        });
      }
    },
    [disconnectServer, connectedServers],
  );

  const renderApiKeySection = () => {
    if (!hasApiKey) {
      return (
        <>
          <div className="px-3 py-2">
            <div className="text-sm font-medium">Connect to Smithery</div>
            <div className="text-xs text-muted-foreground mt-1">
              Add your API key to access MCP servers
            </div>
          </div>
          {showApiKeyInput ? (
            <div className="px-3 py-2 space-y-2">
              <Label htmlFor="api-key" className="text-xs">
                API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="smithery-api-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="text-xs h-7"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowApiKeyInput(false);
                    setApiKeyInput('');
                  }}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowApiKeyInput(true);
              }}
              className="cursor-pointer"
            >
              <Plug size={14} />
              <span>Add API Key</span>
            </DropdownMenuItem>
          )}
        </>
      );
    }

    return (
      <>
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Smithery Connected</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemoveApiKey}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <CrossIcon size={12} />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {connectedServers.length} server
            {connectedServers.length !== 1 ? 's' : ''} connected
          </div>
        </div>
      </>
    );
  };

  const renderSearchSection = () => {
    if (!hasApiKey) return null;

    return (
      <>
        {showSearch ? (
          <div className="px-3 py-2 space-y-2">
            <Label htmlFor="search-servers" className="text-xs">
              Search MCP Servers
            </Label>
            <Input
              id="search-servers"
              placeholder="e.g., weather, database, github"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading}
              className="text-xs h-7 w-full"
            >
              {isLoading ? <LoaderIcon size={12} /> : 'Search'}
            </Button>
          </div>
        ) : (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShowSearch(true);
            }}
            className="cursor-pointer"
          >
            <Search size={14} />
            <span>Search Servers</span>
          </DropdownMenuItem>
        )}

        {error && (
          <div className="px-3 py-2 text-xs text-destructive">{error}</div>
        )}

        {servers.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Available Servers
            </div>
            {servers.map((server) => (
              <DropdownMenuItem
                key={server.qualifiedName}
                onSelect={() => handleConnectServer(server)}
                className="cursor-pointer flex-col items-start gap-1 py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  {server.iconUrl ? (
                    <img
                      src={server.iconUrl}
                      alt={server.displayName}
                      className="w-4 h-4 rounded"
                    />
                  ) : (
                    <Plug size={14} />
                  )}
                  <span className="font-medium">{server.displayName}</span>
                  {server.isDeployed && (
                    <Check size={12} className="text-green-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {server.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {server.useCount} uses • {server.qualifiedName}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderConnectedServers = () => {
    if (!hasApiKey || connectedServers.length === 0) return null;

    return (
      <>
        <DropdownMenuSeparator />
        <div className="max-h-32 overflow-y-auto">
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
            Connected Servers
          </div>
          {connectedServers.map((server) => (
            <DropdownMenuItem
              key={server.connectionId}
              className="cursor-default flex-col items-start gap-1 py-2"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {server.iconUrl ? (
                    <img
                      src={server.iconUrl}
                      alt={server.displayName}
                      className="w-4 h-4 rounded"
                    />
                  ) : (
                    <Plug size={14} />
                  )}
                  <span className="font-medium text-xs">
                    {server.displayName}
                  </span>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      server.status === 'connected' && 'bg-green-500',
                      server.status === 'connecting' && 'bg-yellow-500',
                      server.status === 'error' && 'bg-red-500',
                      server.status === 'disconnected' && 'bg-gray-500',
                    )}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnectServer(server.connectionId)}
                  className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <TrashIcon size={10} />
                </Button>
              </div>
              {server.status === 'error' && server.error && (
                <div className="text-xs text-destructive">{server.error}</div>
              )}
              {server.tools && server.tools.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {server.tools.length} tool
                  {server.tools.length !== 1 ? 's' : ''} available
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </>
    );
  };

  const buttonLabel = useMemo(() => {
    if (!hasApiKey) return 'MCP';
    if (hasConnectedServers) return `MCP (${connectedServers.length})`;
    return 'MCP';
  }, [hasApiKey, hasConnectedServers, connectedServers.length]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          variant="outline"
          className="hidden md:flex md:px-2 md:h-[34px]"
        >
          <Plug />
          {buttonLabel}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-[320px] max-w-[400px]"
      >
        {renderApiKeySection()}
        {renderSearchSection()}
        {renderConnectedServers()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
