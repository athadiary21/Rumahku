import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Wijaya",
    role: "Ibu Rumah Tangga, Jakarta",
    content: "RumahKu benar-benar menyelamatkan hidup saya! Sekarang saya tidak lagi stres memikirkan menu harian dan anggaran bulanan. Semuanya terorganisir dengan rapi.",
    rating: 5,
    initial: "SW",
  },
  {
    name: "Budi Santoso",
    role: "Ayah dari 2 anak, Surabaya",
    content: "Aplikasi yang sangat membantu untuk kolaborasi keluarga. Sekarang saya bisa lihat jadwal anak-anak dan membantu istri dengan belanja tanpa perlu tanya-tanya terus.",
    rating: 5,
    initial: "BS",
  },
  {
    name: "Dina Permata",
    role: "Working Mom, Bandung",
    content: "Sebagai working mom, RumahKu adalah penyelamat! Semua jadwal keluarga tersinkron, dan suami jadi lebih terlibat dalam urusan rumah tangga. Love it!",
    rating: 5,
    initial: "DP",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Dipercaya Ribuan Keluarga Indonesia
          </h2>
          <p className="text-lg text-muted-foreground">
            Dengar langsung dari keluarga yang sudah merasakan manfaat RumahKu
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-none shadow-md hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-muted-foreground italic">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3 pt-4">
                  <Avatar className="h-10 w-10 bg-gradient-to-br from-primary to-accent">
                    <AvatarFallback className="bg-transparent text-white font-semibold">
                      {testimonial.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
