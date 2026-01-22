-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'barber', 'client');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de barbearias
CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  theme_primary_color TEXT DEFAULT '#D4AF37',
  theme_secondary_color TEXT DEFAULT '#1a1a1a',
  business_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role, barbershop_id)
);

-- Tabela de profissionais
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  rating DECIMAL(2,1) DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  commission_percentage DECIMAL(5,2) DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de serviços
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de clientes da barbearia
CREATE TABLE public.barbershop_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(barbershop_id, user_id)
);

-- Tabela de agendamentos
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de códigos de registro
CREATE TABLE public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'barber',
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de comissões de profissionais
CREATE TABLE public.professional_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de pagamentos de comissões
CREATE TABLE public.commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de vídeos tutoriais
CREATE TABLE public.tutorial_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  benefits TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de assinaturas de clientes
CREATE TABLE public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de galeria
CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar admin de barbearia
CREATE OR REPLACE FUNCTION public.is_barbershop_admin(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND barbershop_id = _barbershop_id
      AND role = 'admin'
  )
$$;

-- Políticas RLS para profiles
CREATE POLICY "Perfis são visíveis publicamente" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir próprio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para barbershops
CREATE POLICY "Barbearias ativas são visíveis publicamente" ON public.barbershops
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin pode atualizar sua barbearia" ON public.barbershops
  FOR UPDATE USING (public.is_barbershop_admin(auth.uid(), id));

CREATE POLICY "Usuários autenticados podem criar barbearia" ON public.barbershops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver próprias roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin pode ver roles da barbearia" ON public.user_roles
  FOR SELECT USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin pode inserir roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      public.is_barbershop_admin(auth.uid(), barbershop_id)
    )
  );

-- Políticas RLS para professionals
CREATE POLICY "Profissionais são visíveis publicamente" ON public.professionals
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar profissionais" ON public.professionals
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para services
CREATE POLICY "Serviços são visíveis publicamente" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar serviços" ON public.services
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para bookings
CREATE POLICY "Clientes podem ver próprios agendamentos" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Admin pode ver agendamentos da barbearia" ON public.bookings
  FOR SELECT USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Clientes podem criar agendamentos" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admin pode gerenciar agendamentos" ON public.bookings
  FOR UPDATE USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para barbershop_clients
CREATE POLICY "Admin pode ver clientes da barbearia" ON public.barbershop_clients
  FOR SELECT USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Clientes são registrados automaticamente" ON public.barbershop_clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para registration_codes
CREATE POLICY "Admin pode gerenciar códigos" ON public.registration_codes
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Códigos não usados são verificáveis" ON public.registration_codes
  FOR SELECT USING (is_used = false);

-- Políticas RLS para commissions
CREATE POLICY "Admin pode ver comissões" ON public.professional_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_id
      AND public.is_barbershop_admin(auth.uid(), p.barbershop_id)
    )
  );

CREATE POLICY "Admin pode ver pagamentos" ON public.commission_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_id
      AND public.is_barbershop_admin(auth.uid(), p.barbershop_id)
    )
  );

-- Políticas RLS para tutorial_videos
CREATE POLICY "Vídeos são visíveis publicamente" ON public.tutorial_videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin pode gerenciar vídeos" ON public.tutorial_videos
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para subscription_plans
CREATE POLICY "Planos ativos são visíveis" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin pode gerenciar planos" ON public.subscription_plans
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para client_subscriptions
CREATE POLICY "Usuários podem ver próprias assinaturas" ON public.client_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin pode ver assinaturas da barbearia" ON public.client_subscriptions
  FOR SELECT USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Políticas RLS para notifications
CREATE POLICY "Usuários podem ver próprias notificações" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprias notificações" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para gallery_images
CREATE POLICY "Galeria é visível publicamente" ON public.gallery_images
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar galeria" ON public.gallery_images
  FOR ALL USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();