import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { sanitizeInput } from '../utils/sanitize'
import { logTelemetry } from '../utils/telemetry'

describe('Ticket QR Code Generator Worker — TDD Acceptance Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('1. Security: XSS Sanitization NFR', () => {
    it('sanitizes malicious script tags and event handlers from text inputs', () => {
      const maliciousScript = '<script>alert("xss")</script>John Doe'
      const sanitized = sanitizeInput(maliciousScript)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert("xss")')
      expect(sanitized).toContain('John Doe')
    })

    it('sanitizes onerror image tags and javascript URI schemes', () => {
      const maliciousPayload = '<img src=x onerror=alert(1)>Jane Doe'
      const sanitized = sanitizeInput(maliciousPayload)
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('<img')
      expect(sanitized).toContain('Jane Doe')
    })

    it('preserves spaces during user typing without accidental trimming', () => {
      const typed = 'First Middle Last'
      expect(sanitizeInput(typed)).toBe('First Middle Last')
    })
  })

  describe('2. Telemetry Simulation NFR', () => {
    it('logs specific analytics message to console on primary user interactions', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logTelemetry('GENERATE_TICKET', { ticketId: 'TCK-001' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Analytics] User interacted with Ticket QR Code Generator Worker: GENERATE_TICKET'),
        expect.anything()
      )
      consoleSpy.mockRestore()
    })
  })

  describe('3. Unhappy Path: Form Validation and Red Field Highlighting', () => {
    it('prevents submission on empty required fields and highlights offending fields in red', async () => {
      const user = userEvent.setup()
      render(<App />)

      const submitButton = screen.getByRole('button', { name: /generate qr ticket/i })
      await user.click(submitButton)

      // Offending fields should have aria-invalid="true" and red border class
      const nameInput = screen.getByLabelText(/attendee full name/i)
      const emailInput = screen.getByLabelText(/attendee email address/i)

      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')

      // Offending inputs must have red styling
      expect(nameInput.className).toMatch(/red/)
      expect(emailInput.className).toMatch(/red/)

      // Validation error messages must be shown
      expect(screen.getByText(/attendee name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument()
    })

    it('highlights email field in red when malformed email is provided', async () => {
      const user = userEvent.setup()
      render(<App />)

      const nameInput = screen.getByLabelText(/attendee full name/i)
      const emailInput = screen.getByLabelText(/attendee email address/i)
      const submitButton = screen.getByRole('button', { name: /generate qr ticket/i })

      await user.type(nameInput, 'Alex Morgan')
      await user.type(emailInput, 'invalid-email-string')
      await user.click(submitButton)

      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      expect(emailInput.className).toMatch(/red/)
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument()
    })
  })

  describe('4. Unhappy Path: Empty States', () => {
    it('displays user-friendly "No data found" message when search or filter returns no tickets', async () => {
      const user = userEvent.setup()
      render(<App />)

      const searchInput = screen.getByLabelText(/search tickets/i)
      await user.type(searchInput, 'NonExistentTicketQuery12345')

      const emptyState = screen.getByText(/no data found/i)
      expect(emptyState).toBeInTheDocument()
    })

    it('allows clearing search filters from the empty state', async () => {
      const user = userEvent.setup()
      render(<App />)

      const searchInput = screen.getByLabelText(/search tickets/i)
      await user.type(searchInput, 'RandomQueryXYZ')

      const clearBtn = screen.getByRole('button', { name: /clear all active filters/i })
      await user.click(clearBtn)

      expect(searchInput).toHaveValue('')
    })
  })

  describe('5. Unhappy Path & Resilience: Bad Connectivity (Slow 3G & Offline)', () => {
    it('displays a visual loading indicator during asynchronous QR generation', async () => {
      const user = userEvent.setup()
      render(<App />)

      const nameInput = screen.getByLabelText(/attendee full name/i)
      const emailInput = screen.getByLabelText(/attendee email address/i)
      const submitButton = screen.getByRole('button', { name: /generate qr ticket/i })

      await user.type(nameInput, 'Taylor Swift')
      await user.type(emailInput, 'taylor@example.com')
      await user.click(submitButton)

      // A visual loading indicator should be rendered during async processing
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Eventually the ticket appears
      await waitFor(() => {
        expect(screen.getByText(/Taylor Swift/i)).toBeInTheDocument()
      })
    })

    it('allows toggling network modes to test Slow 3G and Offline resilience', async () => {
      const user = userEvent.setup()
      render(<App />)

      const slow3gButton = screen.getByRole('button', { name: /simulate slow 3g/i })
      await user.click(slow3gButton)

      expect(screen.getByText(/slow 3g active/i)).toBeInTheDocument()

      const offlineButton = screen.getByRole('button', { name: /simulate offline/i })
      await user.click(offlineButton)

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
    })
  })

  describe('6. Happy Path: Ticket Generation & Monochromatic Enterprise UI', () => {
    it('successfully creates and displays a ticket with QR code and triggers telemetry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const user = userEvent.setup()
      render(<App />)

      const nameInput = screen.getByLabelText(/attendee full name/i)
      const emailInput = screen.getByLabelText(/attendee email address/i)
      const submitButton = screen.getByRole('button', { name: /generate qr ticket/i })

      await user.type(nameInput, 'Jordan Vance')
      await user.type(emailInput, 'jordan.vance@enterprise.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Jordan Vance')).toBeInTheDocument()
      })

      // QR Code image is present with accessible alt text
      const qrImage = screen.getByAltText(/qr code for ticket/i)
      expect(qrImage).toBeInTheDocument()

      // Telemetry log verified
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Analytics] User interacted with Ticket QR Code Generator Worker: GENERATE_TICKET'),
        expect.anything()
      )
      consoleSpy.mockRestore()
    })

    it('allows floor worker to check in and validate an issued ticket', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Generate a ticket
      await user.type(screen.getByLabelText(/attendee full name/i), 'Marcus Aurelius')
      await user.type(screen.getByLabelText(/attendee email address/i), 'marcus@rome.org')
      await user.click(screen.getByRole('button', { name: /generate qr ticket/i }))

      await waitFor(() => {
        expect(screen.getByText('Marcus Aurelius')).toBeInTheDocument()
      })

      // Click Check-In
      const checkInBtn = screen.getByRole('button', { name: /validate and redeem ticket/i })
      await user.click(checkInBtn)

      // Status badge should update to Validated
      await waitFor(() => {
        expect(screen.getByText('Validated')).toBeInTheDocument()
      })
    })

    it('allows floor worker to revoke a ticket', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Generate a ticket
      await user.type(screen.getByLabelText(/attendee full name/i), 'Revoke Target')
      await user.type(screen.getByLabelText(/attendee email address/i), 'target@corp.com')
      await user.click(screen.getByRole('button', { name: /generate qr ticket/i }))

      await waitFor(() => {
        expect(screen.getByText('Revoke Target')).toBeInTheDocument()
      })

      const revokeBtn = screen.getByRole('button', { name: /revoke ticket/i })
      await user.click(revokeBtn)

      await waitFor(() => {
        expect(screen.getByText('Revoked')).toBeInTheDocument()
      })
    })
  })

  describe('7. Non-Functional Requirement: 100% Accessibility (a11y)', () => {
    it('ensures all interactive elements have ARIA attributes and labels', () => {
      render(<App />)

      const interactiveButtons = screen.getAllByRole('button')
      interactiveButtons.forEach((btn) => {
        const hasAriaLabel = btn.hasAttribute('aria-label')
        const hasTextContent = !!btn.textContent?.trim()
        expect(hasAriaLabel || hasTextContent).toBe(true)
      })

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        const hasAriaLabel = input.hasAttribute('aria-label')
        const hasLabel = input.hasAttribute('id') && document.querySelector(`label[for="${input.id}"]`)
        expect(hasAriaLabel || Boolean(hasLabel)).toBe(true)
      })
    })

    it('opens and closes the telemetry event drawer with accessible dialog attributes', async () => {
      const user = userEvent.setup()
      render(<App />)

      const openDrawerBtn = screen.getByRole('button', { name: /view telemetry pings stream/i })
      await user.click(openDrawerBtn)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-modal', 'true')

      const closeBtn = screen.getByRole('button', { name: /close telemetry logs drawer/i })
      await user.click(closeBtn)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
