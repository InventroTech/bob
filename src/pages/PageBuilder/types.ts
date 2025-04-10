
import { LucideIcon } from "lucide-react";

export interface ComponentItem {
  id: string;
  type: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  content?: string;
  properties?: Record<string, any>;
}

export interface PageTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  components: ComponentItem[];
}

export interface ComponentCategory {
  name: string;
  items: Omit<ComponentItem, "id">[];
}
