import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { whatsappTemplateService, type WhatsAppTemplate } from '@/lib/api/services/whatsappTemplate';

interface WhatsAppTemplateComponentProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
  };
}

export const WhatsAppTemplateComponent: React.FC<WhatsAppTemplateComponentProps> = ({ 
  config = {} 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Use configured endpoint if provided, otherwise use default
  const apiEndpoint = config?.apiEndpoint || '/api/whatsapp-templates';
  const componentTitle = config?.title || 'WhatsApp Template';

  // Fetch templates using centralized service
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templatesList = await whatsappTemplateService.getAll(apiEndpoint);
      setTemplates(templatesList);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error(`Failed to load templates: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates on mount and when endpoint changes
  useEffect(() => {
    fetchTemplates();
  }, [apiEndpoint]);

  // Handle edit - populate form with template data
  const handleEdit = (template: WhatsAppTemplate) => {
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

  // Handle submit (create or update) using centralized service
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
      const payload = {
        title: title.trim(),
        description: description.trim(),
      };

      if (editingId) {
        // Update existing template using centralized service
        await whatsappTemplateService.update(editingId, payload, apiEndpoint);
        toast.success('WhatsApp template updated successfully!');
      } else {
        // Create new template using centralized service
        await whatsappTemplateService.create(payload, apiEndpoint);
        toast.success('WhatsApp template created successfully!');
      }
      
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

  // Handle delete using centralized service
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await whatsappTemplateService.delete(deleteId, apiEndpoint);
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
    <Card className="w-full shadow-sm bg-white border border-gray-300">
      <CardHeader className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-black" />
          <h5 className="text-black">{componentTitle}</h5>
        </div>
        <CardDescription className="text-body-sm mt-1 text-gray-600">
          Create and manage WhatsApp message templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create/Edit Form */}
        <div className={`rounded-lg border-2 p-5 transition-all ${
          editingId 
            ? 'border-black bg-gray-50' 
            : 'border-gray-300 bg-white'
        }`}>
          {editingId && (
            <div className="mb-4 flex items-center gap-2 text-body-sm text-black">
              <Edit className="h-4 w-4" />
              <span className="text-body-sm-medium">Editing template</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-title" className="text-black">
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
                className="h-10 border-gray-300 text-black bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description" className="text-black">
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
                className="resize-none border-gray-300 text-black bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
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
                  className="border-gray-300 text-black hover:bg-gray-100"
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
            <h5 className="flex items-center gap-2 text-black">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              Saved Templates
              {templates.length > 0 && (
                <span className="text-body-sm text-gray-600">
                  ({templates.length})
                </span>
              )}
            </h5>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center bg-gray-50">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-body-sm-medium text-gray-700 mb-1">
                No templates yet
              </p>
              <p className="text-body-xs text-gray-600">
                Create your first WhatsApp template above
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="border border-gray-300 transition-all hover:shadow-md hover:border-black bg-white group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h5 className="mb-2 text-black">
                          {template.title}
                        </h5>
                        <p className="text-body-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          disabled={isSubmitting || (editingId !== null && editingId !== template.id)}
                          className="h-9 px-3 border-gray-300 text-black hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(template.id)}
                          disabled={isSubmitting || editingId !== null}
                          className="h-9 w-9 p-0 text-black hover:text-white hover:bg-black border-gray-300"
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
        <AlertDialogContent className="bg-white border border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-black hover:bg-gray-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-black text-white hover:bg-gray-800"
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


