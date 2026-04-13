import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, properties } = body ?? {}

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Log to server console (replace with DB insert or external analytics later)
    console.log('[analytics]', JSON.stringify({ event, properties, ts: new Date().toISOString() }))

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
