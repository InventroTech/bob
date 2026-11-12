import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button, type ButtonProps } from '@/components/ui/button';
import { deletedUsersService } from '@/lib/api/services/deletedUsers';
import { cn } from '@/lib/utils';
import { downloadDeletedUsersPdf } from './deletedUsersPdf';

interface DownloadDeletedUsersButtonProps {
  variant?: ButtonProps['variant'];
  className?: string;
  iconClassName?: string;
}

/** Fetches every deleted user for this organization and downloads them as a PDF. */
export function DownloadDeletedUsersButton({ variant = 'outline', className, iconClassName }: DownloadDeletedUsersButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const users = await deletedUsersService.list();
      await downloadDeletedUsersPdf(users);
    } catch {
      toast.error('Could not load deleted users. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => void download()}
      disabled={downloading}
      aria-busy={downloading}
      aria-label="Download deleted users PDF"
      className={cn(className, downloading && 'bg-black text-white disabled:opacity-100')}
    >
      <Download className={cn('shrink-0', iconClassName)} aria-hidden />
      <span className="leading-none">{downloading ? 'Generating…' : 'Deleted Users'}</span>
    </Button>
  );
}
