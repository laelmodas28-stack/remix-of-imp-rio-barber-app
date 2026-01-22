import { useEffect } from "react";

interface MetaTagsConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const useMetaTags = (config: MetaTagsConfig) => {
  useEffect(() => {
    const { title, description, image, url, type = "website" } = config;

    // Update document title
    if (title) {
      document.title = title;
      updateMetaTag("og:title", title);
      updateMetaTag("twitter:title", title);
    }

    // Update description
    if (description) {
      updateMetaTag("description", description, "name");
      updateMetaTag("og:description", description);
      updateMetaTag("twitter:description", description);
    }

    // Update image
    if (image) {
      updateMetaTag("og:image", image);
      updateMetaTag("twitter:image", image);
      updateMetaTag("twitter:card", "summary_large_image", "name");
    }

    // Update URL
    if (url) {
      updateMetaTag("og:url", url);
    }

    // Update type
    updateMetaTag("og:type", type);

    // Cleanup function to restore defaults
    return () => {
      document.title = "Agende seu horário - Barbearia";
      updateMetaTag("description", "Agende seu horário com os melhores profissionais. Atendimento de excelência.", "name");
      updateMetaTag("og:title", "Agende seu horário - Barbearia");
      updateMetaTag("og:description", "Agende seu horário com os melhores profissionais");
    };
  }, [config.title, config.description, config.image, config.url, config.type]);
};

function updateMetaTag(property: string, content: string, attribute: "property" | "name" = "property") {
  let element = document.querySelector(`meta[${attribute}="${property}"]`);
  
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, property);
    document.head.appendChild(element);
  }
  
  element.setAttribute("content", content);
}

export default useMetaTags;
