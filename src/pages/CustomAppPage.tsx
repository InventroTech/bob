import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '@/lib/apiService';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { componentMap } from '@/pages/PageBuilder';

const CustomAppPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  
  const [page, setPage] = useState<{ name: string; config: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId || !pageId) return;
    setLoading(true);
    
    const fetchPage = async () => {
      const response = await apiService.getPage(pageId);
      if (!response.success) {
        setError(response.error || 'Failed to load page');
        toast.error('Failed to load page');
      } else if (response.data) {
        setPage({ name: response.data.name, config: response.data.config });
      }
      setLoading(false);
    };
    
    fetchPage();
  }, [pageId]);

  if (loading) return <div className="p-4">Loading page...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!page) return <div className="p-4">Page not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        {Array.isArray(page.config)
          ? (page.config as any[]).map((component) => {
              const Renderer = componentMap[component.type];
              return Renderer ? (
                <Renderer key={component.id} {...component.props} config={component.config} />
              ) : null;
            })
          : null}
      </div>
    </div>
  );
};

export default CustomAppPage; 