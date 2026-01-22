import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// User agents that are known social media crawlers
const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
  'bingbot',
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const format = url.searchParams.get('format') || 'json';
    const userAgent = req.headers.get('user-agent');

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching barbershop data for slug: ${slug}, format: ${format}, userAgent: ${userAgent}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select('name, description, logo_url, mensagem_personalizada, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!barbershop) {
      console.log(`Barbershop not found for slug: ${slug}`);
      return new Response(
        JSON.stringify({ error: 'Barbershop not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found barbershop: ${barbershop.name}`);

    const title = escapeHtml(`${barbershop.name} - Agende seu horário`);
    const description = escapeHtml(
      barbershop.mensagem_personalizada || 
      barbershop.description || 
      `Agende seu horário na ${barbershop.name}. Atendimento de excelência com os melhores profissionais.`
    );
    const image = barbershop.logo_url || '';
    const siteUrl = Deno.env.get('SITE_URL') || 'https://yieyjhgpwwepgkerdasv.lovableproject.com';
    const pageUrl = `${siteUrl}/b/${barbershop.slug}`;

    // Return HTML for bots or when explicitly requested
    if (format === 'html' || isBot(userAgent)) {
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="business.business">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ''}
  
  <!-- Redirect to actual page after a short delay for real users -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  ${image ? `<img src="${escapeHtml(image)}" alt="${title}">` : ''}
  <p>Redirecionando para <a href="${pageUrl}">${pageUrl}</a>...</p>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Return JSON for API calls
    const response = {
      title: barbershop.name,
      description: barbershop.mensagem_personalizada || barbershop.description || `Agende seu horário na ${barbershop.name}`,
      image: barbershop.logo_url || null,
      url: pageUrl,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in og-meta function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});