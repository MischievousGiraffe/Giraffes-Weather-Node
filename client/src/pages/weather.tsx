import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import LocationSearch from "@/components/weather/location-search";
import CurrentWeather from "@/components/weather/current-weather";
import WeatherForecast from "@/components/weather/weather-forecast";
import ErrorMessage from "@/components/weather/error-message";
import LoadingState from "@/components/weather/loading-state";
import { CloudSun, RotateCcw } from "lucide-react";
import { type WeatherData } from "@shared/schema";

export default function WeatherPage() {
  const [location, setLocation] = useState<{ type: 'search' | 'coords'; value: string | { lat: number; lon: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: weatherData, isLoading, error: queryError, refetch } = useQuery<WeatherData>({
    queryKey: ['/api/weather', location?.type, location?.value],
    enabled: !!location,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      if (!location) throw new Error("No location provided");
      
      if (location.type === 'search') {
        const response = await fetch('/api/weather/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: location.value as string }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }
        
        return response.json();
      } else if (location.type === 'coords') {
        const coords = location.value as { lat: number; lon: number };
        const response = await fetch('/api/weather/coordinates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.lat, lon: coords.lon }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }
        
        return response.json();
      }
      
      throw new Error("Invalid location type");
    },
  });

  const handleLocationSearch = (query: string) => {
    setLocation({ type: 'search', value: query });
    setError(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          type: 'coords',
          value: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }
        });
        setError(null);
      },
      (error) => {
        setError("Unable to get your location. Please search for a city instead.");
      }
    );
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleDismissError = () => {
    setError(null);
  };

  const displayError = error || (queryError ? "Failed to fetch weather data" : null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CloudSun className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">WeatherApp</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Last updated: {weatherData ? "2 minutes ago" : "Never"}
              </span>
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                data-testid="button-refresh"
              >
                <RotateCcw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Search Section */}
        <LocationSearch 
          onLocationSearch={handleLocationSearch}
          onUseCurrentLocation={handleUseCurrentLocation}
          isLoading={isLoading}
        />

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Error State */}
        {displayError && (
          <ErrorMessage 
            message={displayError}
            onDismiss={handleDismissError}
          />
        )}

        {/* Weather Data */}
        {weatherData && !isLoading && (
          <>
            <CurrentWeather data={weatherData} />
            <WeatherForecast forecast={weatherData.forecast} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Weather data provided by OpenWeatherMap</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Updated every 10 minutes</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Settings
              </button>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
