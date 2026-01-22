-- Create tutorial_videos table for managing video tutorials
CREATE TABLE public.tutorial_videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
    category_id text NOT NULL,
    category_title text NOT NULL,
    category_icon text NOT NULL DEFAULT 'PlayCircle',
    title text NOT NULL,
    description text,
    video_url text,
    duration text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view active tutorial videos"
ON public.tutorial_videos
FOR SELECT
USING (is_active = true);

CREATE POLICY "Barbershop admins can manage tutorial videos"
ON public.tutorial_videos
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- Super admins can manage global tutorials (barbershop_id is null)
CREATE POLICY "Super admins can manage global tutorials"
ON public.tutorial_videos
FOR ALL
USING (barbershop_id IS NULL AND is_super_admin(auth.uid()))
WITH CHECK (barbershop_id IS NULL AND is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_tutorial_videos_updated_at
BEFORE UPDATE ON public.tutorial_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();