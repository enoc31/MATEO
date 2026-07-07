import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error: missing Supabase URL or Service Key')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate the user making the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Unauthorized: missing authorization header')
    }

    // Since we use the service_role key to verify, it's safer to use a normal client for verification or just verify token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      throw new Error('Unauthorized: invalid token')
    }

    const { data: profile } = await supabase
      .from('usuarios_perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'administrador') {
      throw new Error('Forbidden: Only administrators can create users')
    }

    const { email, password, nombre_completo, rol } = await req.json()

    if (!email || !password || !nombre_completo || !rol) {
      throw new Error('Missing required fields')
    }

    // 1. Create Auth User
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo,
        rol
      }
    })

    if (createError) throw createError

    // 2. Wait briefly to allow the DB trigger "on_auth_user_created" to finish inserting the row
    await new Promise(resolve => setTimeout(resolve, 800))

    // 3. Update the profile with correct role and auto-approve
    const { error: updateError } = await supabase
      .from('usuarios_perfiles')
      .update({
        nombre_completo,
        rol,
        aprobado: true
      })
      .eq('id', authData.user.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ user: authData.user, message: 'User created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
