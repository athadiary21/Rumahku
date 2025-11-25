import { MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const WhatsAppButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const handleClick = () => {
    window.open("https://wa.me/6282241590417", "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      size="lg"
      className={`fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
      } bg-[#25D366] hover:bg-[#20BD5A] text-white`}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
};

export default WhatsAppButton;
