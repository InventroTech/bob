import React from "react";
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
  ProcurementTableComponent,
  MyRequestTableComponent,
  PendingApprovalTableComponent,
  RejectedTableComponent,
  VendorIdentifiedTableComponent,
  ProcurementDashboardComponent,
  InventoryRequestFormComponent,
  ProcurementRequestFormComponent,
  TeamDashboardComponent,
  CseAnalyticsComponent,
  OperationsProgramsComponent,
  UserHierarchyComponent,
} from "@/components/page-builder";
import { DataCardComponent } from "@/components/page-builder/DataCardComponent";
import { LeadTableComponent } from "@/components/page-builder/lead-table";
import { CollapseCard } from "@/components/page-builder/ColapsableCardComponent";
import { OpenModalButton } from "@/components/ATScomponents/OpenModalButton";
import { JobManagerComponent } from "@/components/ATScomponents/job-manager";
import { JobsPageComponent } from "@/components/ATScomponents/jobs-page";
import { ApplicantTableComponent } from "@/components/ATScomponents/applicant-table";
import { DynamicScoringComponent } from "@/components/ATScomponents/DynamicScoringComponent";
import { FileUploadPageComponent } from "@/components/page-builder/FileUploadPageComponent";
import { ProgressBar } from "@/components/ui/progressBar";
import { LeadProgressBar } from "@/components/page-builder/LeadProgressBar";
import { CseProgressBar } from "@/components/page-builder/CseProgressBar";
import { TicketTableComponent } from "@/components/page-builder/ticket-table";
import { TicketCarouselWrapper } from "@/components/page-builder/TicketCarouselWrapper";
import { TicketBarGraphComponent } from "@/components/page-builder/TicketBarGraphComponent";
import { LeadCardCarouselWrapper } from "@/components/page-builder/LeadCardCarouselWrapper";
import { TemporaryLogoutComponent } from "@/components/page-builder/TemporaryLogoutComponent";
import { StackedBarChart } from "@/components/AnalyticalComponent/StackedBarChart";
import { LineChart } from "@/components/AnalyticalComponent/LineChart";
import { BarGraph } from "@/components/AnalyticalComponent/BarGraph";
import { OeLeadsTable } from "@/components/page-builder/OeLeadsTable";
import { WhatsAppTemplateComponent } from "@/components/page-builder/WhatsAppTemplateComponent";
import { DispatchCardListComponent } from "@/components/page-builder/DispatchCardListComponent";
import { DispatchDashboardComponent } from "@/components/page-builder/DispatchDashboardComponent";
import type { FilterConfig } from "@/component-config/DynamicFilterConfig";

export interface ComponentConfig {
  apiEndpoint?: string;
  statusDataApiEndpoint?: string;
  apiPrefix?: 'localhost' | 'renderer';
  columns?: Array<{
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
  entityType?: string;
  initialStatus?: string;
  initialStatusText?: string;
  defaultStatus?: string;
  urgencyOptions?: Array<{ label: string; value: string }>;
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
  procurementTable: ProcurementTableComponent,
  myRequestTable: MyRequestTableComponent,
  pendingApprovalTable: PendingApprovalTableComponent,
  rejectedTable: RejectedTableComponent,
  vendorIdentifiedTable: VendorIdentifiedTableComponent,
  procurementDashboard: ProcurementDashboardComponent,
  collapseCard: CollapseCard,
  leadCarousel: LeadCardCarouselWrapper,
  oeLeadsTable: OeLeadsTable,
  progressBar: ProgressBar,
  leadProgressBar: LeadProgressBar,
  cseProgressBar: CseProgressBar,
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
  whatsappTemplate: WhatsAppTemplateComponent,
  teamDashboard: TeamDashboardComponent,
  analyticsBoard: CseAnalyticsComponent,
  operationsPrograms: OperationsProgramsComponent,
  userHierarchy: UserHierarchyComponent,
  inventoryRequestForm: InventoryRequestFormComponent,
  procurementRequestForm: ProcurementRequestFormComponent,
  dispatchCardList: DispatchCardListComponent,
  dispatchDashboard: DispatchDashboardComponent,
};


