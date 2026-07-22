import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import QRCode from 'qrcode'

const FIRST_TABLE = 1
const LAST_TABLE = 23
const OUTPUT_DIRECTORY = resolve(process.cwd(), 'public', 'qrcodes')

function getBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!configuredUrl) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL não foi definida. Configure a URL pública antes de gerar os QR Codes.'
    )
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(configuredUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL deve ser uma URL absoluta válida.')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('NEXT_PUBLIC_APP_URL deve utilizar o protocolo http ou https.')
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL não pode conter credenciais, query string ou fragmento.'
    )
  }

  return parsedUrl.toString().replace(/\/$/, '')
}

async function generateQrCodes() {
  const baseUrl = getBaseUrl()
  await mkdir(OUTPUT_DIRECTORY, { recursive: true })

  for (let tableNumber = FIRST_TABLE; tableNumber <= LAST_TABLE; tableNumber += 1) {
    const tableLabel = String(tableNumber).padStart(2, '0')
    const tableUrl = `${baseUrl}/mesa/${tableNumber}`
    const svg = await QRCode.toString(tableUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    await writeFile(
      resolve(OUTPUT_DIRECTORY, `mesa-${tableLabel}.svg`),
      svg,
      'utf8'
    )
  }

  console.log(`23 QR Codes gerados em public/qrcodes usando a base ${baseUrl}`)
}

generateQrCodes().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Falha ao gerar QR Codes: ${message}`)
  process.exitCode = 1
})
