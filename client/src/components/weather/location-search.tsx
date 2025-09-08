import { useState, useEffect, useRef } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "use-debounce";
import { type CitySuggestion, type AutocompleteResponse } from "@shared/schema";

interface LocationSearchProps {
  onLocationSearch: (query: string) => void;
  onUseCurrentLocation: () => void;
  isLoading: boolean;
}

export default function LocationSearch({ onLocationSearch, onUseCurrentLocation, isLoading }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (query: string) => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/weather/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      if (response.ok) {
        const data: AutocompleteResponse = await response.json();
        setSuggestions(data.suggestions);
        setShowSuggestions(data.suggestions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onLocationSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: CitySuggestion) => {
    const cityName = suggestion.state 
      ? `${suggestion.name}, ${suggestion.state}, ${suggestion.country}`
      : `${suggestion.name}, ${suggestion.country}`;
    
    setSearchQuery(cityName);
    setShowSuggestions(false);
    onLocationSearch(cityName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && searchQuery.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search for a city or zipcode..."
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="pr-12"
                disabled={isLoading}
                data-testid="input-search"
                autoComplete="off"
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

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
                data-testid="dropdown-suggestions"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.name}-${suggestion.country}-${suggestion.lat}-${suggestion.lon}`}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    data-testid={`suggestion-${index}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {suggestion.name}
                          {suggestion.state && `, ${suggestion.state}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.country}
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                    </div>
                  </div>
                ))}
                {isLoadingSuggestions && (
                  <div className="px-4 py-3 text-center text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading suggestions...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
