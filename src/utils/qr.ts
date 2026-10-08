import QRCode from 'qrcode'

/**
 * Generates an SVG data URL for a structured ticket QR payload.
 * Using SVG output ensures crisp vector rendering at any scale,
 * and eliminates canvas dependency in testing and headless environments.
 */
export async function generateTicketQRCode(payload: string): Promise<string> {
  try {
    const svgString = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
  } catch (error) {
    console.error('Failed to generate QR code SVG', error)
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#ffffff"/><text x="100" y="100" text-anchor="middle" fill="#000000" font-family="monospace" font-size="12">QR</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`
  }
}
