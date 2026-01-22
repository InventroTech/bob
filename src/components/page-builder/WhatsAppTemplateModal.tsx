import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface WhatsAppTemplate {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  text?: string;
  message?: string;
  content?: string;
  [key: string]: any;
}

interface WhatsAppTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  whatsappLink?: string;
  apiEndpoint?: string;
  apiPrefix?: 'supabase' | 'renderer';
  onSelectTemplate: (templateText: string | null) => void;
}

export const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  open,
  onOpenChange,
  phone,
  whatsappLink,
  apiEndpoint,
  apiPrefix = 'renderer',
  onSelectTemplate,
}) => {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (open && apiEndpoint) {
      fetchTemplates();
    } else {
      setTemplates([]);
      // Default to "none" if no API endpoint is configured
      setSelectedTemplate("none");
    }
  }, [open, apiEndpoint]);

  const fetchTemplates = async () => {
    if (!apiEndpoint || !session?.access_token) return;

    setLoading(true);
    try {
      // Use renderer API URL if apiPrefix is 'renderer', otherwise use VITE_API_URI (Supabase)
      const baseUrl = apiPrefix === 'renderer' 
        ? (import.meta.env.VITE_RENDER_API_URL || "")
        : (import.meta.env.VITE_API_URI || "");
      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let templatesData: WhatsAppTemplate[] = [];
      if (Array.isArray(data)) {
        templatesData = data;
      } else if (data.templates && Array.isArray(data.templates)) {
        templatesData = data.templates;
      } else if (data.data && Array.isArray(data.data)) {
        templatesData = data.data;
      }

      setTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching WhatsApp templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const templateText = selectedTemplate === "none" 
      ? null 
      : templates.find(t => String(t.id) === selectedTemplate)?.description ||
        templates.find(t => String(t.id) === selectedTemplate)?.text || 
        templates.find(t => String(t.id) === selectedTemplate)?.message ||
        templates.find(t => String(t.id) === selectedTemplate)?.content ||
        null;

    onSelectTemplate(templateText);
    onOpenChange(false);
  };

  const getTemplateText = (template: WhatsAppTemplate): string => {
    return template.description || template.text || template.message || template.content || "";
  };

  const getTemplateName = (template: WhatsAppTemplate): string => {
    return template.name || template.title || `Template ${template.id}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select WhatsApp Template</DialogTitle>
          <DialogDescription>
            Choose a template to use for your WhatsApp message, or select "None" to send without a template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
              <span className="ml-2 text-sm text-gray-600">Loading templates...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <label className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  value="none"
                  checked={selectedTemplate === "none"}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="h-4 w-4 text-black border-gray-300 focus:ring-black focus:ring-2"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">None</span>
                  <p className="text-sm text-gray-600">Send without a template</p>
                </div>
              </label>

              {templates.map((template) => {
                const templateId = String(template.id);
                const templateName = getTemplateName(template);
                const templateText = getTemplateText(template);

                return (
                  <label
                    key={templateId}
                    className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="template"
                      value={templateId}
                      checked={selectedTemplate === templateId}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="h-4 w-4 text-black border-gray-300 focus:ring-black focus:ring-2 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block text-gray-900">{templateName}</span>
                      {templateText && (
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                          {templateText}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}

              {templates.length === 0 && !loading && (
                <p className="text-sm text-gray-600 text-center py-4">
                  No templates available
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button
              onClick={handleOpenWhatsApp}
              disabled={!selectedTemplate || loading}
              className="bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Open WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
