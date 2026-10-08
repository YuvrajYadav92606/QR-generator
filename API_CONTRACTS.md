# Enterprise Ticket QR Code Generator Worker — API Contracts Specification (Capstone 1)

## 1. Overview & General Conventions

This document outlines the OpenAPI 3.1 REST contracts and real-time event interfaces powering the **Digital Ticket QR Code Generator Worker**.

### Global Standards:
- **Base URL**: `https://api.tickets.enterprise.internal/v1`
- **Content-Type**: `application/json`
- **Authentication**: `Bearer <JWT_TOKEN>` with worker identity claims.
- **Idempotency**: All `POST` / `PUT` endpoints accept `Idempotency-Key: <UUID>` header to safeguard operations against network timeouts and offline retries.
- **Error Format**: Strict RFC 7807 (`application/problem+json`) with validation error field arrays.

---

## 2. API Endpoints

### 2.1 Issue Single Ticket & QR Code
- **Method & Path**: `POST /tickets`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Idempotency-Key: <uuid-v4>`
- **Request Body**:
```json
{
  "ticketTypeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "attendeeName": "Jordan Vance",
  "attendeeEmail": "jordan.vance@enterprise.com",
  "attendeePhone": "+1-555-0199",
  "venueEventId": "a8098c1a-f86e-11da-bd1a-00112444be1e",
  "notes": "VIP Floor Access",
  "isOfflineCreated": false,
  "clientTimestamp": "2026-10-06T10:15:30Z"
}
```
- **Responses**:
  - `201 Created`:
  ```json
  {
    "ticket": {
      "id": "e7b0a880-9943-41c1-9dc3-e8ecce49b6d8",
      "ticketNumber": "TCK-2026-88219",
      "attendeeName": "Jordan Vance",
      "attendeeEmail": "jordan.vance@enterprise.com",
      "attendeePhone": "+1-555-0199",
      "status": "ISSUED",
      "ticketType": "VIP",
      "issuedAt": "2026-10-06T10:15:31Z",
      "qr": {
        "id": "8b0870f2-b7e6-42d4-bb39-50c2688b5608",
        "qrPayloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "qrEncodedString": "{\"t\":\"TCK-2026-88219\",\"u\":\"Jordan Vance\",\"s\":\"ISSUED\",\"h\":\"a7f4bc\"}",
        "expiresAt": "2026-10-07T00:00:00Z"
      }
    }
  }
  ```
  - `400 Bad Request` (Validation Failure):
  ```json
  {
    "type": "https://api.tickets.enterprise.internal/errors/validation-failed",
    "title": "Validation Failed",
    "status": 400,
    "detail": "One or more input fields failed validation constraints.",
    "invalidParams": [
      {
        "name": "attendeeEmail",
        "reason": "Invalid email address format."
      }
    ]
  }
  ```
  - `409 Conflict`: Duplicate idempotency key or ticket number.

---

### 2.2 Query & Filter Tickets (with Empty State Specification)
- **Method & Path**: `GET /tickets`
- **Query Parameters**:
  - `query` (string, optional): Search keyword matching ticket number, name, or email.
  - `status` (string, optional): Filter by `ISSUED`, `VALIDATED`, `REVOKED`, `EXPIRED`.
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 20): Page size.
- **Responses**:
  - `200 OK` (With Results):
  ```json
  {
    "items": [
      {
        "id": "e7b0a880-9943-41c1-9dc3-e8ecce49b6d8",
        "ticketNumber": "TCK-2026-88219",
        "attendeeName": "Jordan Vance",
        "attendeeEmail": "jordan.vance@enterprise.com",
        "status": "ISSUED",
        "tierName": "VIP",
        "issuedAt": "2026-10-06T10:15:31Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalRecords": 1,
      "totalPages": 1
    }
  }
  ```
  - `200 OK` (Empty Result State):
  ```json
  {
    "items": [],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalRecords": 0,
      "totalPages": 0
    },
    "message": "No data found"
  }
  ```

---

### 2.3 Verify / Redeem Ticket QR Code
- **Method & Path**: `POST /tickets/verify`
- **Request Body**:
```json
{
  "qrPayload": "{\"t\":\"TCK-2026-88219\",\"u\":\"Jordan Vance\",\"s\":\"ISSUED\",\"h\":\"a7f4bc\"}",
  "deviceId": "FLOOR-SCANNER-TAB-04",
  "networkMode": "ONLINE"
}
```
- **Responses**:
  - `200 OK`:
  ```json
  {
    "verified": true,
    "scanResult": "SUCCESS",
    "ticketNumber": "TCK-2026-88219",
    "attendeeName": "Jordan Vance",
    "status": "VALIDATED",
    "validatedAt": "2026-10-06T10:30:00Z"
  }
  ```
  - `422 Unprocessable Entity`:
  ```json
  {
    "verified": false,
    "scanResult": "DUPLICATE_ATTEMPT",
    "message": "Ticket has already been redeemed at Gate 2.",
    "firstScannedAt": "2026-10-06T10:15:00Z"
  }
  ```

---

### 2.4 Offline Batch Synchronization
- **Method & Path**: `POST /sync/offline-batch`
- **Request Body**:
```json
{
  "clientBatchId": "d3b07384-d113-49d6-8438-cf9dd0915f02",
  "workerId": "7a35368a-bfe0-4b20-8025-b467ec6a6669",
  "records": [
    {
      "idempotencyKey": "9426f43e-a86d-473d-82d8-bf542a197607",
      "ticketNumber": "TCK-2026-90111",
      "attendeeName": "Morgan Reed",
      "attendeeEmail": "morgan.reed@corp.net",
      "tierName": "General Admission",
      "issuedAt": "2026-10-06T10:02:15Z"
    }
  ]
}
```
- **Responses**:
  - `200 OK`:
  ```json
  {
    "batchId": "d3b07384-d113-49d6-8438-cf9dd0915f02",
    "status": "COMPLETED",
    "totalAccepted": 1,
    "totalConflicts": 0
  }
  ```

---

### 2.5 Telemetry & Audit Ping Endpoint
- **Method & Path**: `POST /telemetry/event`
- **Request Body**:
```json
{
  "eventName": "User interacted with Ticket QR Code Generator Worker",
  "action": "TICKET_GENERATED",
  "workerId": "7a35368a-bfe0-4b20-8025-b467ec6a6669",
  "metadata": {
    "ticketNumber": "TCK-2026-88219",
    "networkState": "ONLINE",
    "clientLatencyMs": 14
  },
  "timestamp": "2026-10-06T10:15:32Z"
}
```
- **Responses**:
  - `204 No Content`
