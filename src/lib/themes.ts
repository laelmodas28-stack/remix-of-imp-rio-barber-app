export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  description: string;
  preview: {
    background: string;
    text: string;
    border: string;
  };
}

export const AVAILABLE_THEMES: Theme[] = [
  {
    id: "gold",
    name: "Preto & Dourado",
    primaryColor: "#D4AF37",
    accentColor: "#FFC107",
    description: "Luxo e elegância premium",
    preview: {
      background: "bg-black",
      text: "text-[#D4AF37]",
      border: "border-[#D4AF37]",
    },
  },
  {
    id: "red",
    name: "Preto & Vermelho",
    primaryColor: "#DC2626",
    accentColor: "#EF4444",
    description: "Moderno e ousado",
    preview: {
      background: "bg-black",
      text: "text-[#DC2626]",
      border: "border-[#DC2626]",
    },
  },
  {
    id: "blue",
    name: "Preto & Azul",
    primaryColor: "#2563EB",
    accentColor: "#3B82F6",
    description: "Profissional e confiável",
    preview: {
      background: "bg-black",
      text: "text-[#2563EB]",
      border: "border-[#2563EB]",
    },
  },
];

export const getThemeById = (id: string): Theme | undefined => {
  return AVAILABLE_THEMES.find((theme) => theme.id === id);
};

export const getThemeByColor = (color: string): Theme | undefined => {
  return AVAILABLE_THEMES.find((theme) => theme.primaryColor === color);
};
