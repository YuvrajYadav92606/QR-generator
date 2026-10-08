# Enterprise Ticket QR Code Generator Worker

A high-performance digital terminal for floor staff and operators to generate, verify, and manage QR code tickets, replacing error-prone manual paper and spreadsheet workflows.

Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Vitest** following strict **Test-Driven Development (TDD)** and corporate monochromatic design specifications.

---

## Key Features & Requirements Matrix

| Requirement | Implementation Details |
| :--- | :--- |
| **Happy Path Operations** | Immediate input response, real-time ticket QR code generation, ticket check-in and revocation workflows. |
| **Empty States** | User-friendly "No data found" view with filter reset controls when searches yield 0 results. |
| **Bad Connectivity Simulation** | Network mode toggles for **Online**, **Slow 3G** (~1.5s simulated latency with visual spinner `role="status"`), and **Offline** (local caching resilience). |
| **Input Validation** | Red border and background highlights (`border-red-600 bg-red-950/20`), `aria-invalid="true"`, and alert messages (`role="alert"`) preventing malformed submissions. |
| **Security (XSS)** | Text input sanitization via DOMPurify stripping all HTML tags, `<script>` injections, and event handlers before state storage. |
| **Telemetry Simulation** | Console logging: `[Analytics] User interacted with Ticket QR Code Generator Worker: <ACTION>`, backed by an in-app telemetry stream drawer. |
| **Accessibility (a11y)** | 100% keyboard navigable, high-contrast monochromatic color ratios, ARIA labels, roles, and focus outlines. |
| **Design Handoff** | Monochromatic palette (blacks, slates, zincs, white) with red used exclusively for input error states. 16px/32px spacing steps. |

---

## Architectural Documentation

- **Database Schema (Capstone 1)**: [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — Definitive Entity-Relationship Diagram (ERD), table definitions, constraints, and indexing strategy.
- **API Contracts**: [`API_CONTRACTS.md`](./API_CONTRACTS.md) — OpenAPI 3.1 REST contracts, payload schemas, and error responses.
- **Prompt Engineering Log**: [`PROMPTS.md`](./PROMPTS.md) — Full prompt traceability and iterative TDD history.

---

## Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite (Vitest)
```bash
npm test
```

### 3. Run Linter (Zero warnings)
```bash
npm run lint
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Start Development Server
```bash
npm run dev
```
