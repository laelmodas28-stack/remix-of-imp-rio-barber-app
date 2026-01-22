import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imperioLogo from "@/assets/imperio-logo.webp";
import { z } from "zod";
import { 
  Crown, 
  Store, 
  User, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Mail, 
  Phone, 
  Lock, 
  MapPin,
  Building2,
  FileText,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Component defined OUTSIDE to prevent re-creation on every render
interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  error?: string;
}

const InputWithIcon = ({ icon: Icon, error, className, ...props }: InputWithIconProps) => (
  <div className="space-y-1">
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input 
        className={cn(
          "pl-10",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )} 
        {...props} 
      />
    </div>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

// Validation schemas for each step
const ownerSchema = z.object({
  fullName: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255),
  phone: z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/, "CPF (11 dígitos) ou CNPJ (14 dígitos) inválido"),
});

const barbershopSchema = z.object({
  name: z.string().min(2, "Nome da barbearia muito curto").max(100),
  phone: z.string().regex(/^\d{10,11}$/, "Telefone comercial inválido").optional().or(z.literal("")),
  email: z.string().email("Email corporativo inválido").max(255).optional().or(z.literal("")),
  street: z.string().min(3, "Rua muito curta").max(200),
  number: z.string().min(1, "Número obrigatório").max(10),
  neighborhood: z.string().min(2, "Bairro muito curto").max(100),
  city: z.string().min(2, "Cidade muito curta").max(100),
  state: z.string().length(2, "Use a sigla do estado (ex: SP)"),
  zipCode: z.string().regex(/^\d{8}$/, "CEP inválido (8 dígitos)"),
  description: z.string().max(500).optional(),
});

type Step = 1 | 2 | 3;

const RegisterBarbershop = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Dados do Proprietário
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  
  // Step 2: Dados da Barbearia
  const [barbershopName, setBarbershopName] = useState("");
  const [barbershopPhone, setBarbershopPhone] = useState("");
  const [barbershopEmail, setBarbershopEmail] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [barbershopDescription, setBarbershopDescription] = useState("");

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    if (ownerPassword !== confirmPassword) {
      setErrors({ confirmPassword: "As senhas não coincidem" });
      return false;
    }

    try {
      ownerSchema.parse({
        fullName: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        password: ownerPassword,
        cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateStep2 = () => {
    try {
      barbershopSchema.parse({
        name: barbershopName,
        phone: barbershopPhone.replace(/\D/g, ""),
        email: barbershopEmail,
        street,
        number,
        neighborhood,
        city,
        state: state.toUpperCase(),
        zipCode: zipCode.replace(/\D/g, ""),
        description: barbershopDescription,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
      setErrors({});
    }
  };

  const formatAddress = () => {
    const parts = [street, number];
    if (complement) parts.push(complement);
    parts.push(neighborhood, city, state.toUpperCase());
    if (zipCode) parts.push(`CEP: ${zipCode}`);
    return parts.join(", ");
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('register-barbershop', {
        body: {
          owner: {
            full_name: ownerName,
            email: ownerEmail,
            phone: ownerPhone.replace(/\D/g, ""),
            password: ownerPassword,
            cpf_cnpj: cpfCnpj.replace(/\D/g, ""),
          },
          barbershop: {
            name: barbershopName,
            phone: barbershopPhone.replace(/\D/g, "") || null,
            email: barbershopEmail || null,
            address: formatAddress(),
            description: barbershopDescription || null,
          }
        }
      });
      
      if (error) {
        console.error('Error registering barbershop:', error);
        toast.error(error.message || "Erro ao criar barbearia. Tente novamente.");
        setLoading(false);
        return;
      }
      
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      
      // Auto login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: ownerEmail,
        password: ownerPassword,
      });
      
      if (signInError) {
        toast.error("Barbearia criada! Faça login para continuar.");
        navigate("/auth");
        return;
      }
      
      toast.success("Barbearia criada com sucesso!");
      
      // Redirect to the barbershop admin using the slug from the response
      const barbershopSlug = data?.barbershop?.slug || data?.slug;
      if (barbershopSlug) {
        navigate(`/b/${barbershopSlug}/admin`);
      } else {
        // Fallback: fetch barbershop slug from user roles
        navigate("/");
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Erro ao criar barbearia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Proprietário", icon: User },
    { number: 2, title: "Barbearia", icon: Store },
    { number: 3, title: "Confirmação", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para página principal
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={imperioLogo} 
            alt="IMPÉRIO BARBER" 
            className="w-20 h-20 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          />
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Crown className="text-primary" />
            Criar Barbearia
          </h1>
          <p className="text-muted-foreground mt-2">
            Cadastre sua barbearia e comece a gerenciar agendamentos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    currentStep >= step.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    currentStep >= step.number ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-1 mx-2 rounded transition-all",
                    currentStep > step.number ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Dados do Proprietário"}
              {currentStep === 2 && "Dados da Barbearia"}
              {currentStep === 3 && "Confirme suas informações"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Preencha seus dados pessoais"}
              {currentStep === 2 && "Informe os dados da sua barbearia"}
              {currentStep === 3 && "Revise os dados antes de finalizar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Owner Data */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Nome Completo *</Label>
                  <InputWithIcon
                    icon={User}
                    id="owner-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    error={errors.fullName}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cpf-cnpj">CPF ou CNPJ *</Label>
                  <InputWithIcon
                    icon={FileText}
                    id="cpf-cnpj"
                    type="text"
                    placeholder="Apenas números (11 ou 14 dígitos)"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, "").slice(0, 14))}
                    error={errors.cpfCnpj}
                    maxLength={14}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Email *</Label>
                  <InputWithIcon
                    icon={Mail}
                    id="owner-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    error={errors.email}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="owner-phone">Telefone/WhatsApp *</Label>
                  <InputWithIcon
                    icon={Phone}
                    id="owner-phone"
                    type="tel"
                    placeholder="11987654321"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    error={errors.phone}
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: DDD + número (ex: 11987654321)
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner-password">Senha *</Label>
                    <InputWithIcon
                      icon={Lock}
                      id="owner-password"
                      type="password"
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      error={errors.password}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha *</Label>
                    <InputWithIcon
                      icon={Lock}
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      error={errors.confirmPassword}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Barbershop Data */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barbershop-name">Nome da Barbearia *</Label>
                  <InputWithIcon
                    icon={Store}
                    id="barbershop-name"
                    type="text"
                    placeholder="Nome da sua barbearia"
                    value={barbershopName}
                    onChange={(e) => setBarbershopName(e.target.value)}
                    error={errors.name}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-phone">Telefone Comercial</Label>
                    <InputWithIcon
                      icon={Phone}
                      id="barbershop-phone"
                      type="tel"
                      placeholder="Opcional"
                      value={barbershopPhone}
                      onChange={(e) => setBarbershopPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      error={errors.phone}
                      maxLength={11}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-email">Email Corporativo</Label>
                    <InputWithIcon
                      icon={Mail}
                      id="barbershop-email"
                      type="email"
                      placeholder="Opcional"
                      value={barbershopEmail}
                      onChange={(e) => setBarbershopEmail(e.target.value)}
                      error={errors.email}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Endereço
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip-code">CEP *</Label>
                      <Input
                        id="zip-code"
                        type="text"
                        placeholder="00000000"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        className={errors.zipCode ? "border-destructive" : ""}
                        maxLength={8}
                      />
                      {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode}</p>}
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Rua *</Label>
                      <Input
                        id="street"
                        type="text"
                        placeholder="Nome da rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className={errors.street ? "border-destructive" : ""}
                      />
                      {errors.street && <p className="text-xs text-destructive">{errors.street}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        type="text"
                        placeholder="123"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className={errors.number ? "border-destructive" : ""}
                      />
                      {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        type="text"
                        placeholder="Sala 1"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        type="text"
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className={errors.neighborhood ? "border-destructive" : ""}
                      />
                      {errors.neighborhood && <p className="text-xs text-destructive">{errors.neighborhood}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="São Paulo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={errors.city ? "border-destructive" : ""}
                      />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        type="text"
                        placeholder="SP"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        className={errors.state ? "border-destructive" : ""}
                        maxLength={2}
                      />
                      {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4">
                  <Label htmlFor="barbershop-description">Descrição</Label>
                  <Textarea
                    id="barbershop-description"
                    placeholder="Descreva sua barbearia (opcional)"
                    value={barbershopDescription}
                    onChange={(e) => setBarbershopDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="w-5 h-5 text-primary" />
                    <h3>Proprietário</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{ownerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">{cpfCnpj}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{ownerEmail}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telefone</p>
                      <p className="font-medium">{ownerPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Store className="w-5 h-5 text-primary" />
                    <h3>Barbearia</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{barbershopName}</p>
                    </div>
                    {barbershopPhone && (
                      <div>
                        <p className="text-muted-foreground">Telefone Comercial</p>
                        <p className="font-medium">{barbershopPhone}</p>
                      </div>
                    )}
                    {barbershopEmail && (
                      <div>
                        <p className="text-muted-foreground">Email Corporativo</p>
                        <p className="font-medium">{barbershopEmail}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Endereço</p>
                      <p className="font-medium">{formatAddress()}</p>
                    </div>
                    {barbershopDescription && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Descrição</p>
                        <p className="font-medium">{barbershopDescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-center">
                    Ao clicar em "Criar Barbearia", você concorda com nossos termos de uso e política de privacidade.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button type="button" variant="premium" onClick={handleNext}>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="premium" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Criando..." : "Criar Barbearia"}
                  {!loading && <Check className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>

            <div className="text-center mt-6">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/auth")}
              >
                Já tem conta? Fazer login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterBarbershop;