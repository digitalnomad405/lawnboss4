// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('Test function starting...')

serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: 'Hello from test function' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    }
  )
}) 