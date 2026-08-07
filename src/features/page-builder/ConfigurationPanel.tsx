import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { debounce } from "lodash";
import { OpenModalButtonConfigComponent } from "@/components/ATScomponents/configs/OpenModalButtonConfig";
import { JobManagerConfigComponent } from "@/components/ATScomponents/configs/JobManagerConfig";
import { JobsPageConfigComponent } from "@/components/ATScomponents/configs/JobsPageConfig";
import { ApplicantTableConfigComponent } from "@/components/ATScomponents/configs/ApplicantTableConfig";
import { DynamicScoringConfig } from "@/components/ATScomponents/configs/DynamicScoringConfig";
import { FileUploadPageConfig } from "@/components/page-builder/FileUploadPageConfig";
import { TeamDashboardConfig, CseAnalyticsConfig, OperationsProgramsConfig, UserHierarchyConfig } from "@/components/page-builder";
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
} from "@/component-config";
import { TicketTableConfig } from "@/components/page-builder/component-config/TicketTableConfig";
import { LeadProgressBarConfig } from "@/components/page-builder/component-config/LeadProgressBarConfig";
import { CseProgressBarConfig } from "@/components/page-builder/component-config/CseProgressBarConfig";
import { WhatsAppTemplateConfig } from "@/components/page-builder/component-config/WhatsAppTemplateConfig";
import { FileUploadConfig } from "@/components/ATScomponents/configs/FileUploadConfig";
import { DispatchCardListConfigPanel } from "@/components/page-builder/component-config/DispatchCardListConfig";
import { DispatchDashboardConfigPanel } from "@/components/page-builder/component-config/DispatchDashboardConfig";
import { ProcurementDashboardConfigPanel } from "@/components/page-builder/component-config/ProcurementDashboardConfig";
import { AddUserConfig } from "@/components/page-builder/component-config/AddUserConfig";
import { ProcurementDashboardConfigPanel } from "@/components/page-builder/component-config/ProcurementDashboardConfig";
import type { FilterConfig } from "@/component-config/DynamicFilterConfig";
import type { CanvasComponentData, ComponentConfig } from "./componentMap";

// Add this interface near the top with other interfaces
interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
  linkField?: string;
  editableInTable?: boolean;
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

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ selectedComponent, setCanvasComponents, onClose }) => {
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
    /** Records table: entity type for API (e.g. inventory_request, inventory_item). */
    entityType?: string;
    /** Records table: row click behavior — lead card, record detail modal, receive shipment modal, none, or auto (infer from entityType). */
    detailMode?: 'lead_card' | 'inventory_request' | 'record_form_modal' | 'inventory_payment_modal' | 'receive_shipments' | 'lead_assignment_modal' | 'none' | 'auto';
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
    // AddUser specific fields
    userScope?: 'all' | 'under_me';
    umFormFields?: string[];
    umColumns?: string[];
    umCustomFields?: Array<{
      key: string;
      label: string;
      type: 'string' | 'number' | 'boolean';
      showInForm: boolean;
      showInTable: boolean;
    }>;
    // InventoryRequestForm specific fields
    initialStatus?: string;
    initialStatusText?: string;
    defaultStatus?: string;
    urgencyOptions?: Array<{ label: string; value: string }>;
    // Records / procurement tables (leadTable / inventoryTable / procurementTable): items table mode
    tableType?: 'default' | 'itemsTable';
    statusButtons?: Array<{
      label: string;
      statusValue: string;
      targetAttribute?: string;
      statusText?: string;
      conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
      openWarningModal?: boolean;
      warningModalConfig?: {
        title?: string;
        description?: string;
        confirmationText?: string;
        formType?: 'payment_confirmation';
        paymentMethods?: string[];
      };
    }>;
    /** Per-field config for record detail modal: which data keys are editable (key + editable toggle). */
    modalFieldConfig?: Array<{ key: string; editable: boolean }>;
    /** 'default' | 'form_edit' — form_edit = inventory-form-style modal with action buttons. */
    recordDetailModalType?: 'default' | 'form_edit';
    /** For form_edit modal: fields (key, label, enabled). */
    formModalFields?: Array<{ key: string; label: string; enabled: boolean; link?: boolean }>;
    formModalTitle?: string;
    formModalDescription?: string;
    paymentModalConfig?: import('@/component-config').PaymentModalConfig;
    showFormModalSaveButton?: boolean;
    /** manager = Approve/Reject; team_lead = Order only; auto = from role. */
    inventoryWorkflowMode?: 'auto' | 'manager' | 'team_lead';
    /** Form-style modal: show extra “Final price” block. Default true when omitted. */
    showFinalPriceSection?: boolean;
    /** Requestor-side Delete request (any status when on). Default false. */
    showDeleteRequestButton?: boolean;
    /** Show "See request history" button in record modals. */
    showHistoryButton?: boolean;
    modalFlags?: import('@/component-config').ModalFlagConfig[];
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
    // AddUser
    userScope: (initialConfig as any).userScope || 'all',
    umFormFields: (initialConfig as any).umFormFields ?? undefined,
    umColumns: (initialConfig as any).umColumns ?? undefined,
    umCustomFields: (initialConfig as any).umCustomFields ?? undefined,
    // InventoryRequestForm (empty by default so user can set from config)
    initialStatus: (initialConfig as any).initialStatus ?? (initialConfig as any).defaultStatus ?? '',
    initialStatusText: (initialConfig as any).initialStatusText ?? '',
    defaultStatus: (initialConfig as any).defaultStatus ?? '',
    urgencyOptions: (initialConfig as any).urgencyOptions ?? undefined,
    redirectAfterSubmitPageName: (initialConfig as any).redirectAfterSubmitPageName ?? '',
    // Records table: items table + status buttons
    tableType: (initialConfig as any).tableType || 'default',
    statusButtons: (initialConfig as any).statusButtons ?? [],
    modalFieldConfig: (initialConfig as any).modalFieldConfig ?? [],
    recordDetailModalType: (initialConfig as any).recordDetailModalType ?? 'default',
    formModalFields: (initialConfig as any).formModalFields ?? [],
    formModalTitle: (initialConfig as any).formModalTitle ?? '',
    formModalDescription: (initialConfig as any).formModalDescription ?? '',
    paymentModalConfig: (initialConfig as any).paymentModalConfig ?? undefined,
    showFormModalSaveButton: (initialConfig as any).showFormModalSaveButton ?? undefined,
    inventoryWorkflowMode: (initialConfig as any).inventoryWorkflowMode ?? 'auto',
    showFinalPriceSection: (initialConfig as any).showFinalPriceSection ?? undefined,
    showDeleteRequestButton: (initialConfig as any).showDeleteRequestButton ?? false,
    showHistoryButton: (initialConfig as any).showHistoryButton ?? false,
    modalFlags: (initialConfig as any).modalFlags ?? [],
  });

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

  // Accumulate rapid patches so multi-field resets (e.g. "simple All Requests")
  // don't lose all but the last field to lodash debounce's last-call-wins behavior.
  const pendingConfigUpdatesRef = useRef<Partial<ComponentConfig>>({});
  const flushPendingConfigUpdates = useCallback(() => {
    const updates = pendingConfigUpdatesRef.current;
    if (!updates || Object.keys(updates).length === 0) return;
    pendingConfigUpdatesRef.current = {};
    debouncedUpdate(updates);
  }, [debouncedUpdate]);

  const scheduleConfigUpdate = useMemo(
    () => debounce(flushPendingConfigUpdates, 500),
    [flushPendingConfigUpdates]
  );

  useEffect(() => {
    return () => {
      scheduleConfigUpdate.flush();
      scheduleConfigUpdate.cancel();
    };
  }, [scheduleConfigUpdate]);

  const queueConfigUpdate = useCallback(
    (updates: Partial<ComponentConfig>) => {
      pendingConfigUpdatesRef.current = {
        ...pendingConfigUpdatesRef.current,
        ...updates,
      };
      scheduleConfigUpdate();
    },
    [scheduleConfigUpdate]
  );

  const debouncedUpdateWithDelay = queueConfigUpdate;

  // Handle local input changes
  const handleInputChange = useCallback((field: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    queueConfigUpdate({ [field]: value } as Partial<ComponentConfig>);
  }, [queueConfigUpdate]);

  /** Apply several config fields in one patch (avoids lost updates on reset buttons). */
  const handleConfigPatch = useCallback((patch: Partial<LocalConfigType>) => {
    setLocalConfig((prev) => ({ ...prev, ...patch }));
    queueConfigUpdate(patch as Partial<ComponentConfig>);
  }, [queueConfigUpdate]);

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
  const handleColumnFieldChange = useCallback((index: number, field: string, value: string | boolean) => {
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

  const handleFilterDelete = useCallback(
    (index: number) => {
      const newFilters = localFilters.filter((_, i) => i !== index);
      setLocalFilters(newFilters);
      setNumFilters(newFilters.length);
      debouncedUpdateWithDelay({ filters: newFilters });
    },
    [localFilters, debouncedUpdateWithDelay]
  );

  const handleFilterFieldChange = useCallback((index: number, field: keyof FilterConfig, value: string | FilterConfig['options'] | boolean) => {
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

  const handleFilterOptionChange = useCallback((filterIndex: number, optionIndex: number, field: string, value: string) => {
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

  const handleReplaceFilters = useCallback(
    (filters: FilterConfig[]) => {
      setLocalFilters(filters);
      setNumFilters(filters.length);
      debouncedUpdateWithDelay({ filters });
    },
    [debouncedUpdateWithDelay]
  );

  const handleFilterOptionsSourceChange = useCallback((index: number, source: 'manual' | 'api') => {
    const newFilters = [...localFilters];
    const current = (newFilters[index] || {}) as any;
    if (source === 'api') {
      newFilters[index] = {
        ...current,
        optionsApiUrl: '/membership/roles',
        optionsDisplayKey: 'name',
        optionsValueKey: 'id',
        options: [],
      } as any;
    } else {
      newFilters[index] = {
        ...current,
        optionsApiUrl: '',
        optionsDisplayKey: '',
        optionsValueKey: '',
        options: (current.options?.length ? current.options : [{ label: '', value: '' }]) as FilterConfig['options'],
      } as any;
    }
    setLocalFilters(newFilters);
    debouncedUpdateWithDelay({ filters: newFilters });
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
            handleFilterDelete={handleFilterDelete}
            handleFilterFieldChange={handleFilterFieldChange}
            handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        );

      case 'leadTable':
      case 'oeLeadsTable':
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
            handleFilterDelete={handleFilterDelete}
            handleFilterFieldChange={handleFilterFieldChange}
            handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        );

      case 'dispatchCardList':
        return (
          <DispatchCardListConfigPanel
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
            localFilters={localFilters}
            numFilters={numFilters}
            onReplaceFilters={handleReplaceFilters}
            handleFilterCountChange={handleFilterCountChange}
            handleFilterDelete={handleFilterDelete}
            handleFilterFieldChange={handleFilterFieldChange}
            handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        );

      case 'dispatchDashboard':
        return (
          <DispatchDashboardConfigPanel
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'procurementDashboard':
        return (
          <ProcurementDashboardConfigPanel
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
          />
        );

      case 'inventoryTable':
      case 'procurementTable':
      case 'myRequestTable':
      case 'pendingApprovalTable':
      case 'rejectedTable':
      case 'vendorIdentifiedTable':
        return (
          <TableConfig
            profile="inventory"
            localConfig={localConfig as any}
            localColumns={localColumns}
            numColumns={numColumns}
            localFilters={localFilters}
            numFilters={numFilters}
            handleInputChange={handleInputChange}
            handleConfigPatch={handleConfigPatch as any}
            handleColumnCountChange={handleColumnCountChange}
            handleColumnFieldChange={handleColumnFieldChange}
            handleColumnDelete={handleColumnDelete}
            handleFilterCountChange={handleFilterCountChange}
            handleFilterDelete={handleFilterDelete}
            handleFilterFieldChange={handleFilterFieldChange}
            handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
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

      case 'cseProgressBar':
        return (
          <CseProgressBarConfig
            config={localConfig as any}
            onConfigChange={(newConfig) => {
              Object.entries(newConfig).forEach(([key, value]) => {
                handleInputChange(key as keyof LocalConfigType, value);
              });
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

      case 'analyticsBoard':
        return (
          <CseAnalyticsConfig
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

      case 'addUser':
        return (
          <AddUserConfig
            localConfig={localConfig as any}
            handleInputChange={handleInputChange}
            handleConfigPatch={handleConfigPatch}
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
      case 'procurementRequestForm': {
        const defaultEntityType =
          selectedComponentType === 'procurementRequestForm' ? 'unmannd_request' : 'inventory_request';
        const defaultUrgencyOptions = [
          { value: 'LOW', label: 'Low' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'HIGH', label: 'High' },
          { value: 'CRITICAL', label: 'Critical' },
        ];

        const currentUrgencyOptions =
          localConfig.urgencyOptions !== undefined && localConfig.urgencyOptions.length >= 0
            ? localConfig.urgencyOptions
            : defaultUrgencyOptions;

        return (
          <div className="space-y-4">
            <div>
              <Label>Entity type</Label>
              <Input
                value={localConfig.entityType ?? defaultEntityType}
                onChange={(e) => handleInputChange('entityType', e.target.value)}
                placeholder={defaultEntityType}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entity type to save (e.g. {defaultEntityType}).
              </p>
            </div>

            <div>
              <Label>Initial status</Label>
              <Input
                value={localConfig.initialStatus ?? localConfig.defaultStatus ?? ''}
                onChange={(e) => handleInputChange('initialStatus', e.target.value)}
                placeholder="e.g. NEW_REQUEST"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Status for new requests. Leave empty to use default (NEW_REQUEST).
              </p>
            </div>

            <div>
              <Label>Initial status text</Label>
              <Input
                value={localConfig.initialStatusText ?? ''}
                onChange={(e) => handleInputChange('initialStatusText', e.target.value)}
                placeholder="e.g. Team admin review pending"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Friendly status label saved as <code className="bg-muted px-1 rounded">data.status_text</code> on create.
              </p>
            </div>

            <div>
              <Label>Redirect after submit (page name)</Label>
              <Input
                value={(localConfig as { redirectAfterSubmitPageName?: string }).redirectAfterSubmitPageName ?? ''}
                onChange={(e) => handleInputChange('redirectAfterSubmitPageName', e.target.value)}
                placeholder="My Requests"
              />
              <p className="text-xs text-muted-foreground mt-1">
                After Create Request, go to this sidebar page. Defaults to “My Request” / “My Requests”.
              </p>
            </div>

            <div>
              <Label>Urgency options</Label>
              <div className="space-y-2 mt-2">
                {(currentUrgencyOptions ?? defaultUrgencyOptions).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.value}
                      onChange={(e) => {
                        const next = [...(currentUrgencyOptions ?? defaultUrgencyOptions)];
                        next[idx] = { ...next[idx], value: e.target.value };
                        handleInputChange('urgencyOptions', next);
                      }}
                      placeholder="Value (e.g. HIGH)"
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...(currentUrgencyOptions ?? defaultUrgencyOptions)];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleInputChange('urgencyOptions', next);
                      }}
                      placeholder="Label (e.g. High)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        const next = [...(currentUrgencyOptions ?? defaultUrgencyOptions)].filter((_, i) => i !== idx);
                        handleInputChange('urgencyOptions', next);
                      }}
                      disabled={(currentUrgencyOptions ?? defaultUrgencyOptions).length <= 1}
                      aria-label="Remove urgency option"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [...(currentUrgencyOptions ?? defaultUrgencyOptions), { value: '', label: '' }];
                    handleInputChange('urgencyOptions', next);
                  }}
                >
                  Add option
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Picker values saved into `urgency_level`.
              </p>
            </div>
          </div>
        );
      }

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

