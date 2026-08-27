import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Mail, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { zohoMailService, type ZohoMailStatusResponse } from '@/lib/api/services/zohoMail';

function formatSyncedAt(value: string | null): string {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { error?: string; detail?: string } } }).response
      ?.data;
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function ZohoMailConnectCard() {
  const [status, setStatus] = useState<ZohoMailStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await zohoMailService.getStatus();
      setStatus(data);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load Zoho Mail status'));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await zohoMailService.getConnect();
      if (!data.authorize_url) {
        toast.error('Zoho authorize URL missing. Check backend ZOHO_* env vars.');
        return;
      }
      // Return to this Settings/User Management page after Zoho consent.
      try {
        sessionStorage.setItem(
          'zoho_oauth_return',
          `${window.location.pathname}${window.location.search}`
        );
      } catch {
        // ignore storage failures
      }
      window.location.href = data.authorize_url;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start Zoho Mail connect'));
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await zohoMailService.syncNow();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Sync done — applied ${result.applied ?? 0}, unmatched ${result.unmatched ?? 0}`
        );
      }
      await loadStatus();
    } catch (err) {
      toast.error(errorMessage(err, 'Zoho sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await zohoMailService.disconnect();
      toast.success('Zoho Mail disconnected');
      await loadStatus();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not disconnect Zoho Mail'));
    } finally {
      setDisconnecting(false);
    }
  };

  const connected = Boolean(status?.connected);
  const serverConfigured = status?.configured !== false;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight">Zoho Mail</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              One-time connect for your ops inbox. We read shipment emails and auto-fill empty
              tracking fields on inventory requests. This is separate from Zoho login.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading connection status…
          </div>
        ) : !serverConfigured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            Zoho Mail OAuth is not configured on the API. Set{' '}
            <code className="text-xs">ZOHO_CLIENT_ID</code>,{' '}
            <code className="text-xs">ZOHO_CLIENT_SECRET</code>, and{' '}
            <code className="text-xs">ZOHO_OAUTH_REDIRECT_URI</code>.
          </div>
        ) : connected ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Connected
              </span>
              <span className="font-medium text-foreground">
                {status?.email_address || 'Zoho mailbox'}
              </span>
            </div>
            <p className="text-muted-foreground">
              Last sync: {formatSyncedAt(status?.last_synced_at ?? null)}
            </p>
            {status?.connected_by_email ? (
              <p className="text-xs text-muted-foreground">
                Connected by {status.connected_by_email}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            Not connected. An ops user with access to the shipment inbox should connect once; then
            the backend polls automatically about every 15 minutes.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
        {connected ? (
          <>
            <Button variant="outline" onClick={() => void loadStatus()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              )}
              Sync now
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Unplug className="mr-2 h-4 w-4" aria-hidden />
              )}
              Disconnect
            </Button>
          </>
        ) : (
          <Button onClick={() => void handleConnect()} disabled={connecting || !serverConfigured}>
            {connecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Link2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Connect Zoho Mail
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
