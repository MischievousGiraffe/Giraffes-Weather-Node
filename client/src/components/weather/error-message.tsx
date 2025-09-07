import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <h3 className="font-semibold text-destructive">Error</h3>
          <p className="text-sm text-destructive/80 mt-1" data-testid="text-error-message">
            {message}
          </p>
        </div>
      </div>
      <Button
        onClick={onDismiss}
        variant="destructive"
        className="mt-4"
        data-testid="button-dismiss-error"
      >
        Try Again
      </Button>
    </div>
  );
}
