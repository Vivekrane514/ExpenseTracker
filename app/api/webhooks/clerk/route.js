import { NextResponse } from 'next/server';

export async function POST(req) {
  return NextResponse.json({ message: 'Original file restored. No webhook processing.' });
}
