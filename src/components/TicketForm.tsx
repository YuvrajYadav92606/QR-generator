import React, { useState } from 'react'
import type { TicketFormData, FormErrors } from '../types/ticket'
import { sanitizeInput } from '../utils/sanitize'
import { QrCode, AlertCircle, Loader2 } from 'lucide-react'

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => Promise<void>
  isLoading: boolean
}

export const TicketForm: React.FC<TicketFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<TicketFormData>({
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    ticketType: 'General',
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (data: TicketFormData): FormErrors => {
    const errs: FormErrors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!data.attendeeName || data.attendeeName.trim().length === 0) {
      errs.attendeeName = 'Attendee name is required.'
    } else if (data.attendeeName.trim().length < 2) {
      errs.attendeeName = 'Attendee name must be at least 2 characters.'
    }

    if (!data.attendeeEmail || data.attendeeEmail.trim().length === 0) {
      errs.attendeeEmail = 'Valid email address is required.'
    } else if (!emailRegex.test(data.attendeeEmail.trim())) {
      errs.attendeeEmail = 'Valid email address is required.'
    }

    return errs
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    // Sanitize user inputs against XSS payloads before storing in state
    const cleanValue = sanitizeInput(value)

    setFormData((prev) => ({
      ...prev,
      [name]: cleanValue,
    }))

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleBlur = (field: keyof TicketFormData) => {
    if (formData[field]) {
      const fieldErrors = validate(formData)
      if (fieldErrors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: fieldErrors[field as keyof FormErrors] }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clean all inputs
    const sanitizedSubmission: TicketFormData = {
      attendeeName: sanitizeInput(formData.attendeeName),
      attendeeEmail: sanitizeInput(formData.attendeeEmail),
      attendeePhone: sanitizeInput(formData.attendeePhone),
      ticketType: formData.ticketType,
      notes: sanitizeInput(formData.notes),
    }

    const validationErrors = validate(sanitizedSubmission)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      // Focus on first offending field
      const firstInvalidField = Object.keys(validationErrors)[0]
      const el = document.getElementById(firstInvalidField)
      if (el) el.focus()
      return
    }

    await onSubmit(sanitizedSubmission)

    // Reset form after successful submission
    setFormData({
      attendeeName: '',
      attendeeEmail: '',
      attendeePhone: '',
      ticketType: 'General',
      notes: '',
    })
    setErrors({})
  }

  return (
    <section
      aria-labelledby="ticket-form-heading"
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
        <div className="p-2.5 bg-zinc-800 rounded border border-zinc-700">
          <QrCode className="w-5 h-5 text-zinc-100" aria-hidden="true" />
        </div>
        <div>
          <h2 id="ticket-form-heading" className="text-lg font-semibold text-zinc-100 tracking-tight">
            Issue Ticket QR Pass
          </h2>
          <p className="text-xs text-zinc-400">
            Generate verifiable encrypted 2D barcodes for floor admissions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Attendee Name */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="attendeeName"
              className="text-xs font-medium uppercase tracking-wider text-zinc-300"
            >
              Attendee Full Name <span className="text-red-500">*</span>
            </label>
            {errors.attendeeName && (
              <span
                id="attendeeName-error"
                role="alert"
                className="text-xs text-red-500 flex items-center gap-1 font-mono"
              >
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {errors.attendeeName}
              </span>
            )}
          </div>
          <input
            id="attendeeName"
            name="attendeeName"
            type="text"
            required
            autoComplete="name"
            aria-required="true"
            aria-invalid={Boolean(errors.attendeeName)}
            aria-describedby={errors.attendeeName ? 'attendeeName-error' : undefined}
            value={formData.attendeeName}
            onChange={handleChange}
            onBlur={() => handleBlur('attendeeName')}
            placeholder="e.g. Jordan Vance"
            disabled={isLoading}
            className={`w-full px-4 py-2.5 text-sm rounded bg-zinc-950 text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
              errors.attendeeName
                ? 'border-2 border-red-600 bg-red-950/20 text-red-100 focus:border-red-500'
                : 'border border-zinc-700 hover:border-zinc-600'
            }`}
          />
        </div>

        {/* Attendee Email */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="attendeeEmail"
              className="text-xs font-medium uppercase tracking-wider text-zinc-300"
            >
              Attendee Email Address <span className="text-red-500">*</span>
            </label>
            {errors.attendeeEmail && (
              <span
                id="attendeeEmail-error"
                role="alert"
                className="text-xs text-red-500 flex items-center gap-1 font-mono"
              >
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {errors.attendeeEmail}
              </span>
            )}
          </div>
          <input
            id="attendeeEmail"
            name="attendeeEmail"
            type="email"
            required
            autoComplete="email"
            aria-required="true"
            aria-invalid={Boolean(errors.attendeeEmail)}
            aria-describedby={errors.attendeeEmail ? 'attendeeEmail-error' : undefined}
            value={formData.attendeeEmail}
            onChange={handleChange}
            onBlur={() => handleBlur('attendeeEmail')}
            placeholder="e.g. j.vance@enterprise.com"
            disabled={isLoading}
            className={`w-full px-4 py-2.5 text-sm rounded bg-zinc-950 text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
              errors.attendeeEmail
                ? 'border-2 border-red-600 bg-red-950/20 text-red-100 focus:border-red-500'
                : 'border border-zinc-700 hover:border-zinc-600'
            }`}
          />
        </div>

        {/* Tier & Phone row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ticketType"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-2"
            >
              Ticket Tier / Access Level
            </label>
            <select
              id="ticketType"
              name="ticketType"
              aria-label="Ticket Tier"
              value={formData.ticketType}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-sm rounded bg-zinc-950 border border-zinc-700 text-zinc-100 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-100"
            >
              <option value="General">General Admission</option>
              <option value="VIP">VIP Access</option>
              <option value="Staff">Floor Staff / Operations</option>
              <option value="Contractor">Vendor / Contractor</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="attendeePhone"
              className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-2"
            >
              Contact Phone (Optional)
            </label>
            <input
              id="attendeePhone"
              name="attendeePhone"
              type="tel"
              autoComplete="tel"
              aria-label="Contact Phone"
              value={formData.attendeePhone}
              onChange={handleChange}
              placeholder="+1-555-0199"
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-sm rounded bg-zinc-950 border border-zinc-700 text-zinc-100 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-100"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-2"
          >
            Gate / Operational Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            aria-label="Operational Notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Special accommodations, gate assignments, or badges..."
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm rounded bg-zinc-950 border border-zinc-700 text-zinc-100 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-100 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            aria-label="Generate QR Ticket"
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded bg-zinc-100 text-zinc-950 font-semibold text-sm hover:bg-white active:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {isLoading ? (
              <span role="status" className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" aria-hidden="true" />
                <span>Generating QR Ticket...</span>
              </span>
            ) : (
              <>
                <QrCode className="w-4 h-4 text-zinc-900" aria-hidden="true" />
                <span>Generate QR Ticket</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
