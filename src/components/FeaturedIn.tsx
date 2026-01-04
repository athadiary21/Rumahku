import { useLanguage } from "@/contexts/LanguageContext";

const FeaturedIn = () => {
  const { language } = useLanguage();
  
  const title = language === "id" ? "Dipercaya Oleh" : "Featured In";
  
  return (
    <section className="py-12 border-y bg-muted/20">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8 font-medium">
          {title}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
          <div className="text-2xl font-bold text-muted-foreground">TechCrunch</div>
          <div className="text-2xl font-bold text-muted-foreground">Forbes</div>
          <div className="text-2xl font-bold text-muted-foreground">Kompas</div>
          <div className="text-2xl font-bold text-muted-foreground">Detik</div>
          <div className="text-2xl font-bold text-muted-foreground">CNN Indonesia</div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedIn;
