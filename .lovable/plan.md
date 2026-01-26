

# Advanced Commission Management System - Implementation Plan

## Executive Summary

This plan extends the existing Commission module to provide a comprehensive commission management system with professional rate management, detailed tracking, payment status workflows, interactive charts, and role-based access control.

---

## Current State Analysis

### Existing Infrastructure

**Database Tables:**
- `professional_commissions` - Stores commission rates per professional/barbershop
- `commission_payments` - Tracks payment records with period, amounts, and status
- `professionals` - Has a `commission_percentage` field (legacy)

**Existing Components:**
- `CommissionDashboard.tsx` - Full-featured dashboard with filters, charts, and rate management
- `PayoutsPage.tsx` - Handles payout creation and status updates
- `CommissionsPage.tsx` - Currently a placeholder scaffold

**Route Configuration:**
- Route at `professionals/commissions` is registered but shows placeholder content

---

## Implementation Strategy

### Phase 1: Database Schema Extensions

**New Tables:**

1. **commission_items** - Granular commission records per booking
```text
+---------------------------+-------------------+
| Column                    | Type              |
+---------------------------+-------------------+
| id                        | uuid (PK)         |
| barbershop_id             | uuid (FK)         |
| professional_id           | uuid (FK)         |
| booking_id                | uuid (FK)         |
| source_type               | enum              |
| occurred_at               | timestamptz       |
| gross_amount              | numeric(10,2)     |
| applied_commission_rate   | numeric(5,2)      |
| commission_amount         | numeric(10,2)     |
| payment_status            | enum              |
| paid_at                   | timestamptz       |
| created_at, updated_at    | timestamptz       |
+---------------------------+-------------------+
```

2. **commission_rate_history** - Audit trail for rate changes
```text
+---------------------------+-------------------+
| Column                    | Type              |
+---------------------------+-------------------+
| id                        | uuid (PK)         |
| professional_id           | uuid (FK)         |
| barbershop_id             | uuid (FK)         |
| old_rate_percent          | numeric(5,2)      |
| new_rate_percent          | numeric(5,2)      |
| changed_at                | timestamptz       |
| changed_by_user_id        | uuid (FK)         |
+---------------------------+-------------------+
```

3. **commission_payment_logs** - Bulk payment audit records
```text
+---------------------------+-------------------+
| Column                    | Type              |
+---------------------------+-------------------+
| id                        | uuid (PK)         |
| barbershop_id             | uuid (FK)         |
| professional_id           | uuid (nullable)   |
| commission_item_ids       | uuid[]            |
| paid_at                   | timestamptz       |
| paid_by_user_id           | uuid (FK)         |
| note                      | text              |
+---------------------------+-------------------+
```

**Enums:**
- `commission_source_type`: APPOINTMENT, ORDER, INVOICE, OTHER
- `commission_payment_status`: PENDING, PAID

**Database Functions:**
- Trigger to auto-create `commission_items` when bookings are completed
- Function to snapshot current commission rate at booking completion

---

### Phase 2: Page Structure

The module will use the existing route at `professionals/commissions` with internal tabs:

**Tab 1: Overview (Default)**
- Filter bar with period presets, professional selector, payment status
- 4 KPI cards: Total Gross, Total Commission, Total Paid, Total Pending
- Charts section (ADMIN only): Time series, Bar by professional, Pie for status
- Commission items table with pagination, sorting, actions

**Tab 2: Rate Management (ADMIN only)**
- Professional list with current rates
- Edit modal with validation (0-100, 2 decimal places)
- Rate change history viewer

---

### Phase 3: Component Architecture

```text
CommissionsPage.tsx
+-- CommissionFilters.tsx
|   +-- DateRangePresets
|   +-- ProfessionalSelect
|   +-- StatusSelect
|   +-- SearchInput
|
+-- CommissionKPICards.tsx (4 cards)
|
+-- CommissionCharts.tsx (ADMIN only)
|   +-- TimeSeriesChart (grouped by period)
|   +-- ProfessionalBarChart (top 10 + Other)
|   +-- StatusPieChart (Paid vs Pending)
|
+-- CommissionItemsTable.tsx
|   +-- Pagination (10/25/50)
|   +-- Sorting (occurredAt, professional, amounts, status)
|   +-- Row Actions (Mark as Paid)
|   +-- Bulk Selection + Actions
|
+-- ProfessionalRatesTab.tsx (ADMIN only)
|   +-- RatesTable
|   +-- EditRateModal
|   +-- RateHistoryTable
```

---

### Phase 4: Business Logic

**Commission Calculation:**
```text
commissionAmount = grossAmount * (appliedCommissionRatePercent / 100)
```

**Rate Snapshot Rule:**
- When a booking is completed, the current `professional_commissions.commission_rate` is copied to `commission_items.applied_commission_rate`
- Editing a professional's rate does NOT retroactively update existing `commission_items`

**Payment Workflow:**
1. Default status: PENDING
2. Mark as PAID: Sets `payment_status=PAID`, `paid_at=now()`
3. Prevent re-payment: Disable action for already PAID items, show toast error if attempted
4. Create `commission_payment_logs` entry on each payment action

**Filtering:**
- All KPI totals and charts must reflect the currently filtered dataset
- URL query params persist filter state for sharing/refresh

---

### Phase 5: Permission Matrix

| Action                          | ADMIN | STANDARD |
|---------------------------------|-------|----------|
| View commission items table     | Yes   | Yes      |
| View KPI cards                  | Yes   | Yes      |
| View charts                     | Yes   | No       |
| Mark item as paid (single)      | Yes   | No       |
| Mark items as paid (bulk)       | Yes   | No       |
| Access rate management tab      | Yes   | No       |
| Edit professional rates         | Yes   | No       |
| View rate change history        | Yes   | No       |

**Implementation:**
- UI: Conditional rendering based on `useUserRole().isAdmin(barbershopId)`
- Backend: RLS policies using `is_barbershop_admin()` function

---

## Technical Details

### Database Migration SQL

```sql
-- Create enums
CREATE TYPE commission_source_type AS ENUM ('APPOINTMENT', 'ORDER', 'INVOICE', 'OTHER');
CREATE TYPE commission_payment_status AS ENUM ('PENDING', 'PAID');

-- commission_items table
CREATE TABLE public.commission_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  source_type commission_source_type NOT NULL DEFAULT 'APPOINTMENT',
  occurred_at TIMESTAMPTZ NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  applied_commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status commission_payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- commission_rate_history table
CREATE TABLE public.commission_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  old_rate_percent NUMERIC(5,2),
  new_rate_percent NUMERIC(5,2) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by_user_id UUID NOT NULL
);

-- commission_payment_logs table
CREATE TABLE public.commission_payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  commission_item_ids UUID[] NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by_user_id UUID NOT NULL,
  note TEXT
);

-- Indexes for performance
CREATE INDEX idx_commission_items_barbershop ON commission_items(barbershop_id);
CREATE INDEX idx_commission_items_professional ON commission_items(professional_id);
CREATE INDEX idx_commission_items_occurred_at ON commission_items(occurred_at);
CREATE INDEX idx_commission_items_payment_status ON commission_items(payment_status);

-- RLS Policies
ALTER TABLE commission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payment_logs ENABLE ROW LEVEL SECURITY;

-- View policies (admin of barbershop can view)
CREATE POLICY "Admin can view commission_items"
  ON commission_items FOR SELECT
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- Insert/Update policies for commission_items (admin only)
CREATE POLICY "Admin can update commission_items"
  ON commission_items FOR UPDATE
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- Similar policies for other tables...
```

### Hooks Structure

```typescript
// src/hooks/useCommissionItems.tsx
// Fetches commission_items with filters, pagination, sorting

// src/hooks/useCommissionKPIs.tsx
// Computes totals from filtered data

// src/hooks/useCommissionRates.tsx
// Manages professional commission rates with history

// src/hooks/useCommissionPayments.tsx
// Handles mark-as-paid mutations (single and bulk)
```

### Filter State Management

```typescript
interface CommissionFilters {
  periodPreset: 'day' | 'week' | 'month' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  professionalId: string | 'all';
  paymentStatus: 'all' | 'PENDING' | 'PAID';
  search: string;
}

// URL sync using useSearchParams
```

### Chart Configuration

**Time Series Grouping:**
| Preset | Grouping        |
|--------|-----------------|
| Day    | By hour         |
| Week   | By day          |
| Month  | By day          |
| Year   | By month        |
| Custom | By day          |

**Bar Chart:** Top 10 professionals by commission, rest aggregated as "Outros"

**Pie Chart:** Commission amounts split by PAID vs PENDING

---

## Files to Create/Modify

### New Files

1. `src/pages/admin/professionals/CommissionsPage.tsx` (replace placeholder)
2. `src/components/admin/commissions/CommissionFilters.tsx`
3. `src/components/admin/commissions/CommissionKPICards.tsx`
4. `src/components/admin/commissions/CommissionCharts.tsx`
5. `src/components/admin/commissions/CommissionItemsTable.tsx`
6. `src/components/admin/commissions/ProfessionalRatesTab.tsx`
7. `src/components/admin/commissions/EditRateModal.tsx`
8. `src/components/admin/commissions/RateHistoryTable.tsx`
9. `src/components/admin/commissions/BulkPaymentDialog.tsx`
10. `src/hooks/useCommissionItems.tsx`
11. `src/hooks/useCommissionRates.tsx`

### Modified Files

1. `src/App.tsx` - No changes needed (route already exists)
2. Database migration for new tables
3. Optionally update existing booking triggers to auto-create commission_items

---

## Validation & Error Handling

- **Date validation:** Inline error if custom startDate > endDate
- **Rate input:** 0-100 range, max 2 decimals
- **API errors:** Toast notifications with specific messages
- **Loading states:** Skeleton loaders for KPIs, charts, and table
- **Empty states:** Graceful handling when no data matches filters

---

## Testing Requirements

1. Rate snapshot verification: Editing rate should not affect existing items
2. Filter synchronization: Table, KPIs, and charts must match
3. Payment actions: Single and bulk mark-as-paid create logs correctly
4. Permission enforcement: STANDARD users cannot access admin features
5. Edge cases: Empty filters, invalid dates, no results

---

## Demo Data Seed

If needed, the migration will include seed data:
- 8 professionals with varying rates (5%, 10%, 12.5%, 15%, etc.)
- 120 commission items over the last 90 days
- 70% PENDING, 30% PAID
- Rate history entries for at least 2 professionals

