# Enterprise Ticket QR Code Generator Worker — Database Schema & Architecture Specification (Capstone 1)

## 1. Executive Summary & Problem Context

The client's floor staff historically managed ticket issuance, verification, and QR code tracking through manual paper slips and unstructured Excel spreadsheets. This caused:
- Severe operational latency at entry points and check-ins
- High data loss rates due to untracked manual edits and concurrent overwrites
- Vulnerability to duplicate ticket redemption and spoofed passes
- Inability to operate reliably during spotty network connectivity or network outages on the event floor

This document establishes the definitive **Entity-Relationship Data Model (ERD)** and relational database specification for the **Digital Ticket QR Code Generator Worker**. The architecture guarantees ACID compliance, idempotent offline-first sync, strict input validation, cryptographic ticket integrity, and tamper-resistant audit trails.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ WORKERS : employs
    ORGANIZATIONS ||--o{ VENUE_EVENTS : hosts
    VENUE_EVENTS ||--o{ TICKET_TYPES : defines
    TICKET_TYPES ||--o{ TICKETS : categorizes
    WORKERS ||--o{ TICKETS : issues
    TICKETS ||--|| QR_CODES : generates
    TICKETS ||--o{ SCAN_LOGS : records
    WORKERS ||--o{ SCAN_LOGS : scans
    WORKERS ||--o{ SYNC_BATCH_LOGS : uploads
    TICKETS ||--o{ AUDIT_LOGS : tracks

    ORGANIZATIONS {
        uuid id PK
        varchar(100) name
        varchar(50) code
        boolean is_active
        timestamp with_time_zone created_at
    }

    WORKERS {
        uuid id PK
        uuid organization_id FK
        varchar(100) worker_code
        varchar(150) full_name
        varchar(100) email
        varchar(30) role
        boolean is_active
        timestamp with_time_zone last_login_at
    }

    VENUE_EVENTS {
        uuid id PK
        uuid organization_id FK
        varchar(200) title
        varchar(100) venue_location
        timestamp with_time_zone event_start_at
        timestamp with_time_zone event_end_at
        varchar(20) status
    }

    TICKET_TYPES {
        uuid id PK
        uuid venue_event_id FK
        varchar(50) tier_name
        numeric price
        integer max_capacity
        boolean allow_reentry
    }

    TICKETS {
        uuid id PK
        uuid ticket_type_id FK
        uuid issued_by_worker_id FK
        varchar(64) ticket_number UK
        varchar(150) attendee_name
        varchar(150) attendee_email
        varchar(50) attendee_phone
        varchar(30) status
        varchar(64) idempotency_key UK
        boolean is_offline_created
        timestamp with_time_zone issued_at
        timestamp with_time_zone updated_at
    }

    QR_CODES {
        uuid id PK
        uuid ticket_id FK,UK
        varchar(128) qr_payload_hash UK
        text qr_encoded_string
        varchar(32) signature_algorithm
        varchar(255) digital_signature
        timestamp with_time_zone expires_at
        integer scan_count
        timestamp with_time_zone created_at
    }

    SCAN_LOGS {
        uuid id PK
        uuid ticket_id FK
        uuid scanned_by_worker_id FK
        varchar(30) scan_result
        varchar(100) device_id
        varchar(50) network_state_at_scan
        timestamp with_time_zone scanned_at
    }

    SYNC_BATCH_LOGS {
        uuid id PK
        uuid worker_id FK
        varchar(64) client_batch_id UK
        integer total_records
        integer processed_records
        varchar(30) sync_status
        timestamp with_time_zone created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid ticket_id FK
        uuid worker_id FK
        varchar(50) action_type
        jsonb previous_state
        jsonb new_state
        timestamp with_time_zone logged_at
    }
```

---

## 3. Detailed Table Specifications & Data Dictionaries

### 3.1 Table: `organizations`
Represents the tenant or enterprise division hosting ticketed events and operations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique tenant identifier |
| `name` | `VARCHAR(100)` | `NOT NULL` | Business legal/operating name |
| `code` | `VARCHAR(50)` | `NOT NULL, UNIQUE` | Normalized identifier (e.g. `CORP_GLOBAL`) |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Active tenant flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Registration timestamp |

---

### 3.2 Table: `workers`
Represents the floor staff, operators, and supervisors using the digital Ticket QR Code Generator Worker application.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique worker identifier |
| `organization_id` | `UUID` | `NOT NULL, REFERENCES organizations(id)` | Associated tenant |
| `worker_code` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Badge / Staff ID (e.g. `STF-8492`) |
| `full_name` | `VARCHAR(150)` | `NOT NULL` | Worker full name |
| `email` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Enterprise email |
| `role` | `VARCHAR(30)` | `NOT NULL CHECK (role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN'))` | RBAC role |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Employment status |
| `last_login_at` | `TIMESTAMPTZ` | `NULL` | Last session initiation timestamp |

---

### 3.3 Table: `venue_events`
Defines operational sessions, corporate events, conferences, or gate zones.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Event session identifier |
| `organization_id` | `UUID` | `NOT NULL, REFERENCES organizations(id)` | Owning organization |
| `title` | `VARCHAR(200)` | `NOT NULL` | Event / Shift title |
| `venue_location` | `VARCHAR(100)` | `NOT NULL` | Gate, building, or hall location |
| `event_start_at` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled start |
| `event_end_at` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled completion |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'))` | Lifecycle stage |

---

### 3.4 Table: `ticket_types`
Configures ticket tiers, pricing rules, and entrance restrictions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Tier identifier |
| `venue_event_id` | `UUID` | `NOT NULL, REFERENCES venue_events(id)` | Target event |
| `tier_name` | `VARCHAR(50)` | `NOT NULL` | e.g. `GENERAL_ADMISSION`, `VIP`, `STAFF`, `CONTRACTOR` |
| `price` | `NUMERIC(10,2)`| `NOT NULL DEFAULT 0.00` | Face value in enterprise base currency |
| `max_capacity` | `INTEGER` | `NOT NULL CHECK (max_capacity >= 0)` | Maximum tickets allowed for tier |
| `allow_reentry` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Re-entry permission toggle |

---

### 3.5 Table: `tickets`
The central transaction record replacing manual paper and Excel spreadsheets.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique ticket record ID |
| `ticket_type_id` | `UUID` | `NOT NULL, REFERENCES ticket_types(id)` | Ticket class |
| `issued_by_worker_id`| `UUID` | `NOT NULL, REFERENCES workers(id)` | Staff member who issued the ticket |
| `ticket_number` | `VARCHAR(64)` | `NOT NULL, UNIQUE` | Human-readable barcode/ticket reference (e.g. `TCK-2026-9812A`) |
| `attendee_name` | `VARCHAR(150)`| `NOT NULL` | Customer / attendee full name (sanitized) |
| `attendee_email`| `VARCHAR(150)`| `NOT NULL` | Notification / verification email |
| `attendee_phone`| `VARCHAR(50)` | `NULL` | Contact telephone number |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'VALIDATED', 'EXPIRED', 'REVOKED'))` | Redemption status |
| `idempotency_key`| `VARCHAR(64)` | `NOT NULL, UNIQUE` | Client-generated UUID preventing duplicate creation across spotty network retries |
| `is_offline_created` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | True if generated locally during network loss |
| `issued_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Last status mutation |

---

### 3.6 Table: `qr_codes`
Stores the verifiable payload, hash, and cryptographic signature encoded into the visual 2D matrix.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique QR record ID |
| `ticket_id` | `UUID` | `NOT NULL, UNIQUE, REFERENCES tickets(id) ON DELETE CASCADE` | 1:1 relationship with ticket |
| `qr_payload_hash` | `VARCHAR(128)`| `NOT NULL, UNIQUE` | SHA-256 fingerprint of the serialized payload |
| `qr_encoded_string`| `TEXT` | `NOT NULL` | Raw JSON payload or signed JWT token string |
| `signature_algorithm`| `VARCHAR(32)`| `NOT NULL DEFAULT 'Ed25519'` | Algorithm used for cryptographic validation |
| `digital_signature`| `VARCHAR(255)`| `NOT NULL` | Signature verifying payload origin |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Expiry cutoff for validity |
| `scan_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Cumulative scan attempts |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Generation timestamp |

---

### 3.7 Table: `scan_logs`
High-velocity audit and entrance log recording every scanner worker verification attempt.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Scan event ID |
| `ticket_id` | `UUID` | `NOT NULL, REFERENCES tickets(id)` | Target ticket |
| `scanned_by_worker_id`| `UUID` | `NOT NULL, REFERENCES workers(id)` | Scanning operator |
| `scan_result` | `VARCHAR(30)` | `NOT NULL CHECK (scan_result IN ('SUCCESS', 'DUPLICATE_ATTEMPT', 'EXPIRED', 'REVOKED', 'INVALID_SIGNATURE'))` | Outcome |
| `device_id` | `VARCHAR(100)`| `NOT NULL` | Floor hardware/browser fingerprint |
| `network_state_at_scan`| `VARCHAR(50)`| `NOT NULL DEFAULT 'ONLINE'` | Network context (`ONLINE`, `SLOW_3G`, `OFFLINE_SYNCED`) |
| `scanned_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Event timestamp |

---

### 3.8 Table: `sync_batch_logs`
Tracks bulk synchronization packets dispatched from floor workers operating in offline or high-latency scenarios.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Internal sync batch ID |
| `worker_id` | `UUID` | `NOT NULL, REFERENCES workers(id)` | Submitting worker |
| `client_batch_id`| `VARCHAR(64)` | `NOT NULL, UNIQUE` | Client-generated batch GUID |
| `total_records` | `INTEGER` | `NOT NULL CHECK (total_records >= 0)` | Dispatched item count |
| `processed_records`| `INTEGER` | `NOT NULL DEFAULT 0` | Successfully committed records |
| `sync_status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'RECEIVED' CHECK (sync_status IN ('RECEIVED', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAIL', 'FAILED'))` | Ingestion status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Upload initiation |

---

### 3.9 Table: `audit_logs`
Tamper-evident record of all lifecycle events and state mutations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Audit log ID |
| `ticket_id` | `UUID` | `NOT NULL, REFERENCES tickets(id)` | Target ticket |
| `worker_id` | `UUID` | `NOT NULL, REFERENCES workers(id)` | Acting staff member |
| `action_type` | `VARCHAR(50)` | `NOT NULL` | `TICKET_ISSUED`, `QR_REGENERATED`, `TICKET_VALIDATED`, `TICKET_REVOKED` |
| `previous_state` | `JSONB` | `NULL` | Prior record state |
| `new_state` | `JSONB` | `NOT NULL` | Mutated record state |
| `logged_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()` | Event timestamp |

---

## 4. Indexing & Optimization Strategy

1. **Idempotency & Duplicate Prevention**:
   ```sql
   CREATE UNIQUE INDEX idx_tickets_idempotency ON tickets(idempotency_key);
   CREATE UNIQUE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
   CREATE UNIQUE INDEX idx_qr_codes_hash ON qr_codes(qr_payload_hash);
   ```
2. **Floor Query Latency Reduction (< 5ms lookups)**:
   ```sql
   CREATE INDEX idx_tickets_search ON tickets(issued_by_worker_id, status, issued_at DESC);
   CREATE INDEX idx_tickets_attendee ON tickets(attendee_email, attendee_name);
   CREATE INDEX idx_scan_logs_ticket ON scan_logs(ticket_id, scanned_at DESC);
   ```
3. **Partitioning**:
   - `scan_logs` and `audit_logs` are partitioned by month on `scanned_at` / `logged_at` to maintain peak index performance as historical volume scales into millions of records.
