# Inventory Flow Database Schema Plan

## Overview
This document outlines the proposed database schema for the Inventory Flow application using Supabase (PostgreSQL). The schema supports asset inventory management, waybill creation and returns, site management, employee tracking, and vehicle management.

## Entities and Tables

### 1. Sites
**Purpose**: Stores information about different sites/locations where assets are managed.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `location` (TEXT, NOT NULL)
- `description` (TEXT)
- `contact_person` (TEXT)
- `phone` (TEXT)
- `status` (ENUM: 'active', 'inactive', DEFAULT 'active')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2. Employees
**Purpose**: Stores employee information for drivers, managers, etc.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `role` (TEXT, NOT NULL) // e.g., 'driver', 'manager'
- `phone` (TEXT)
- `email` (TEXT)
- `status` (ENUM: 'active', 'inactive', DEFAULT 'active')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3. Vehicles
**Purpose**: Stores vehicle information used for transportation.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL) // e.g., "Toyota Hilux - ABC-123D"
- `type` (TEXT) // e.g., 'truck', 'van'
- `registration_number` (TEXT)
- `status` (ENUM: 'active', 'maintenance', 'inactive', DEFAULT 'active')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 4. Assets
**Purpose**: Core table for asset inventory.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `quantity` (INTEGER, NOT NULL, DEFAULT 0)
- `unit_of_measurement` (TEXT, NOT NULL)
- `category` (ENUM: 'dewatering', 'waterproofing')
- `type` (ENUM: 'consumable', 'non-consumable', 'tools', 'equipment')
- `location` (TEXT)
- `site_id` (UUID, Foreign Key to sites.id)
- `service` (TEXT)
- `status` (ENUM: 'active', 'damaged', 'missing', 'maintenance', DEFAULT 'active')
- `condition` (ENUM: 'excellent', 'good', 'fair', 'poor', DEFAULT 'good')
- `missing_count` (INTEGER, DEFAULT 0)
- `damaged_count` (INTEGER, DEFAULT 0)
- `purchase_date` (DATE)
- `cost` (DECIMAL(10,2))
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 5. Waybills
**Purpose**: Tracks waybills for asset movement to sites.

**Columns**:
- `id` (UUID, Primary Key)
- `site_id` (UUID, NOT NULL, Foreign Key to sites.id)
- `driver_id` (UUID, Foreign Key to employees.id)
- `vehicle_id` (UUID, Foreign Key to vehicles.id)
- `issue_date` (TIMESTAMPTZ, NOT NULL)
- `expected_return_date` (TIMESTAMPTZ)
- `purpose` (TEXT, NOT NULL)
- `service` (TEXT, NOT NULL)
- `status` (ENUM: 'outstanding', 'return_initiated', 'return_completed', 'sent_to_site', DEFAULT 'outstanding')
- `type` (ENUM: 'waybill', 'return', DEFAULT 'waybill')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6. Waybill Items
**Purpose**: Junction table linking waybills to assets with quantities.

**Columns**:
- `id` (UUID, Primary Key)
- `waybill_id` (UUID, NOT NULL, Foreign Key to waybills.id)
- `asset_id` (UUID, NOT NULL, Foreign Key to assets.id)
- `quantity` (INTEGER, NOT NULL)
- `returned_quantity` (INTEGER, DEFAULT 0)
- `status` (ENUM: 'outstanding', 'return_initiated', 'return_completed', 'lost', 'damaged', DEFAULT 'outstanding')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 7. Quick Checkouts
**Purpose**: For quick asset checkouts to employees.

**Columns**:
- `id` (UUID, Primary Key)
- `asset_id` (UUID, NOT NULL, Foreign Key to assets.id)
- `employee_id` (UUID, Foreign Key to employees.id)
- `quantity` (INTEGER, NOT NULL)
- `checkout_date` (TIMESTAMPTZ, NOT NULL)
- `expected_return_days` (INTEGER, NOT NULL)
- `status` (ENUM: 'outstanding', 'return_completed', 'lost', 'damaged', DEFAULT 'outstanding')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 8. Return Bills
**Purpose**: Tracks return of assets from waybills.

**Columns**:
- `id` (UUID, Primary Key)
- `waybill_id` (UUID, NOT NULL, Foreign Key to waybills.id)
- `return_date` (TIMESTAMPTZ, NOT NULL)
- `received_by` (TEXT, NOT NULL)
- `condition` (ENUM: 'good', 'damaged', 'missing', DEFAULT 'good')
- `notes` (TEXT)
- `status` (ENUM: 'initiated', 'completed', DEFAULT 'initiated')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 9. Return Items
**Purpose**: Details of returned items in a return bill.

**Columns**:
- `id` (UUID, Primary Key)
- `return_bill_id` (UUID, NOT NULL, Foreign Key to return_bills.id)
- `asset_id` (UUID, NOT NULL, Foreign Key to assets.id)
- `quantity` (INTEGER, NOT NULL)
- `condition` (ENUM: 'good', 'damaged', 'missing', DEFAULT 'good')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 10. Company Settings
**Purpose**: Stores company-wide settings (single row table).

**Columns**:
- `id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `company_name` (TEXT, NOT NULL)
- `logo` (TEXT) // URL or base64
- `address` (TEXT, NOT NULL)
- `phone` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL)
- `website` (TEXT)
- `currency` (TEXT, DEFAULT 'USD')
- `date_format` (ENUM: 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', DEFAULT 'MM/dd/yyyy')
- `theme` (ENUM: 'light', 'dark', 'system', DEFAULT 'system')
- `notifications_email` (BOOLEAN, DEFAULT TRUE)
- `notifications_push` (BOOLEAN, DEFAULT TRUE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

## Relationships
- Assets → Sites (many-to-one)
- Waybills → Sites (many-to-one)
- Waybills → Employees (many-to-one, driver)
- Waybills → Vehicles (many-to-one)
- Waybill Items → Waybills (many-to-one)
- Waybill Items → Assets (many-to-one)
- Quick Checkouts → Assets (many-to-one)
- Quick Checkouts → Employees (many-to-one)
- Return Bills → Waybills (many-to-one)
- Return Items → Return Bills (many-to-one)
- Return Items → Assets (many-to-one)

## Indexes
- Assets: site_id, status, category, type
- Waybills: site_id, status, issue_date
- Waybill Items: waybill_id, asset_id, status
- Quick Checkouts: asset_id, status, checkout_date
- Return Bills: waybill_id, status
- Return Items: return_bill_id, asset_id

## Constraints
- Asset quantity >= 0
- Waybill Item quantity > 0
- Quick Checkout quantity > 0
- Return Item quantity > 0
- Unique company settings (only one row)

## Migration Steps
1. Create enum types
2. Create tables in order: sites, employees, vehicles, assets, waybills, waybill_items, quick_checkouts, return_bills, return_items, company_settings
3. Add foreign key constraints
4. Add indexes
5. Insert default company settings row
6. Update Supabase types.ts

## Next Steps
- Implement the schema in Supabase dashboard or via migrations
- Update the types.ts file with new table definitions
- Modify frontend code to use database instead of localStorage for employees and vehicles
- Add RLS policies for security
- Create API functions for CRUD operations
