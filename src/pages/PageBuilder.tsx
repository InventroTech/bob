import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlignCenter,
  ArrowLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  Layout,
  Layers,
  Save,
  Settings,
  Trash2,
  Image as ImageIcon,
  User,
  Table,
  ChevronDown,
  LogOut,
  TrendingUp,
  Target,
  MousePointer,
  Briefcase,
  Users,
  Upload,
  Calculator,
  MessageSquare,
  Database,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
  DragMoveEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
} from "@dnd-kit/core";
import { DraggableSidebarItem } from "@/components/page-builder/DraggableSidebarItem";
import {
  ContainerComponent,
  SplitViewComponent,
  FormComponent,
  TableComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  AddUserComponent,
  LeadAssignmentComponent,
  CallAttemptMatrixComponent,
  InventoryTableComponent,
  InventoryRequestFormComponent,
} from "@/components/page-builder";
import RoutingRulesComponent from "@/components/page-builder/RoutingRulesComponent";
import { DroppableCanvasItem } from "@/components/page-builder/DroppableCanvasItem";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Json } from '@/types/supabase';
import { useTenant } from '@/hooks/useTenant';
import { membershipService } from '@/lib/api';
import { INVENTORY_REQUEST_STATUSES } from '@/constants/inventory';
import {DataCardComponent} from "@/components/page-builder/DataCardComponent"
  import { LeadTableComponent } from "@/components/page-builder/LeadTableComponent";
  import { CollapseCard } from "@/components/page-builder/ColapsableCardComponent";
import { OpenModalButton } from "@/components/ATScomponents/OpenModalButton";
import { OpenModalButtonConfigComponent } from "@/components/ATScomponents/configs/OpenModalButtonConfig";
import { JobManagerComponent } from "@/components/ATScomponents/JobManagerComponent";
import { JobManagerConfigComponent } from "@/components/ATScomponents/configs/JobManagerConfig";
import { JobsPageComponent } from "@/components/ATScomponents/JobsPageComponent";
import { JobsPageConfigComponent } from "@/components/ATScomponents/configs/JobsPageConfig";
import { ApplicantTableComponent } from "@/components/ATScomponents/ApplicantTableComponent";
import { ApplicantTableConfigComponent } from "@/components/ATScomponents/configs/ApplicantTableConfig";
import { DynamicScoringComponent } from "@/components/ATScomponents/DynamicScoringComponent";
import { DynamicScoringConfig } from "@/components/ATScomponents/configs/DynamicScoringConfig";
import { FileUploadPageComponent } from "@/components/page-builder/FileUploadPageComponent";
import { FileUploadPageConfig } from "@/components/page-builder/FileUploadPageConfig";
import { Carousel } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OeLeadsTable } from "@/components/page-builder/OeLeadsTable";
import { ProgressBar } from "@/components/ui/progressBar";
import { LeadProgressBar } from "@/components/page-builder/LeadProgressBar";
import { HeaderComponent } from "@/components/page-builder/HeaderComponent";
import { TicketTableComponent } from "@/components/page-builder/TicketTableComponent";
import { TicketCarousel } from "@/components/page-builder/TicketCarousel";
import { TicketCarouselWrapper } from "@/components/page-builder/TicketCarouselWrapper";
import { TicketBarGraphComponent } from "@/components/page-builder/TicketBarGraphComponent";
import { LeadCardCarouselWrapper } from "@/components/page-builder/LeadCardCarouselWrapper";
import { Textarea } from "@/components/ui/textarea";
import { debounce } from 'lodash';
import { TemporaryLogoutComponent } from "@/components/page-builder/TemporaryLogoutComponent";
import { StackedBarChart } from "@/components/AnalyticalComponent/StackedBarChart";
import { LineChart } from "@/components/AnalyticalComponent/LineChart";
import { BarGraph } from "@/components/AnalyticalComponent/BarGraph";
import { TeamDashboardComponent, TeamDashboardConfig } from "@/components/page-builder";
import { OperationsProgramsComponent, OperationsProgramsConfig } from "@/components/page-builder";
import { UserHierarchyComponent, UserHierarchyConfig } from "@/components/page-builder";
// Import configuration components
import {
  DataCardConfig,
  TableConfig,
  CarouselConfig,
  BasicChartConfig,
  AdvancedChartConfig,
  DynamicFilterConfig,
  TicketCarouselConfig,
  LeadCardCarouselConfig,
  LeadAssignmentConfig,
  CallAttemptMatrixConfig,
  RoutingRulesConfig
} from "@/component-config";
import { TicketTableConfig } from "@/components/page-builder/component-config/TicketTableConfig";
import { LeadProgressBarConfig } from "@/components/page-builder/component-config/LeadProgressBarConfig";
import { WhatsAppTemplateComponent } from "@/components/page-builder/WhatsAppTemplateComponent";
import { WhatsAppTemplateConfig } from "@/components/page-builder/component-config/WhatsAppTemplateConfig";
import { FilterConfig } from "@/component-config/DynamicFilterConfig";
import { FileUploadConfig } from "@/components/ATScomponents/configs/FileUploadConfig";
import type { RoutingRulesConfigData, RoutingFilterField } from "@/component-config";

// Wrapper component to prevent unnecessary re-renders in RoutingRulesConfig
interface RoutingRulesConfigWrapperProps {
  filterFields: RoutingFilterField[];
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onFilterFieldsChange: (fields: RoutingFilterField[]) => void;
}

const RoutingRulesConfigWrapper = React.memo<RoutingRulesConfigWrapperProps>(({
  filterFields,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onFilterFieldsChange,
}) => {
  // Memoize the config object
  const localConfig = useMemo<RoutingRulesConfigData>(() => ({
    filterFields,
    title,
    description,
  }), [filterFields, title, description]);

  // Memoize the onConfigChange callback
  const handleConfigChange = useCallback((newConfig: Partial<RoutingRulesConfigData>) => {
    if (newConfig.title !== undefined) {
      onTitleChange(newConfig.title);
    }
    if (newConfig.description !== undefined) {
      onDescriptionChange(newConfig.description);
    }
    if (newConfig.filterFields !== undefined) {
      onFilterFieldsChange(newConfig.filterFields);
    }
  }, [onTitleChange, onDescriptionChange, onFilterFieldsChange]);

  return (
    <RoutingRulesConfig
      localConfig={localConfig}
      onConfigChange={handleConfigChange}
    />
  );
});

RoutingRulesConfigWrapper.displayName = 'RoutingRulesConfigWrapper';

interface ComponentConfig {
  apiEndpoint?: string;
  statusDataApiEndpoint?: string;
  apiPrefix?: 'localhost' | 'renderer';
  columns?: Array<{
    key: string;
    label: string;
    type: 'text' | 'chip' | 'date' | 'number';
  }>;
  datasets?: Array<{
    label: string;
    backgroundColor: string;
  }>;
  title?: string;
  description?: string;
  refreshInterval?: number;
  showFilters?: boolean;
  customFields?: Record<string, any>;
  filters?: FilterConfig[];
  filterOptions?: {
    pageSize?: number;
    showSummary?: boolean;
    compact?: boolean;
  };
  searchFields?: string;
  // OpenModalButton specific fields
  buttonTitle?: string;
  buttonColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  modalTitle?: string;
  selectedJobId?: string;
  successMessage?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  // JobManager specific fields
  showCreateButton?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  // JobsPage specific fields
  allowApplications?: boolean;
  // FileUpload specific fields
  acceptedFileTypes?: string;
  maxFileSize?: number;
  multiple?: boolean;
  // Shared fields for all ATS components
  tenantSlug?: string;
  submitEndpoint?: string; // Used by OpenModalButton and JobsPage
  // JobManager specific API fields
  updateEndpoint?: string; // Separate endpoint for updates (PUT)
  deleteEndpoint?: string; // Separate endpoint for deletes (DELETE)
  apiMode?: 'renderer' | 'direct'; // API mode for JobManager
  apiBaseUrl?: string; // Full URL prefix for direct mode
  useDemoData?: boolean; // Use demo data instead of API calls
  // LeadAssignment specific fields
  leadTypesEndpoint?: string;
  rmsEndpoint?: string;
  assignmentsEndpoint?: string;
  // LeadCardCarousel specific fields
  leadAssignmentWebhookUrl?: string;
  whatsappTemplatesApiEndpoint?: string;
  // CallAttemptMatrix specific fields (apiEndpoint already defined above)
  // LeadProgressBar specific fields
  targetCount?: number;
  segmentCount?: number;
  // UserHierarchy specific fields
  showTable?: boolean;
  showDiagram?: boolean;
  // InventoryRequestForm specific fields
  defaultStatus?: string;
}

// Update CanvasComponentData to include config
export interface CanvasComponentData {
  id: string;
  type: string;
  props: Record<string, any>;
  config: ComponentConfig;
}

// Map component types to actual components
// Maps builder palette identifiers to actual React components rendered on the canvas
export const componentMap: Record<string, React.FC<any>> = {
  container: ContainerComponent,
  split: SplitViewComponent,
  form: FormComponent,
  table: TableComponent,
  text: TextComponent,
  button: ButtonComponent,
  image: ImageComponent,
  dataCard:DataCardComponent,
  leadTable: LeadTableComponent,
  inventoryTable: InventoryTableComponent,
  collapseCard: CollapseCard,
  leadCarousel: LeadCardCarouselWrapper,
  oeLeadsTable: OeLeadsTable,
  progressBar: ProgressBar,
  leadProgressBar: LeadProgressBar,
  ticketTable: TicketTableComponent,
  ticketCarousel: TicketCarouselWrapper,
  ticketBarGraph: TicketBarGraphComponent,
  temporaryLogout: TemporaryLogoutComponent,
  stackedBarChart: StackedBarChart,
  lineChart: LineChart,
  barGraph: BarGraph,
  addUser: AddUserComponent,
  leadAssignment: LeadAssignmentComponent,
  callAttemptMatrix: CallAttemptMatrixComponent,
  openModalButton: OpenModalButton,
  jobManager: JobManagerComponent,
  jobsPage: JobsPageComponent,
  applicantTable: ApplicantTableComponent,
  fileUpload: FileUploadPageComponent,
  dynamicScoring: DynamicScoringComponent,
  routingRules: RoutingRulesComponent,
  whatsappTemplate: WhatsAppTemplateComponent,
  teamDashboard: TeamDashboardComponent,
  operationsPrograms: OperationsProgramsComponent,
  userHierarchy: UserHierarchyComponent,
  inventoryRequestForm: InventoryRequestFormComponent,
};

// Add this interface near the top with other interfaces
interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
  linkField?: string;
  openCard?: boolean | string;
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;
}

// Move ConfigurationPanel outside the main component
interface ConfigurationPanelProps {
  selectedComponent: CanvasComponentData;
  setCanvasComponents: React.Dispatch<React.SetStateAction<CanvasComponentData[]>>;
  onClose: () => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ selectedComponent, setCanvasComponents, onClose }) => {
  const { id: selectedComponentId, config: initialConfig = {}, type: selectedComponentType } = selectedComponent;
  const initialColumns = initialConfig.columns || [];
  const initialDatasets = initialConfig.datasets || [];

  type LocalConfigType = {
    apiEndpoint: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'localhost' | 'renderer';
    title?: string;
    description?: string;
    refreshInterval?: number;
    showFilters: boolean;
    searchFields: string;
    /** Records table: entity type for API (e.g. inventory_request, inventory_cart). */
    entityType?: string;
    /** Records table: row click behavior — lead card, record detail modal, receive shipment modal, none, or auto (infer from entityType). */
    detailMode?: 'lead_card' | 'inventory_request' | 'inventory_cart' | 'receive_shipments' | 'none' | 'auto';
    // OpenModalButton specific fields
    buttonTitle?: string;
    buttonColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
    modalTitle?: string;
    selectedJobId?: string;
    successMessage?: string;
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    // JobManager specific fields
    showCreateButton?: boolean;
    showStats?: boolean;
    layout?: 'grid' | 'list';
    maxJobs?: number;
    // JobsPage specific fields
    allowApplications?: boolean;
    // FileUpload specific fields
    acceptedFileTypes?: string;
    maxFileSize?: number;
    multiple?: boolean;
    // Shared fields for all ATS components
    tenantSlug?: string;
    submitEndpoint?: string; // Used by OpenModalButton and JobsPage
    // LeadProgressBar specific fields
    targetCount?: number;
    segmentCount?: number;
    // WhatsAppTemplate specific fields
    // (apiEndpoint and title are already in the base type)
    //job manager specific fields
    updateEndpoint?: string; // Separate endpoint for updates (PUT)
    deleteEndpoint?: string; // Separate endpoint for deletes (DELETE)
    apiMode?: 'localhost' | 'renderer'; // API mode for JobManager
    useDemoData?: boolean; // Use demo data instead of API calls
    // UserHierarchy specific fields
    // title already in base; showTable, showDiagram below
    showTable?: boolean;
    showDiagram?: boolean;
    // InventoryRequestForm specific fields
    defaultStatus?: string;
  };

  // Local state for all input fields
  const [localConfig, setLocalConfig] = useState<LocalConfigType>({
    apiEndpoint: initialConfig.apiEndpoint || '',
    statusDataApiEndpoint: initialConfig.statusDataApiEndpoint || '',
    apiPrefix: initialConfig.apiPrefix || 'localhost',
    title: initialConfig.title || '',
    description: initialConfig.description || '',
    refreshInterval: initialConfig.refreshInterval || 0,
    showFilters: initialConfig.showFilters || false,
    searchFields: initialConfig.searchFields || '',
    entityType: (initialConfig as any).entityType || '',
    detailMode: (initialConfig as any).detailMode || 'auto',
    // OpenModalButton fields
    buttonTitle: initialConfig.buttonTitle || 'Apply Now',
    buttonColor: initialConfig.buttonColor || 'default',
    buttonSize: initialConfig.buttonSize || 'default',
    modalTitle: initialConfig.modalTitle || 'Job Application',
    selectedJobId: initialConfig.selectedJobId || '',
    successMessage: initialConfig.successMessage || 'Application submitted successfully!',
    width: initialConfig.width || 'lg',
    // JobManager fields
    showCreateButton: initialConfig.showCreateButton ?? true,
    showStats: initialConfig.showStats ?? true,
    layout: initialConfig.layout || 'grid',
    maxJobs: initialConfig.maxJobs || 50,
    // JobsPage fields
    allowApplications: initialConfig.allowApplications ?? true,
    // FileUpload fields
    acceptedFileTypes: initialConfig.acceptedFileTypes || '*',
    maxFileSize: initialConfig.maxFileSize || 10,
    multiple: initialConfig.multiple ?? true,
    // Shared fields for all ATS components
    tenantSlug: initialConfig.tenantSlug || '',
    submitEndpoint: initialConfig.submitEndpoint || '/crm-records/records/',
    // LeadProgressBar fields
    targetCount: initialConfig.targetCount || 10,
    segmentCount: initialConfig.segmentCount || 8,
    // TeamDashboard fields (if needed, add to ComponentConfig interface first)
    // allottedLeads: initialConfig.allottedLeads || 1600,
    // trailTarget: initialConfig.trailTarget || 160,
    // totalTeamSize: initialConfig.totalTeamSize || 18,
    // showDatePicker: initialConfig.showDatePicker !== false,
    // JobManager specific API fields
    updateEndpoint: initialConfig.updateEndpoint || '',
    deleteEndpoint: initialConfig.deleteEndpoint || '',
    apiMode: (initialConfig.apiMode === 'direct' ? 'localhost' : initialConfig.apiMode) || 'localhost',
    useDemoData: initialConfig.useDemoData ?? false,
    // UserHierarchy
    showTable: initialConfig.showTable !== false,
    showDiagram: initialConfig.showDiagram !== false,
    // InventoryRequestForm
    defaultStatus: initialConfig.defaultStatus || 'DRAFT',
  });

  // Separate state for routing rules filter fields to prevent re-renders
  const [localFilterFields, setLocalFilterFields] = useState<any[]>(
    (initialConfig as any).filterFields || []
  );

  // Separate state for columns
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(initialColumns);
  const [numColumns, setNumColumns] = useState<number>(initialColumns.length);

  // Separate state for filters
  const initialFilters = initialConfig.filters || [];
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(initialFilters);
  const [numFilters, setNumFilters] = useState<number>(initialFilters.length);

  // Separate state for datasets (for StackedBarChart)
  const [localDatasets, setLocalDatasets] = useState<Array<{label: string; backgroundColor: string}>>(initialDatasets);
  const [numDatasets, setNumDatasets] = useState<number>(initialDatasets.length || 1);

  // Debounced update to parent state
  const debouncedUpdate = useCallback(
    (updates: Partial<ComponentConfig>) => {
      const updateFn = (prev: CanvasComponentData[]) => prev.map(comp => 
        comp.id === selectedComponentId 
          ? { 
              ...comp, 
              config: { 
                ...(comp.config || {}), 
                ...updates 
              } 
            }
          : comp
      );
      setCanvasComponents(updateFn);
    },
    [selectedComponentId, setCanvasComponents]
  );

  const debouncedUpdateWithDelay = useMemo(
    () => debounce(debouncedUpdate, 500),
    [debouncedUpdate]
  );

  // Handle local input changes
  const handleInputChange = useCallback((field: keyof LocalConfigType, value: string | number | boolean) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    debouncedUpdateWithDelay({ [field]: value });
  }, [debouncedUpdateWithDelay]);

  // Handle column count change
  const handleColumnCountChange = useCallback((count: number) => {
    setNumColumns(count);
    if (count < localColumns.length) {
      // Remove extra columns
      const newConfigs = localColumns.slice(0, count);
      setLocalColumns(newConfigs);
      debouncedUpdateWithDelay({ columns: newConfigs });
    } else if (count > localColumns.length) {
      // Add new empty columns
      const newConfigs = [
        ...localColumns,
        ...Array(count - localColumns.length).fill({ key: '', label: '', type: 'text' })
      ];
      setLocalColumns(newConfigs);
      debouncedUpdateWithDelay({ columns: newConfigs });
    }
  }, [localColumns, debouncedUpdateWithDelay]);

  // Handle individual column field changes
  const handleColumnFieldChange = useCallback((index: number, field: keyof ColumnConfig, value: string | boolean) => {
    const newColumns = [...localColumns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setLocalColumns(newColumns);
    debouncedUpdateWithDelay({ columns: newColumns });
  }, [localColumns, debouncedUpdateWithDelay]);

  // Handle column deletion
  const handleColumnDelete = useCallback((index: number) => {
    const newColumns = localColumns.filter((_, i) => i !== index);
    setLocalColumns(newColumns);
    setNumColumns(newColumns.length);
    debouncedUpdateWithDelay({ columns: newColumns });
  }, [localColumns, debouncedUpdateWithDelay]);

  const handleFilterCountChange = useCallback((count: number) => {
    setNumFilters(count);
    let newFilters: FilterConfig[];

    if (count < localFilters.length) {
      // Remove extra filters
      newFilters = localFilters.slice(0, count);
    } else if (count > localFilters.length) {
      // Add new filters
      newFilters = [...localFilters];
      for (let i = localFilters.length; i < count; i++) {
        const tempKey = `temp_filter_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newFilters.push({
          key: tempKey,
          label: '',
          type: 'select',
          accessor: '', // Will be set by user
          options: []
        });
      }
    } else {
      // No change in count
      newFilters = localFilters;
    }

    // Ensure all filters have proper keys
    newFilters = newFilters.map((filter, index) => {
      if (!filter.key || (typeof filter.key === 'string' && filter.key.trim() === '')) {
        return {
          ...filter,
          key: `filter_${filter.accessor || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };
      }
      return filter;
    });

    setLocalFilters(newFilters);
    debouncedUpdateWithDelay({ filters: newFilters });
  }, [localFilters, debouncedUpdateWithDelay]);

  const handleFilterFieldChange = useCallback((index: number, field: keyof FilterConfig, value: string | FilterConfig['options']) => {
    const newFilters = [...localFilters];

    // If changing the accessor, also update the key to match for consistency
    if (field === 'accessor' && typeof value === 'string' && value.trim() !== '') {
      newFilters[index] = {
        ...newFilters[index],
        [field]: value,
        key: value // Set key to match accessor for consistency
      };
    } else if (field === 'lookup' && value === 'auto') {
      // Convert 'auto' back to undefined for the lookup field
      newFilters[index] = { ...newFilters[index], [field]: undefined };
    } else {
      newFilters[index] = { ...newFilters[index], [field]: value };
    }

    // If key is still empty after changes, generate a unique key
    if (!newFilters[index].key || (typeof newFilters[index].key === 'string' && newFilters[index].key.trim() === '')) {
      newFilters[index] = {
        ...newFilters[index],
        key: `filter_${newFilters[index].accessor || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      };
    }

    setLocalFilters(newFilters);
    debouncedUpdateWithDelay({ filters: newFilters });
  }, [localFilters, debouncedUpdateWithDelay]);

  const handleAddFilterOption = useCallback((filterIndex: number) => {
    const newFilters = [...localFilters];
    if (!newFilters[filterIndex].options) {
      newFilters[filterIndex].options = [];
    }
    newFilters[filterIndex].options!.push({ label: '', value: '' });
    setLocalFilters(newFilters);
    debouncedUpdateWithDelay({ filters: newFilters });
  }, [localFilters, debouncedUpdateWithDelay]);

  const handleRemoveFilterOption = useCallback((filterIndex: number, optionIndex: number) => {
    const newFilters = [...localFilters];
    if (newFilters[filterIndex].options) {
      newFilters[filterIndex].options!.splice(optionIndex, 1);
      setLocalFilters(newFilters);
      debouncedUpdateWithDelay({ filters: newFilters });
    }
  }, [localFilters, debouncedUpdateWithDelay]);

  const handleFilterOptionChange = useCallback((filterIndex: number, optionIndex: number, field: keyof FilterConfig['options'][0], value: string) => {
    const newFilters = [...localFilters];
    if (newFilters[filterIndex].options && newFilters[filterIndex].options![optionIndex]) {
      newFilters[filterIndex].options![optionIndex] = {
        ...newFilters[filterIndex].options![optionIndex],
        [field]: value
      };
      setLocalFilters(newFilters);
      debouncedUpdateWithDelay({ filters: newFilters });
    }
  }, [localFilters, debouncedUpdateWithDelay]);

  // Handle dataset count change
  const handleDatasetCountChange = useCallback((count: number) => {
    setNumDatasets(count);
    const newDatasets = Array.from({ length: count }, (_, index) => {
      const existing = localDatasets[index];
      return existing || {
        label: `Dataset ${index + 1}`,
        backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`
      };
    });
    setLocalDatasets(newDatasets);
    debouncedUpdateWithDelay({ datasets: newDatasets });
  }, [localDatasets, debouncedUpdateWithDelay]);

  // Handle individual dataset field changes
  const handleDatasetFieldChange = useCallback((index: number, field: 'label' | 'backgroundColor', value: string) => {
    const updatedDatasets = [...localDatasets];
    if (!updatedDatasets[index]) {
      updatedDatasets[index] = { label: '', backgroundColor: '' };
    }
    updatedDatasets[index] = { ...updatedDatasets[index], [field]: value };
    setLocalDatasets(updatedDatasets);
    debouncedUpdateWithDelay({ datasets: updatedDatasets });
  }, [localDatasets, debouncedUpdateWithDelay]);

  const renderConfigFields = () => {
    switch (selectedComponentType) {
      case 'dataCard':
        return (
          <DataCardConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'ticketTable':
        return (
          <TableConfig
            localConfig={localConfig}
            localColumns={localColumns}
            numColumns={numColumns}
            localFilters={localFilters}
            numFilters={numFilters}
            handleInputChange={handleInputChange}
            handleColumnCountChange={handleColumnCountChange}
            handleColumnFieldChange={handleColumnFieldChange}
            handleColumnDelete={handleColumnDelete}
            handleFilterCountChange={handleFilterCountChange}
            handleFilterFieldChange={handleFilterFieldChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        );

      case 'leadTable':
      case 'oeLeadsTable':
      case 'inventoryTable':
        return (
          <TableConfig
            localConfig={localConfig as any}
            localColumns={localColumns}
            numColumns={numColumns}
            localFilters={localFilters}
            numFilters={numFilters}
            handleInputChange={handleInputChange}
            handleColumnCountChange={handleColumnCountChange}
            handleColumnFieldChange={handleColumnFieldChange}
            handleColumnDelete={handleColumnDelete}
            handleFilterCountChange={handleFilterCountChange}
            handleFilterFieldChange={handleFilterFieldChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        );

      case 'ticketCarousel':
        return (
          <TicketCarouselConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'leadCarousel':
        return (
          <LeadCardCarouselConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'barGraph':
        return (
          <BasicChartConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'lineChart':
      case 'stackedBarChart':
        return (
          <AdvancedChartConfig
            localConfig={localConfig as any}
            localDatasets={localDatasets}
            numDatasets={numDatasets}
            handleInputChange={handleInputChange}
            handleDatasetCountChange={handleDatasetCountChange}
            handleDatasetFieldChange={handleDatasetFieldChange}
          />
        );

      case 'openModalButton':
        return (
          <OpenModalButtonConfigComponent
            config={localConfig as any}
            onConfigChange={handleInputChange}
          />
        );

      case 'jobManager':
        return (
          <JobManagerConfigComponent
            config={localConfig as any}
            onConfigChange={handleInputChange}
          />
        );

      case 'jobsPage':
        return (
          <JobsPageConfigComponent
            config={localConfig as any}
            onConfigChange={handleInputChange}
          />
        );

      case 'applicantTable':
        return (
          <ApplicantTableConfigComponent
            config={localConfig as any}
            onConfigChange={(key: any, value: any) => handleInputChange(key, value)}
          />
        );
      case 'dynamicScoring':
        return (
          <DynamicScoringConfig
            config={localConfig as any}
            onConfigChange={(newConfig) => {
              // Update all config fields
              Object.entries(newConfig).forEach(([key, value]) => {
                handleInputChange(key as any, value);
              });
            }}
          />
        );

      case 'fileUpload':
        return (
          <FileUploadPageConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'leadAssignment':
        return (
          <LeadAssignmentConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'callAttemptMatrix':
        return (
          <CallAttemptMatrixConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'leadProgressBar':
        return (
          <LeadProgressBarConfig
            config={localConfig as any}
            onConfigChange={(newConfig) => {
              Object.entries(newConfig).forEach(([key, value]) => {
                handleInputChange(key as keyof LocalConfigType, value);
              });
            }}
          />
        );

      case 'routingRules':
        return (
          <RoutingRulesConfigWrapper
            filterFields={localFilterFields}
            title={localConfig.title || ''}
            description={localConfig.description || ''}
            onTitleChange={(title) => handleInputChange('title', title)}
            onDescriptionChange={(description) => handleInputChange('description', description)}
            onFilterFieldsChange={(fields) => {
              setLocalFilterFields(fields);
              debouncedUpdateWithDelay({ filterFields: fields } as any);
            }}
          />
        );

      case 'whatsappTemplate':
        return (
          <WhatsAppTemplateConfig
            localConfig={localConfig as any}
            handleInputChange={(field: string, value: string | number | boolean) => {
              handleInputChange(field as keyof LocalConfigType, value);
            }}
          />
        );

      case 'teamDashboard':
        return (
          <TeamDashboardConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'operationsPrograms':
        return (
          <OperationsProgramsConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'userHierarchy':
        return (
          <UserHierarchyConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'inventoryRequestForm':
        return (
          <div className="space-y-4">
            <div>
              <Label>Default Status</Label>
              <Select
                value={localConfig.defaultStatus || 'DRAFT'}
                onValueChange={(value) => handleInputChange('defaultStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default status" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_REQUEST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Status to set on new inventory requests created from this form.
              </p>
            </div>
          </div>
        );

      default:
        return <div>No configuration available for this component type.</div>;
    }
  };

  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border p-4 shadow-lg z-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h5 className="text-sm font-semibold text-foreground">Component Configuration</h5>
        <CustomButton variant="outline" size="sm" onClick={onClose} className="border-border text-foreground hover:bg-muted">
          Close
        </CustomButton>
      </div>
      <Separator className="mb-4" />
      {renderConfigFields()}
    </aside>
  );
};

const PageBuilder = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [pageName, setPageName] = useState("Untitled Page");
  const [headerTitle, setHeaderTitle] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("components");
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponentData[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  // Update sensors with less restrictive configuration
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [componentConfig, setComponentConfig] = useState<ComponentConfig>({});
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // No activation constraint - so it starts dragging immediately
    }),
    useSensor(KeyboardSensor)
  );

  // Setup droppable canvas area
  // Make the main canvas a droppable area that accepts these component types from the sidebar
  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: 'canvas-drop-area',
    data: { accepts: ['container', 'split', 'form', 'table', 'text', 'button', 'image', 'dataCard', 'leadTable', 'inventoryTable', 'inventoryRequestForm', 'collapseCard','leadCarousel','oeLeadsTable','progressBar','leadProgressBar','ticketTable','ticketCarousel','ticketBarGraph','barGraph','lineChart','stackedBarChart','temporaryLogout','addUser','leadAssignment','callAttemptMatrix','openModalButton','jobManager','jobsPage','applicantTable','fileUpload','dynamicScoring','routingRules','whatsappTemplate','teamDashboard','operationsPrograms','userHierarchy'] }
  });

  // At the top of the PageBuilder component, after your state declarations
  const canvasRef = useRef(null);

  // Add these effects
  useEffect(() => {
    const element = canvasRef.current;
    if (element) {
      element.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    // If editing an existing page, fetch its data
    const fetchPageData = async () => {
      if (pageId && pageId !== 'new') {
        try {
          const { data, error } = await supabase
            .from('pages')
            .select('name, config, role, header_title, display_order')
            .eq('id', pageId)
            .single();

          if (error) throw error;

          if (data) {
            // Supabase `pages.config` stores the canvas components. Older rows might be arrays.
            // Normalize to array of CanvasComponentData.
            setPageName(data.name || 'Untitled Page');
            // Try to get header_title if column exists, otherwise use empty string
            setHeaderTitle((data as any).header_title || '');
            setDisplayOrder((data as any).display_order || 0);
            setCanvasComponents(Array.isArray(data.config) ? (data.config as unknown as CanvasComponentData[]) : []);
            if (data.role) setSelectedRole(data.role);
          } else {
            toast.error("Page not found.");
            navigate('/'); // Redirect if page not found
          }
        } catch (error: any) {
          toast.error(`Error loading page: ${error.message}`);
          navigate('/'); // Redirect on error
        }
      }
    };

    fetchPageData();
  }, [pageId, navigate]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from('custom_tables').select('id, name').eq('tenant_id', tenantId).then(({ data }) => {
      if (data) setCollections(data);
    });
  }, [tenantId]);

  // Ensure all filters in canvas components have proper unique keys
  useEffect(() => {
    if (canvasComponents.length > 0) {
      const updatedComponents = canvasComponents.map(component => {
        if (component.config?.filters && component.config.filters.length > 0) {
          const updatedFilters = component.config.filters.map((filter: FilterConfig, index: number) => {
            if (!filter.key || (typeof filter.key === 'string' && filter.key.trim() === '')) {
              return {
                ...filter,
                key: `filter_${filter.accessor || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              };
            }
            return filter;
          });

          if (JSON.stringify(updatedFilters) !== JSON.stringify(component.config.filters)) {
            return {
              ...component,
              config: {
                ...component.config,
                filters: updatedFilters
              }
            };
          }
        }
        return component;
      });

      if (JSON.stringify(updatedComponents) !== JSON.stringify(canvasComponents)) {
        setCanvasComponents(updatedComponents);
      }
    }
  }, [canvasComponents]);

  // Add useEffect to fetch roles based on tenant_id using API
  useEffect(() => {
    const fetchRoles = async () => {
      if (!tenantId) return;
      
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    
    fetchRoles();
  }, [tenantId]);

  // Handler for when a drag operation starts
  // Track the currently dragged palette item for overlay and canvas highlighting
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(String(active.id));
    setActiveComponent(String(active.id));
  };

  // New handler for when a drag operation moves over a droppable
  // Currently used only to keep DnD-kit state fresh; no side-effects needed
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
  };

  // New handler for when a drag operation moves
  // Could be used for live feedback while dragging (kept minimal for readability)
  const handleDragMove = (event: DragMoveEvent) => {
    // Intentionally left blank
  };

  // Modify the handleDragEnd function with manual drop detection
  // When dropping, either add a new component to the canvas or insert near an existing one
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveComponent(null);

    

    // Manual drop detection if dnd-kit's detection fails
    // Fallback heuristic when DnD-kit fails to detect drop over the canvas
    const manualDetection = () => {
      // Get the canvas element's boundaries
      const element = canvasRef.current;
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      
      // Get the pointer position from the event
      const { clientX, clientY } = event.activatorEvent as PointerEvent;
      
      
      
      // Determine if user dragged from sidebar toward the canvas area
      const deltaX = event.delta.x;
      const deltaY = event.delta.y;
      
      
      
      // If dragged significantly rightward (from sidebar toward canvas)
      // AND cursor is within reasonable vertical range of the canvas
      const isDraggingTowardCanvas = deltaX > 100; // Dragged right significantly
      const isWithinVerticalRange = clientY >= rect.top - 50 && clientY <= rect.bottom + 50;
      
      const isLikelyIntendedForCanvas = isDraggingTowardCanvas && isWithinVerticalRange;
      
      
      
      return isLikelyIntendedForCanvas;
    };

    // Check if dropped over the canvas OR manually detected
    if ((over && over.id === 'canvas-drop-area') || (!over && manualDetection())) {
      const componentType = String(active.id);

      // Check if it's a valid component type we can render
      if (componentMap[componentType]) {
        const newComponent: CanvasComponentData = {
          id: `${componentType}-${Date.now()}`, // Simple unique ID for now
          type: componentType,
          props: {},
          config: {},
        };

        // Add the new component to the canvas state
        setCanvasComponents((prev) => [...prev, newComponent]);
      } else {
        
      }
    } 
    // ADD THIS SECTION to handle drops onto existing components
    else if (over && typeof over.id === 'string' && over.id.includes('-')) {
      // This is likely a component ID (they have format like "container-1234567890")
      const componentType = String(active.id);
      if (!componentMap[componentType]) {
        
        return;
      }

      const newComponent: CanvasComponentData = {
        id: `${componentType}-${Date.now()}`,
        type: componentType,
        props: {},
        config: {},
      };

      // Find the index of the component we dropped on
      const targetId = over.id as string;
      const targetIndex = canvasComponents.findIndex(comp => comp.id === targetId);
      
      if (targetIndex !== -1) {
        // Always insert above the target component (at target index)
        // This ensures the new component appears on top when dropped on an existing component
        setCanvasComponents(prev => {
          const newList = [...prev];
          newList.splice(targetIndex, 0, newComponent);
          return newList;
        });
      } else {
        // Fallback: Add to end
        setCanvasComponents(prev => [...prev, newComponent]);
      }
    }
    else {
      
    }
  };

  // Function to get the overlay component when dragging
  const getDragOverlay = () => {
    if (!activeComponent) return null;
    
    return (
      <div className="p-2 bg-foreground text-background rounded-md shadow-lg text-sm font-medium">
        Dragging: {activeComponent}
      </div>
    );
  };

  // Function to handle component deletion
  const handleDeleteComponent = (idToDelete: string) => {
    setCanvasComponents((prev) =>
      prev.filter(component => component.id !== idToDelete)
    );
  };

  const handleSavePage = async () => {
    if (!user || !tenantId) {
      toast.error("You must be logged in to save.");
      return;
    }
    if (!pageName.trim()) {
      toast.error("Page name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const pageData: any = {
        user_id: user.id,
        tenant_id: tenantId,
        name: pageName.trim(),
        config: canvasComponents as unknown as Json,
        updated_at: new Date().toISOString(),
        role: selectedRole || null,
        display_order: displayOrder,
      };
      
      // Only include header_title if it has a value (optional field)
      if (headerTitle.trim()) {
        pageData.header_title = headerTitle.trim();
      }

      let response;
      if (pageId && pageId !== 'new') {
        // Update existing page row by id
        response = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', pageId);
      } else {
        // Insert new page and return its id (used to navigate to the edit URL)
        response = await supabase
          .from('pages')
          .insert([pageData])
          .select('id')
          .single();
      }

      if (response.error) {
        // If error is about missing column, try saving without header_title
        if (response.error.message?.includes('header_title') || response.error.message?.includes('column')) {
          const pageDataWithoutHeader = { ...pageData };
          delete pageDataWithoutHeader.header_title;
          
          let retryResponse;
          if (pageId && pageId !== 'new') {
            retryResponse = await supabase
              .from('pages')
              .update(pageDataWithoutHeader)
              .eq('id', pageId);
          } else {
            retryResponse = await supabase
              .from('pages')
              .insert([pageDataWithoutHeader])
              .select('id')
              .single();
          }
          
          if (retryResponse.error) throw retryResponse.error;
          toast.success("Page saved successfully! (Header title column not available in database)");
        } else {
          throw response.error;
        }
      } else {
        toast.success("Page saved successfully!");
      }

      // If it was a new page, navigate to the edit URL with the new ID
      if (!(pageId && pageId !== 'new') && response.data?.id) {
          navigate(`/builder/${response.data.id}`, { replace: true });
      }

    } catch (error: any) {
      toast.error(`Error saving page: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Property editor logic
  const selectedComponent = canvasComponents.find(c => c.id === selectedComponentId);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      collisionDetection={rectIntersection}
      accessibility={{ 
        announcements: { 
          onDragStart: () => `Dragging component`,
          onDragOver: () => `Over droppable area`,
          onDragEnd: () => `Drag operation complete`,
          onDragCancel: () => `Drag operation cancelled`
        } 
      }}
    >
      <div className="min-h-screen flex flex-col">
        {/* Builder Header (includes page name input) */}
        <header className="border-b border-border px-6 py-3 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="Page Name"
                className="w-1/3 text-sm font-medium border-border"
              />
              <Input
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Header Title"
                className="w-1/3 text-sm font-medium border-border"
              />
              <div className="flex items-center gap-2 px-2 border-l border-border">
              <Label htmlFor="order" className="text-[10px] uppercase font-bold text-muted-foreground">Order</Label>
              <Input
              id="order"
              type="number"
              value={displayOrder === 0 ? "" : displayOrder}
              onChange={(e) => {
                const val = e.target.value;
                setDisplayOrder(val === "" ? 0 : parseInt(val, 10));
                }}
                // Added Tailwind classes to hide the arrows (spinners)
                className="w-16 h-9 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              </div>
              <CustomButton variant="outline" size="sm" icon={<Eye className="h-4 w-4" />} className="border-border text-foreground hover:bg-muted">
                Preview
              </CustomButton>
              <select
                id="role"
                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <CustomButton variant="default" size="sm" onClick={handleSavePage} disabled={isSaving} loading={isSaving} icon={!isSaving ? <Save className="h-4 w-4" /> : undefined}>
                Save
              </CustomButton>
            </div>
          </div>
        </header>

        {/* Builder Content (Sidebar + Canvas) - Now wrapped */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Components & Settings */}
          <div className="w-[300px] border-r border-border flex flex-col bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-border">
                <TabsList className="w-full rounded-none h-12 bg-muted/50 p-0 gap-0">
                  <TabsTrigger value="components" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Components
                  </TabsTrigger>
                  <TabsTrigger value="layers" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="components" className="m-0 p-0 h-full">
                  <div className="p-4 space-y-4">
                    {/* Layout Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Layout Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="container"
                          label="Container"
                          icon={<Layout className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="split"
                          label="Split View"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="collapseCard"
                          label="Collapse Card"
                          icon={<ChevronDown className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadCarousel"
                          label="Lead Carousel"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketCarousel"
                          label="Ticket Carousel"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketBarGraph"
                          label="Ticket Bar Graph"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="progressBar"
                          label="Progress Bar"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadProgressBar"
                          label="Lead Progress Bar"
                          icon={<Target className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadAssignment"
                          label="Lead Assignment"
                          icon={<Target className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="callAttemptMatrix"
                          label="Call Attempt Matrix"
                          icon={<Settings className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="temporaryLogout"
                          label="Temporary Logout"
                          icon={<LogOut className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Data Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Data Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="form"
                          label="Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="table"
                          label="Table"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dataCard"
                          label="Data Card"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadTable"
                          label="Lead Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="inventoryTable"
                          label="Records Table (API)"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="inventoryRequestForm"
                          label="Inventory Request Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="oeLeadsTable"
                          label="OE Leads Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketTable"
                          label="Ticket Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="addUser"
                          label="Add User"
                          icon={<User className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="routingRules"
                          label="Routing Rules"
                          icon={<Users className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="openModalButton"
                          label="Modal Button"
                          icon={<MousePointer className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="jobManager"
                          label="Job Manager"
                          icon={<Briefcase className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="jobsPage"
                          label="Jobs Board"
                          icon={<Users className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="applicantTable"
                          label="Applicant Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="fileUpload"
                          label="File Upload"
                          icon={<Upload className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dynamicScoring"
                          label="Dynamic Scoring"
                          icon={<Calculator className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="whatsappTemplate"
                          label="WhatsApp Template"
                          icon={<MessageSquare className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>
                    <Separator />
                    {/* Analytical Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Analytical Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="stackedBarChart"
                          label="Stacked Bar Chart"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="lineChart"
                          label="Line Chart"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="barGraph"
                          label="Bar Graph"
                          icon={<Grid3X3 className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Basic Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Basic Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="text"
                          label="Text"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="button"
                          label="Button"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="image"
                          label="Image"
                          icon={<ImageIcon className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Analytics Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Analytics</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="barGraph"
                          label="Bar Graph"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="lineChart"
                          label="Line Chart"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="stackedBarChart"
                          label="Stacked Bar"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="teamDashboard"
                          label="Team Dashboard"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="operationsPrograms"
                          label="Operations & Programs"
                          icon={<Database className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="userHierarchy"
                          label="User Hierarchy"
                          icon={<Users className="h-8 w-8 mb-1 text-primary" />}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layers" className="m-0 p-4 h-full">
                  {/* ... existing Layers content ... */}
                </TabsContent>

                <TabsContent value="settings" className="m-0 p-4 h-full">
                 {/* ... existing Settings content ... */}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Main Canvas - Apply useDroppable ref DIRECTLY to this container */}
          <div
            ref={(node) => {
              // Apply both refs to the same element
              setCanvasRef(node);
              canvasRef.current = node;
            }}
            className={`flex-1 bg-muted/30 overflow-visible border-2 border-border ${
              isOver ? 'border-foreground border-dashed' : 'border-dashed'
            } flex-1 flex flex-col bg-background shadow-sm ${
              activeDragId ? 'ring-2 ring-foreground/20' : ''
            }`}
            data-droppable="true"
            id="canvas-drop-area"
            style={{ minHeight: 'calc(100vh - 150px)' }}
          >
            {/* Optional Header inside the droppable area */}
            <div className="text-center text-muted-foreground text-sm p-2 border-b bg-muted/40 mb-4">
              Drop Zone Canvas {isOver ? "(Item Hovering)" : ""}
            </div>

            {/* Content area within the droppable div */}
            <div
              className={`flex-1 flex flex-col ${
                isOver ? 'bg-muted/50 transition-colors duration-150' : ''
              }`}
            >
              {/* Render dropped components OR placeholder */}
              {canvasComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground flex-1">
                  <Grid3X3 className="h-12 w-12 mb-4" />
                  <p className="text-body-lg-medium">
                    Drop components here
                  </p>
                  <p className="text-body-sm mt-1">
                    Drag from the sidebar onto this area
                  </p>
                  <div className="mt-6">
                    <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                      Choose a Template
                    </Button>
                  </div>
                </div>
              ) : (
                // Render the actual components from state, wrapped in DroppableCanvasItem to enable selection/deletion
                canvasComponents.map((component) => {
                  const ComponentToRender = componentMap[component.type];
                  if (!ComponentToRender) return null;
                  return (
                    <DroppableCanvasItem
                      key={component.id}
                      id={component.id}
                      onDelete={handleDeleteComponent}
                      onSelect={setSelectedComponentId}
                    >
                      <ComponentToRender {...component.props} config={component.config} pageId={pageId} />
                    </DroppableCanvasItem>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add the DragOverlay to show a floating preview when dragging */}
      <DragOverlay style={{ pointerEvents: 'none' }}>
        {activeComponent ? getDragOverlay() : null}
      </DragOverlay>

      {/* Add the configuration panel */}
      {selectedComponentId && (
        <ConfigurationPanel
          selectedComponent={canvasComponents.find(c => c.id === selectedComponentId) || {} as CanvasComponentData}
          setCanvasComponents={setCanvasComponents}
          onClose={() => setSelectedComponentId(null)}
        />
      )}
    </DndContext>
  );
};

export default PageBuilder;
