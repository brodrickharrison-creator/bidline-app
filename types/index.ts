/**
 * Core TypeScript types for BidLine application
 *
 * This file contains all shared types used throughout the application.
 * These types ensure type safety and make the data structures clear.
 */

import { ProjectStatus, InvoiceStatus } from "@prisma/client";

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  name: string;
  clientName: string | null;
  status: ProjectStatus;
  totalBudget: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface ProjectWithRelations extends Project {
  budgetLines: BudgetLine[];
  invoices: Invoice[];
  _count?: {
    invoices: number;
  };
}

export interface ProjectSummary extends Project {
  budgetLines: BudgetLine[];
  _count: {
    invoices: number;
  };
}

// ============================================================================
// BUDGET LINE TYPES
// ============================================================================

export interface BudgetLine {
  id: string;
  category: string;
  lineNumber: number;
  name: string;
  quantity: number | null;
  days: number | null;
  rate: number | null;
  ot1_5: number | null;
  ot2: number | null;
  ot2_5: number | null;
  estimate: number;
  actualSpent: number;
  projectId: string;
  payeeId: string | null;
  payee: Contact | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLineInput {
  category: string;
  lineNumber: number;
  name: string;
  quantity?: number;
  days?: number;
  rate?: number;
  ot1_5?: number;
  ot2?: number;
  ot2_5?: number;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface Invoice {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  status: InvoiceStatus;
  payeeId: string | null;
  payee: Contact | null;
  projectId: string;
  budgetLineId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceWithRelations extends Invoice {
  project: Project;
  budgetLine: BudgetLine | null;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string;
  amount: number;
  projectId: string;
  budgetLineId?: string;
  payeeId?: string;
  status?: InvoiceStatus;
  fileName?: string;
}

export interface ExternalInvoiceUpload {
  email: string;
  amount: number;
  invoiceNumber?: string;
  fileName?: string;
}

// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactWithStats extends Contact {
  _count: {
    invoices: number;
  };
  totalPaid: number;
}

export interface CreateContactInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalBudget: number;
  totalSpent: number;
  projectsCount: number;
  invoicesCount: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CreateProjectFormData {
  name: string;
  clientName: string;
  budgetLines: BudgetLineInput[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectResponse extends ApiResponse {
  project?: ProjectWithRelations;
  projectId?: string;
}

export interface InvoiceResponse extends ApiResponse {
  invoice?: InvoiceWithRelations;
}

export interface ContactResponse extends ApiResponse {
  contact?: Contact;
}
