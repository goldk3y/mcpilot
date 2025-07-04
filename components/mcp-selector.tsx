'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
} from './icons';
import { Plug, Power, PowerOff, Loader2, AlertCircle, } from 'lucide-react';
import {
  useMCPServers,
} from '@/hooks/use-mcp-servers';
import { GmailConnectionDialog } from './gmail-connection-dialog';
import { GoogleCalendarConnectionDialog } from './google-calendar-connection-dialog';

export function MCPSelector({
  className,
}: {
  className?: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [gmailDialogOpen, setGmailDialogOpen] = useState(false);
  const [googleCalendarDialogOpen, setGoogleCalendarDialogOpen] = useState(false);
  const { servers, toggleServer, isLoading, error } = useMCPServers();

  const connectedCount = servers.filter(s => s.isConnected).length;
  const gmailServer = servers.find(s => s.qualifiedName === '@shinzo-labs/gmail-mcp');
  const googleCalendarServer = servers.find(s => s.qualifiedName === '@goldk3y/google-calendar-mcp');

  const buttonLabel = useMemo(() => {
    if (isLoading) return 'Loading...';
    if (connectedCount > 0) return `MCP (${connectedCount})`;
    return 'MCP';
  }, [connectedCount, isLoading]);

  const handleServerClick = (server: any) => {
    if (server.qualifiedName === '@shinzo-labs/gmail-mcp') {
      // Open Gmail dialog instead of toggling
      setGmailDialogOpen(true);
    } else if (server.qualifiedName === '@goldk3y/google-calendar-mcp') {
      // Open Google Calendar dialog instead of toggling
      setGoogleCalendarDialogOpen(true);
    } else {
      // Regular toggle for other servers
      toggleServer(server.qualifiedName);
    }
  };

  return (
    <>
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
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plug />
            )}
            {buttonLabel}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="min-w-[320px] max-w-[400px]"
        >
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium">MCP Servers</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isLoading 
                ? 'Loading servers...'
                : `${connectedCount} of ${servers.length} server${servers.length !== 1 ? 's' : ''} connected`
              }
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 border-b">
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : servers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No MCP servers available
              </div>
            ) : (
              servers.map((server) => (
                <DropdownMenuItem
                  key={server.qualifiedName}
                  className="cursor-pointer flex-col items-start gap-1 py-3"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleServerClick(server);
                  }}
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {server.iconUrl ? (
                        <img
                          src={server.iconUrl}
                          alt={server.displayName}
                          className="size-4 rounded"
                          onError={(e) => {
                            // Fallback to Plug icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.setAttribute('style', 'display: inline');
                          }}
                        />
                      ) : null}
                      <Plug className="size-4" style={{ display: server.iconUrl ? 'none' : 'inline' }} />
                      <span className="font-medium text-sm">
                        {server.displayName}
                      </span>
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full ml-1',
                          server.isConnected ? 'bg-green-500' : 'bg-gray-400',
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {server.isConnected ? (
                        <Power size={14} className="text-green-600" />
                      ) : (
                        <PowerOff size={14} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground w-full">
                    {server.description}
                  </div>
                  
                  {server.tools && server.tools.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {server.tools.length} tool
                      {server.tools.length !== 1 ? 's' : ''} available
                      {server.isConnected && (
                        <span className="text-green-600 ml-1">• Active</span>
                      )}
                    </div>
                  )}
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator />
          <div className="px-3 py-2">
            <div className="text-xs text-muted-foreground">
              MCP servers extend AI functionality
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <GmailConnectionDialog
        open={gmailDialogOpen}
        onOpenChange={setGmailDialogOpen}
        isConnected={gmailServer?.isConnected || false}
        onConnectionChange={(connected) => {
          if (!connected && gmailServer) {
            toggleServer(gmailServer.qualifiedName);
          }
        }}
      />

      <GoogleCalendarConnectionDialog
        open={googleCalendarDialogOpen}
        onOpenChange={setGoogleCalendarDialogOpen}
        isConnected={googleCalendarServer?.isConnected || false}
        onConnectionChange={(connected) => {
          if (!connected && googleCalendarServer) {
            toggleServer(googleCalendarServer.qualifiedName);
          }
        }}
      />
    </>
  );
}
