import { FaWhatsapp, FaInstagram, FaTiktok } from "react-icons/fa";

interface SocialLinksProps {
  whatsapp?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  className?: string;
}

export const SocialLinks = ({ whatsapp, instagram, tiktok, className = "" }: SocialLinksProps) => {
  const getWhatsAppLink = () => {
    if (!whatsapp) return "#";
    let cleanNumber = whatsapp.replace(/\D/g, '');
    // Add country code if not present
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }
    return `https://wa.me/${cleanNumber}`;
  };

  const getInstagramLink = () => {
    if (!instagram) return "#";
    const username = instagram.replace('@', '').trim();
    return `https://instagram.com/${username}`;
  };

  const getTikTokLink = () => {
    if (!tiktok) return "#";
    const username = tiktok.replace('@', '').trim();
    return `https://tiktok.com/@${username}`;
  };

  const handleLinkClick = (url: string) => {
    // Try multiple methods to open the link
    try {
      // Method 1: Try to open in parent window if in iframe
      if (window.top !== window.self) {
        window.top!.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Method 2: Normal window.open
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      // Method 3: Fallback to location
      window.location.href = url;
    }
  };

  return (
    <div className={`flex gap-4 ${className}`}>
      {whatsapp && (
        <a 
          href={getWhatsAppLink()}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick(getWhatsAppLink());
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-11 px-8 bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors cursor-pointer"
        >
          <FaWhatsapp className="h-5 w-5" />
          <span>WhatsApp</span>
        </a>
      )}
      {instagram && (
        <a 
          href={getInstagramLink()}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick(getInstagramLink());
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-11 px-8 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white transition-opacity cursor-pointer"
        >
          <FaInstagram className="h-5 w-5" />
          <span>Instagram</span>
        </a>
      )}
      {tiktok && (
        <a 
          href={getTikTokLink()}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick(getTikTokLink());
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-11 px-8 bg-black hover:bg-gray-800 text-white transition-colors cursor-pointer"
        >
          <FaTiktok className="h-5 w-5" />
          <span>TikTok</span>
        </a>
      )}
    </div>
  );
};
