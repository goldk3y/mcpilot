'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleCalendarConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConnected: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export function GoogleCalendarConnectionDialog({ 
  open, 
  onOpenChange, 
  isConnected,
  onConnectionChange 
}: GoogleCalendarConnectionDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Redirect to Google Calendar OAuth flow
      window.location.href = '/api/auth/google-calendar';
    } catch (err) {
      setError('Failed to initiate Google Calendar connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const response = await fetch('/api/auth/google-calendar', {
        method: 'POST',
      });
      
      if (response.ok) {
        onConnectionChange?.(false);
        onOpenChange(false);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isConnected 
                ? "bg-green-100 dark:bg-green-900/20" 
                : "bg-blue-100 dark:bg-blue-900/20"
            )}>
              {isConnected ? (
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
              ) : (
                <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            {isConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
          </DialogTitle>
          <DialogDescription>
            {isConnected 
              ? 'Your Google Calendar account is connected and ready to use with comprehensive calendar management tools.'
              : 'Connect your Google Calendar account to create, update, and manage events, calendars, and scheduling directly from chat.'
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isConnecting}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Disconnecting...' : 'Disconnect Calendar'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2"
              >
                <ExternalLink className="size-4" />
                {isConnecting ? 'Connecting...' : 'Sign in with Google'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 