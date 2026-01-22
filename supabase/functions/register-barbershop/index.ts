import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ADMIN_EMAIL = "imperiobarberdev@gmail.com";
const BASE_URL = "https://imperioapp.lovable.app";

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
    // Schema validation (code is optional for now)
    const registerSchema = z.object({
      code: z.string().min(6).max(50).optional(),
      owner: z.object({
        email: z.string().email().max(255),
        password: z.string().min(6).max(100),
        full_name: z.string().min(2).max(100).trim(),
        phone: z.string().regex(/^\d{10,15}$/).optional()
      }),
      barbershop: z.object({
        name: z.string().min(2).max(100).trim(),
        address: z.string().max(200).nullable().optional(),
        description: z.string().max(500).nullable().optional()
      })
    });

    const body = await req.json();
    const validatedData = registerSchema.parse(body);
    const { code, owner, barbershop } = validatedData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Validate registration code only if provided
    if (code) {
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('registration_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_used', false)
        .maybeSingle();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: 'Código de acesso inválido ou já utilizado' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Check if code is expired (only if expires_at is set)
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Código de acesso expirado' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      console.log('Registration with access code:', code);
    } else {
      console.log('Registration without access code (open registration)');
    }

    console.log('Starting barbershop registration for:', owner.email);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === owner.email);

    let userId: string;
    let isExistingUser = false;

    if (existingUser) {
      // User exists - check if they're already a barbershop admin
      const { data: existingRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role, barbershop_id, barbershops(name)')
        .eq('user_id', existingUser.id)
        .eq('role', 'admin');

      if (existingRoles && existingRoles.length > 0) {
        // User is already an admin of at least one barbershop
        const barbershopNames = existingRoles
          .map((r: any) => r.barbershops?.name)
          .filter(Boolean)
          .join(', ');

        console.log('User already admin of barbershop(s):', barbershopNames);
        
        return new Response(
          JSON.stringify({ 
            error: `Este email já está cadastrado como administrador da barbearia "${barbershopNames || 'existente'}". Faça login para acessar seu painel ou use outro email para criar uma nova barbearia.`,
            code: 'ALREADY_ADMIN'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // User exists but is only a client - we can proceed
      console.log('Existing client user, upgrading to barbershop admin:', existingUser.id);
      userId = existingUser.id;
      isExistingUser = true;

      // Update password for the existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: owner.password,
        user_metadata: {
          full_name: owner.full_name,
          phone: owner.phone,
        }
      });

      if (updateError) {
        console.error('Error updating existing user:', updateError);
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: owner.email,
        password: owner.password,
        email_confirm: true,
        user_metadata: {
          full_name: owner.full_name,
          phone: owner.phone,
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        
        let errorMessage = authError.message;
        if (authError.code === 'email_exists' || authError.message.includes('already been registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email.';
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      userId = authData.user.id;
      console.log('New user created:', userId);
    }
    console.log('User created:', userId);

    // 2. Update profile to admin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // 3. Create barbershop
    // Generate slug from barbershop name
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove consecutive hyphens
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    let baseSlug = generateSlug(barbershop.name);
    let slug = baseSlug;
    let slugSuffix = 1;

    // Check for slug uniqueness
    while (true) {
      const { data: existingSlug } = await supabaseAdmin
        .from('barbershops')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existingSlug) break;
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    console.log('Generated slug:', slug);

    const { data: barbershopData, error: barbershopError } = await supabaseAdmin
      .from('barbershops')
      .insert({
        name: barbershop.name,
        slug: slug,
        address: barbershop.address,
        description: barbershop.description,
        phone: owner.phone,
        whatsapp: owner.phone,
      })
      .select()
      .single();

    if (barbershopError) {
      console.error('Error creating barbershop:', barbershopError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar barbearia: ' + barbershopError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const barbershopId = barbershopData.id;
    console.log('Barbershop created:', barbershopId);

    // 4. Create user_role (admin)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin',
        barbershop_id: barbershopId,
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
    }

    // 5. Create default notification_settings
    const { error: notificationError } = await supabaseAdmin
      .from('notification_settings')
      .insert({
        barbershop_id: barbershopId,
        enabled: true,
        send_to_client: true,
        send_whatsapp: false,
        ai_enabled: true,
        custom_message: 'Olá {nome}! Seu agendamento foi confirmado para {data} às {hora}. Serviço: {servico}. Profissional: {profissional}. Aguardamos você!',
        admin_whatsapp: owner.phone,
      });

    if (notificationError) {
      console.error('Error creating notification settings:', notificationError);
    }

    // 6. Create default notification_templates
    const imperioLogoUrl = `${supabaseUrl}/storage/v1/object/public/assets/imperio-logo.webp`;
    
    const defaultTemplates = [
      // Email templates
      {
        barbershop_id: barbershopId,
        name: "Confirmação de Agendamento",
        type: "email",
        trigger_event: "booking_confirmation",
        subject: "✅ Agendamento Confirmado - {{barbearia_nome}}",
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Imperio Logo Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <img src="${imperioLogoUrl}" alt="ImperioApp" style="height: 40px; width: auto;" />
            </td>
          </tr>
        </table>
        
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Barbershop Logo -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px;">
              <img src="{{barbearia_logo_url}}" alt="{{barbearia_nome}}" style="height: 80px; width: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #d4af37;" />
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 40px 10px;">
              <h1 style="color: #d4af37; margin: 0; font-size: 24px;">✅ Agendamento Confirmado</h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 10px 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0;">Olá, <strong>{{cliente_nome}}</strong>!</p>
            </td>
          </tr>
          
          <!-- Details Card -->
          <tr>
            <td style="padding: 20px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252545; border-radius: 12px; padding: 25px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Serviço</span><br/>
                    <span style="color: #fff; font-size: 16px; font-weight: bold;">{{servico_nome}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Profissional</span><br/>
                    <span style="color: #fff; font-size: 16px;">{{profissional_nome}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Data</span><br/>
                    <span style="color: #d4af37; font-size: 18px; font-weight: bold;">{{data_agendamento}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Horário</span><br/>
                    <span style="color: #d4af37; font-size: 18px; font-weight: bold;">{{hora_agendamento}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Valor</span><br/>
                    <span style="color: #4ade80; font-size: 18px; font-weight: bold;">R$ {{servico_preco}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Address -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="color: #888; font-size: 14px; margin: 0;">📍 {{barbearia_endereco}}</p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="color: #888; font-size: 12px; margin: 0;">Enviado por <strong>ImperioApp</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        is_active: true,
      },
      {
        barbershop_id: barbershopId,
        name: "Lembrete de Agendamento",
        type: "email",
        trigger_event: "booking_reminder",
        subject: "⏰ Lembrete: Seu horário é amanhã! - {{barbearia_nome}}",
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Imperio Logo Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <img src="${imperioLogoUrl}" alt="ImperioApp" style="height: 40px; width: auto;" />
            </td>
          </tr>
        </table>
        
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Barbershop Logo -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px;">
              <img src="{{barbearia_logo_url}}" alt="{{barbearia_nome}}" style="height: 80px; width: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #d4af37;" />
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 40px 10px;">
              <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">⏰ Lembrete de Agendamento</h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 10px 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0;">Olá, <strong>{{cliente_nome}}</strong>!</p>
              <p style="color: #ccc; font-size: 14px; margin: 10px 0 0;">Não esqueça do seu horário amanhã!</p>
            </td>
          </tr>
          
          <!-- Details Card -->
          <tr>
            <td style="padding: 20px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252545; border-radius: 12px; padding: 25px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Serviço</span><br/>
                    <span style="color: #fff; font-size: 16px; font-weight: bold;">{{servico_nome}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Profissional</span><br/>
                    <span style="color: #fff; font-size: 16px;">{{profissional_nome}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Data</span><br/>
                    <span style="color: #f59e0b; font-size: 18px; font-weight: bold;">{{data_agendamento}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Horário</span><br/>
                    <span style="color: #f59e0b; font-size: 18px; font-weight: bold;">{{hora_agendamento}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Address -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="color: #888; font-size: 14px; margin: 0;">📍 {{barbearia_endereco}}</p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="color: #888; font-size: 12px; margin: 0;">Enviado por <strong>ImperioApp</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        is_active: true,
      },
      {
        barbershop_id: barbershopId,
        name: "Agendamento Cancelado",
        type: "email",
        trigger_event: "booking_cancelled",
        subject: "❌ Agendamento Cancelado - {{barbearia_nome}}",
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Imperio Logo Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <img src="${imperioLogoUrl}" alt="ImperioApp" style="height: 40px; width: auto;" />
            </td>
          </tr>
        </table>
        
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Barbershop Logo -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px;">
              <img src="{{barbearia_logo_url}}" alt="{{barbearia_nome}}" style="height: 80px; width: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #ef4444;" />
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 40px 10px;">
              <h1 style="color: #ef4444; margin: 0; font-size: 24px;">❌ Agendamento Cancelado</h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 10px 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0;">Olá, <strong>{{cliente_nome}}</strong></p>
              <p style="color: #ccc; font-size: 14px; margin: 10px 0 0;">Seu agendamento foi cancelado.</p>
            </td>
          </tr>
          
          <!-- Details Card -->
          <tr>
            <td style="padding: 20px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252545; border-radius: 12px; padding: 25px; opacity: 0.7;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Serviço</span><br/>
                    <span style="color: #999; font-size: 16px; text-decoration: line-through;">{{servico_nome}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Data</span><br/>
                    <span style="color: #999; font-size: 16px; text-decoration: line-through;">{{data_agendamento}} às {{hora_agendamento}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="color: #888; font-size: 14px; margin: 0;">Entre em contato para reagendar: {{barbearia_telefone}}</p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="color: #888; font-size: 12px; margin: 0;">Enviado por <strong>ImperioApp</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        is_active: true,
      },
      // WhatsApp templates
      {
        barbershop_id: barbershopId,
        name: "Confirmação de Agendamento",
        type: "whatsapp",
        trigger_event: "booking_confirmation",
        content: `✅ *Agendamento Confirmado!*

Olá, *{{cliente_nome}}*! 👋

Seu horário foi confirmado na *{{barbearia_nome}}*:

📅 *Data:* {{data_agendamento}}
⏰ *Horário:* {{hora_agendamento}}
✂️ *Serviço:* {{servico_nome}}
👤 *Profissional:* {{profissional_nome}}
💰 *Valor:* R$ {{servico_preco}}

📍 {{barbearia_endereco}}

Aguardamos você! 🙌`,
        is_active: true,
      },
      {
        barbershop_id: barbershopId,
        name: "Lembrete de Agendamento",
        type: "whatsapp",
        trigger_event: "booking_reminder",
        content: `⏰ *Lembrete de Agendamento*

Olá, *{{cliente_nome}}*! 👋

Não esqueça do seu horário amanhã na *{{barbearia_nome}}*:

📅 *Data:* {{data_agendamento}}
⏰ *Horário:* {{hora_agendamento}}
✂️ *Serviço:* {{servico_nome}}
👤 *Profissional:* {{profissional_nome}}

📍 {{barbearia_endereco}}

Até lá! 👊`,
        is_active: true,
      },
      {
        barbershop_id: barbershopId,
        name: "Agendamento Cancelado",
        type: "whatsapp",
        trigger_event: "booking_cancelled",
        content: `❌ *Agendamento Cancelado*

Olá, *{{cliente_nome}}*

Seu agendamento foi cancelado:

📅 {{data_agendamento}} às {{hora_agendamento}}
✂️ {{servico_nome}}

Para reagendar, entre em contato:
📞 {{barbearia_telefone}}

*{{barbearia_nome}}*`,
        is_active: true,
      },
    ];

    const { error: templatesError } = await supabaseAdmin
      .from('notification_templates')
      .insert(defaultTemplates);

    if (templatesError) {
      console.error('Error creating notification templates:', templatesError);
    } else {
      console.log('Default notification templates created for barbershop:', barbershopId);
    }

    // 7. Mark registration code as used (only if code was provided)
    if (code) {
      const { error: codeUpdateError } = await supabaseAdmin
        .from('registration_codes')
        .update({ 
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('code', code.toUpperCase().trim());

      if (codeUpdateError) {
        console.error('Error updating registration code:', codeUpdateError);
      }
    }

    // Enviar webhook para n8n com dados de acesso
    const webhookUrl = 'https://n8nwebhook.atendai.app/webhook/23f78ce8-d4c4-4ce3-bff4-374701a008a1';
    const baseUrl = 'https://impriobarbercombr.lovable.app';

    try {
      const webhookPayload = {
        event: 'barbershop_registered',
        timestamp: new Date().toISOString(),
        barbershop: {
          id: barbershopId,
          name: barbershop.name,
          slug: barbershopData.slug,
          address: barbershop.address || null,
          description: barbershop.description || null
        },
        owner: {
          id: userId,
          email: owner.email,
          full_name: owner.full_name,
          phone: owner.phone || null
        },
        access_urls: {
          barbershop_page: `${baseUrl}/b/${barbershopData.slug}`,
          admin_panel: `${baseUrl}/b/${barbershopData.slug}/admin`,
          login_page: `${baseUrl}/b/${barbershopData.slug}/auth`
        }
      };

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      
      console.log('Webhook enviado para n8n:', webhookResponse.status);
    } catch (webhookError) {
      console.error('Erro ao enviar webhook (não crítico):', webhookError);
    }

    // Enviar email de boas-vindas via webhook n8n
    try {
      const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
      
      if (n8nWebhookUrl) {
        const accessUrls = {
          barbershop_page: `${BASE_URL}/b/${barbershopData.slug}`,
          admin_panel: `${BASE_URL}/b/${barbershopData.slug}/admin`,
          login_page: `${BASE_URL}/b/${barbershopData.slug}/auth`
        };

        // Email de boas-vindas para o dono da barbearia (padrão consistente com outros templates)
        // Usa /auth geral do ImperioApp - após login, redireciona para a barbearia correta
        const loginUrl = `${BASE_URL}/auth`;
        
        const welcomeEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px;">🎉 Bem-vindo ao Império Barber!</h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 10px 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0;">Olá, <strong>${owner.full_name}</strong>!</p>
              <p style="color: #ccc; font-size: 14px; margin: 15px 0 0;">Sua barbearia foi cadastrada com sucesso.</p>
            </td>
          </tr>
          
          <!-- Barbershop Info Card -->
          <tr>
            <td style="padding: 25px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252545; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #3a3a5a;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Barbearia</span><br/>
                    <span style="color: #d4af37; font-size: 20px; font-weight: bold;">${barbershop.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase;">Seu Email de Acesso</span><br/>
                    <span style="color: #fff; font-size: 16px;">${owner.email}</span>
                    <p style="color: #888; font-size: 12px; margin: 8px 0 0;">Use a senha cadastrada para fazer login.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 10px 40px 40px;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Acessar Meu Painel
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="color: #888; font-size: 12px; margin: 0;">Enviado por <strong>ImperioApp</strong></p>
              <p style="color: #888; font-size: 11px; margin: 8px 0 0;">Suporte: Imperiobarber92@gmail.com | (11) 96933-2465</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Payload para o webhook de email
        const emailPayload = {
          barbershopId: barbershopId,
          to: owner.email,
          client_email: owner.email,
          client_name: owner.full_name,
          email_subject: `🎉 Bem-vindo ao Império Barber - ${barbershop.name}`,
          email_html: welcomeEmailHtml,
          barbershop_name: barbershop.name,
          barbershop_slug: barbershopData.slug,
          event_type: "barbershop_registration",
          timestamp: new Date().toISOString(),
        };

        console.log('Sending welcome email via n8n webhook to:', owner.email);

        const emailResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        });

        if (emailResponse.ok) {
          console.log('Welcome email sent successfully via webhook');
        } else {
          console.error('Failed to send welcome email via webhook:', emailResponse.status);
        }
      } else {
        console.log('N8N_WEBHOOK_URL not configured, skipping welcome email');
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de boas-vindas (não crítico):', emailError);
      // Don't fail the registration if email fails
    }

    console.log('Barbershop registration completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        barbershop_id: barbershopId,
        slug: barbershopData.slug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in register-barbershop function:', error);
    
    // Handle zod validation errors
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos: ' + error.errors[0].message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});