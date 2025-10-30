import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingCreateButtonProps {
  onClick: () => void;
}

export const FloatingCreateButton = ({ onClick }: FloatingCreateButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-[45] w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
      data-testid="fab-create-post"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};