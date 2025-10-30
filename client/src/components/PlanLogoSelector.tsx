import { GraduationCap, Rocket, Star, Crown, Trophy, Diamond, Shield, Target, Award, Gem, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const planLogos = {
  'graduation-cap': {
    icon: GraduationCap,
    name: 'Academic',
    description: 'Classic education excellence',
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/25'
  },
  'diamond': {
    icon: Diamond,
    name: 'Diamond',
    description: 'Luxury and exclusive experience',
    gradient: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/25'
  },
  'crown': {
    icon: Crown,
    name: 'Crown',
    description: 'Premium royal treatment',
    gradient: 'from-yellow-500 to-orange-600',
    shadow: 'shadow-yellow-500/25'
  },
  'shield': {
    icon: Shield,
    name: 'Shield',
    description: 'Trusted protection and security',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/25'
  },
  'trophy': {
    icon: Trophy,
    name: 'Trophy',
    description: 'Victory and achievement',
    gradient: 'from-amber-500 to-yellow-600',
    shadow: 'shadow-amber-500/25'
  },
  'target': {
    icon: Target,
    name: 'Target',
    description: 'Precision goal achievement',
    gradient: 'from-red-500 to-rose-600',
    shadow: 'shadow-red-500/25'
  },
  'gem': {
    icon: Gem,
    name: 'Gem',
    description: 'Rare valuable opportunity',
    gradient: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-cyan-500/25'
  },
  'zap': {
    icon: Zap,
    name: 'Lightning',
    description: 'Fast-track success',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/25'
  }
};

interface PlanLogoSelectorProps {
  selectedLogo: string;
  onLogoChange: (logo: string) => void;
}

export function PlanLogoSelector({ selectedLogo, onLogoChange }: PlanLogoSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Plan Logo</Label>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(planLogos).map(([key, logo]) => {
          const IconComponent = logo.icon;
          const isSelected = selectedLogo === key;
          
          return (
            <div key={key} className="text-center">
              <div
                className={`relative w-full h-20 rounded-xl cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? `bg-gradient-to-br ${logo.gradient} ${logo.shadow} shadow-lg ring-2 ring-white/50 scale-105` 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 hover:scale-102'
                }`}
                onClick={() => onLogoChange(key)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <IconComponent className={`w-8 h-8 mb-1 ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                  <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {logo.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {planLogos[selectedLogo as keyof typeof planLogos]?.description || 'Select a logo for your plan'}
      </p>
    </div>
  );
}

export function PlanLogoDisplay({ logo, className = "w-8 h-8", showGradient = false }: { logo: string; className?: string; showGradient?: boolean }) {
  const logoData = planLogos[logo as keyof typeof planLogos];
  if (!logoData) return <GraduationCap className={className} />;
  
  const IconComponent = logoData.icon;
  
  if (showGradient) {
    return (
      <div className={`rounded-full bg-gradient-to-br ${logoData.gradient} ${logoData.shadow} shadow-md p-2`}>
        <IconComponent className={`${className} text-white`} />
      </div>
    );
  }
  
  return <IconComponent className={className} />;
}