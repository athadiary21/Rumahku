import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 border border-border rounded-lg p-1">
      <Button
        variant={language === "id" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("id")}
        className="h-8 px-3 text-xs"
      >
        ID
      </Button>
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="h-8 px-3 text-xs"
      >
        EN
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
