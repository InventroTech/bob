import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Template {
  id: number;
  title: string;
  description: string;
}

interface WhatsAppTemplateComponentProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
  };
}

export const WhatsAppTemplateComponent: React.FC<WhatsAppTemplateComponentProps> = ({ 
  config = {} 
}) => {
  const { tenantId } = useTenant();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Use configured endpoint if provided, otherwise use default
  // Same pattern as other components (LeadTableComponent, TicketTableComponent, etc.)
  const apiEndpoint = config?.apiEndpoint || '/api/whatsapp-templates';
  const componentTitle = config?.title || 'WhatsApp Template';

  // Helper function to construct full URL
  const getFullUrl = (endpoint: string) => {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    // Normalize endpoint: ensure it starts with / if it's a relative path
    // Remove trailing slash if present (except for root)
    let normalizedEndpoint = endpoint.trim();
    if (!normalizedEndpoint.startsWith('/')) {
      normalizedEndpoint = `/${normalizedEndpoint}`;
    }
    // Remove trailing slash unless it's just "/"
    if (normalizedEndpoint.length > 1 && normalizedEndpoint.endsWith('/')) {
      normalizedEndpoint = normalizedEndpoint.slice(0, -1);
    }
    const baseUrl = import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL;
    return baseUrl ? `${baseUrl}${normalizedEndpoint}` : normalizedEndpoint;
  };

  // Helper function to get headers
  const getHeaders = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    if (tenantId) {
      headers['X-Tenant-Slug'] = tenantId;
    }

    return headers;
  };

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const url = getFullUrl(apiEndpoint);
      const headers = await getHeaders();

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }

      const data = await response.json();
      // Handle both array and object with results property
      const templatesList = Array.isArray(data) ? data : (data.results || data.templates || []);
      setTemplates(templatesList);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error(`Failed to load templates: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [apiEndpoint, tenantId]);

  // Handle edit - populate form with template data
  const handleEdit = (template: Template) => {
    setTitle(template.title);
    setDescription(template.description);
    setEditingId(template.id);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setTitle('');
    setDescription('');
    setEditingId(null);
  };

  // Handle submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title for the template');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description for the template');
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = await getHeaders();
      const requestBody = {
        title: title.trim(),
        description: description.trim(),
      };

      let url: string;
      let method: string;

      if (editingId) {
        // Update existing template - append /id/ to endpoint
        // Ensure endpoint ends without slash, then add /id/
        const baseEndpoint = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
        const fullUrl = getFullUrl(`${baseEndpoint}/${editingId}`);
        url = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
        method = 'PUT';
      } else {
        // Create new template - ensure endpoint ends with / for POST
        const fullUrl = getFullUrl(apiEndpoint);
        url = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to ${editingId ? 'update' : 'create'} template: ${response.status} - ${errorText}`);
      }

      await response.json();

      toast.success(`WhatsApp template ${editingId ? 'updated' : 'created'} successfully!`);
      
      // Reset form and refresh templates
      setTitle('');
      setDescription('');
      setEditingId(null);
      await fetchTemplates();
    } catch (error: any) {
      console.error(`Error ${editingId ? 'updating' : 'creating'} WhatsApp template:`, error);
      toast.error(`Failed to ${editingId ? 'update' : 'create'} template: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      // Ensure endpoint ends without slash, then add /id/
      const baseEndpoint = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
      const fullUrl = getFullUrl(`${baseEndpoint}/${deleteId}`);
      const url = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
      const headers = await getHeaders();

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to delete template: ${response.status} - ${errorText}`);
      }

      toast.success('WhatsApp template deleted successfully!');
      
      // Refresh templates
      await fetchTemplates();
      setDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting WhatsApp template:', error);
      toast.error(`Failed to delete template: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">{componentTitle}</CardTitle>
        </div>
        <CardDescription className="text-sm mt-1">
          Create and manage WhatsApp message templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create/Edit Form */}
        <div className={`rounded-lg border-2 p-5 transition-all ${
          editingId 
            ? 'border-primary bg-primary/5' 
            : 'border-border bg-muted/30'
        }`}>
          {editingId && (
            <div className="mb-4 flex items-center gap-2 text-sm text-primary">
              <Edit className="h-4 w-4" />
              <span className="font-medium">Editing template</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-title" className="text-sm font-medium">
                Template Title
              </Label>
              <Input
                id="template-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Welcome Message"
                required
                disabled={isSubmitting}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description" className="text-sm font-medium">
                Message Content
              </Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter your WhatsApp message template..."
                rows={4}
                required
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingId ? (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Update Template
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Create Template
                      </>
                    )}
                  </>
                )}
              </Button>
              {editingId && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  size="lg"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              Saved Templates
              {templates.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({templates.length})
                </span>
              )}
            </h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No templates yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create your first WhatsApp template above
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="border transition-all hover:shadow-md hover:border-primary/20 group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base mb-2 text-foreground">
                          {template.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          disabled={isSubmitting || (editingId !== null && editingId !== template.id)}
                          className="h-9 px-3"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(template.id)}
                          disabled={isSubmitting || editingId !== null}
                          className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WhatsAppTemplateComponent;


