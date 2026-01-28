import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Schema validation
    const createBarberSchema = z.object({
      barbershop_id: z.string().uuid(),
      name: z.string().min(2).max(100).trim(),
      email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
      password: z.string()
        .min(8, "Senha deve ter no mínimo 8 caracteres")
        .max(100)
        .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
        .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
      phone: z.string().regex(/^\d{10,15}$/).optional().or(z.literal("")),
      professional_id: z.string().uuid().optional(), // Link to existing professional
    });

    const body = await req.json();
    const validatedData = createBarberSchema.parse(body);
    const { barbershop_id, name, email, password, phone, professional_id } = validatedData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the calling user is an admin of the barbershop
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if calling user is admin of this barbershop
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('barbershop_id', barbershop_id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para adicionar barbeiros nesta barbearia' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check professional limit based on subscription plan
    const { data: subscription } = await supabaseAdmin
      .from('barbershop_subscriptions')
      .select('plan_type')
      .eq('barbershop_id', barbershop_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planType = subscription?.plan_type?.toLowerCase() || 'trial';
    
    // Get max professionals based on plan
    const getMaxProfessionals = (plan: string): number | null => {
      switch (plan) {
        case 'essencial':
        case 'basic':
        case 'trial':
          return 1;
        case 'profissional':
        case 'professional':
          return 3;
        case 'completo':
        case 'enterprise':
        case 'complete':
          return null; // Unlimited
        default:
          return 1;
      }
    };

    const maxAllowed = getMaxProfessionals(planType);
    
    if (maxAllowed !== null) {
      // Count existing professionals
      const { count: professionalCount } = await supabaseAdmin
        .from('professionals')
        .select('id', { count: 'exact', head: true })
        .eq('barbershop_id', barbershop_id);

      if (professionalCount !== null && professionalCount >= maxAllowed) {
        const planDisplayName = planType === 'trial' ? 'Trial' : 
                                planType === 'essencial' || planType === 'basic' ? 'Essencial' :
                                planType === 'profissional' || planType === 'professional' ? 'Profissional' : planType;
        return new Response(
          JSON.stringify({ 
            error: `Limite de profissionais atingido. O plano ${planDisplayName} permite apenas ${maxAllowed} profissional${maxAllowed > 1 ? 'is' : ''}. Faça upgrade para adicionar mais.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    console.log('Admin creating barber:', { admin: callingUser.email, barberEmail: email, barbershop_id });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists - check if they already have a role in this barbershop
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .eq('barbershop_id', barbershop_id)
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: 'Este usuário já faz parte da equipe desta barbearia' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      userId = existingUser.id;
      console.log('Adding existing user to barbershop as barber:', userId);

      // Update user password (admin is setting it)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: name,
          phone: phone || existingUser.user_metadata?.phone,
        }
      });

      if (updateError) {
        console.error('Error updating existing user:', updateError);
      }
    } else {
      // Create new user with barber role
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          phone: phone || null,
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        
        let errorMessage = createError.message;
        if (createError.message.includes('already been registered')) {
          errorMessage = 'Este email já está cadastrado. Verifique o email ou tente outro.';
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      userId = authData.user.id;
      console.log('New barber user created:', userId);
    }

    // Add barber role to user_roles
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        barbershop_id: barbershop_id,
        role: 'barber'
      });

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError);
      if (roleInsertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Este usuário já faz parte da equipe' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      throw roleInsertError;
    }

    // Link to professional entry
    if (professional_id) {
      // Link to specified existing professional
      const { error: linkError } = await supabaseAdmin
        .from('professionals')
        .update({ user_id: userId, is_active: true })
        .eq('id', professional_id)
        .eq('barbershop_id', barbershop_id);

      if (linkError) {
        console.error('Error linking to professional:', linkError);
      } else {
        console.log('Linked user to existing professional:', professional_id);
      }
    } else {
      // Check if user already has a professional record
      const { data: existingProfessional } = await supabaseAdmin
        .from('professionals')
        .select('id')
        .eq('user_id', userId)
        .eq('barbershop_id', barbershop_id)
        .maybeSingle();

      if (!existingProfessional) {
        // Create new professional entry
        const { error: profError } = await supabaseAdmin
          .from('professionals')
          .insert({
            barbershop_id: barbershop_id,
            name: name,
            user_id: userId,
            is_active: true,
          });

        if (profError) {
          console.error('Error creating professional:', profError);
        }
      } else {
        // Update existing professional
        await supabaseAdmin
          .from('professionals')
          .update({ name: name, is_active: true })
          .eq('id', existingProfessional.id);
      }
    }

    console.log('Barber created successfully:', { userId, email, barbershop_id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        message: 'Barbeiro criado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in create-barber:', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
