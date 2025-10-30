import { useApiQuery } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, MapPin, Calendar, User } from "lucide-react";
import { api } from "@/lib/api-client";

interface Testimonial {
  id: string;
  name: string;
  destinationCountry: string;
  intake: string;
  photo: string;
  counselorName: string;
  feedback: string;
  isApproved: boolean;
  createdAt: string;
}

export default function TestimonialsSection() {
  const { data: testimonials = [], isLoading } = useApiQuery<Testimonial[]>(
    ['/api/testimonials'],
    '/api/testimonials',
    undefined,
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="testimonials-loading">
        <div className="text-lg">Loading testimonials...</div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="text-center py-12" data-testid="testimonials-empty">
        <div className="text-gray-500">No testimonials available yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="testimonials-section">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900">Student Success Stories</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Hear from our successful students who have achieved their dreams of studying abroad with Phozos's guidance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial: Testimonial) => (
          <Card 
            key={testimonial.id} 
            className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300"
            data-testid={`card-testimonial-${testimonial.id}`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <img
                    src={testimonial.photo || '/api/placeholder/80/80'}
                    alt={`${testimonial.name}'s photo`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    data-testid={`img-testimonial-${testimonial.id}`}
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                    <Quote className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 truncate" data-testid={`name-testimonial-${testimonial.id}`}>
                    {testimonial.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600" data-testid={`country-testimonial-${testimonial.id}`}>
                      {testimonial.destinationCountry}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600" data-testid={`intake-testimonial-${testimonial.id}`}>
                      {testimonial.intake} Intake
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <blockquote className="text-gray-700 text-sm leading-relaxed mb-4" data-testid={`feedback-testimonial-${testimonial.id}`}>
                "{testimonial.feedback}"
              </blockquote>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600" data-testid={`counselor-testimonial-${testimonial.id}`}>
                    Counselor: {testimonial.counselorName}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Visa Approved
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <div className="text-center py-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Journey?</h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Join thousands of successful students who have achieved their study abroad dreams with Phozos. 
          Let our expert counselors guide you every step of the way.
        </p>
        <div className="space-x-4">
          <button 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            data-testid="button-get-started"
          >
            Get Started Today
          </button>
          <button 
            className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            data-testid="button-book-consultation"
          >
            Book Free Consultation
          </button>
        </div>
      </div>
    </div>
  );
}