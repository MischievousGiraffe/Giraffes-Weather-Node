import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface LocationSearchProps {
  onLocationSearch: (query: string) => void;
  onUseCurrentLocation: () => void;
  isLoading: boolean;
}

export default function LocationSearch({ onLocationSearch, onUseCurrentLocation, isLoading }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onLocationSearch(searchQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for a city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-12"
                disabled={isLoading}
                data-testid="input-search"
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            onClick={onUseCurrentLocation}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2"
            data-testid="button-current-location"
          >
            <MapPin className="h-4 w-4" />
            <span>Use My Location</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
