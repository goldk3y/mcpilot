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
import { Mail, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GmailConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConnected: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export function GmailConnectionDialog({ 
  open, 
  onOpenChange, 
  isConnected,
  onConnectionChange 
}: GmailConnectionDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Redirect to Gmail OAuth flow
      window.location.href = '/api/auth/gmail';
    } catch (err) {
      setError('Failed to initiate Gmail connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const response = await fetch('/api/auth/gmail', {
        method: 'POST',
      });
      
      if (response.ok) {
        onConnectionChange?.(false);
        onOpenChange(false);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect Gmail');
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
                : "bg-red-100 dark:bg-red-900/20"
            )}>
              {isConnected ? (
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
              ) : (
                <Mail className="size-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            {isConnected ? 'Gmail Connected' : 'Connect Gmail'}
          </DialogTitle>
          <DialogDescription>
            {isConnected 
              ? 'Your Gmail account is connected and ready to use with 60+ email automation tools.'
              : 'Connect your Gmail account to access email management, sending, drafting, and organization tools.'
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
                {isConnecting ? 'Disconnecting...' : 'Disconnect Gmail'}
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