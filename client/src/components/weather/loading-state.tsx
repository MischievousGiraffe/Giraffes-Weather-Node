import { Card, CardContent } from "@/components/ui/card";

export default function LoadingState() {
  return (
    <Card className="card-shadow">
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-center">
            <h3 className="font-medium">Getting Weather Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we fetch the latest weather information...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
