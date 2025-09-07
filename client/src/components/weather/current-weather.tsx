import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Eye, Droplets, Wind, Thermometer } from "lucide-react";
import { type WeatherData } from "@shared/schema";

interface CurrentWeatherProps {
  data: WeatherData;
}

export default function CurrentWeather({ data }: CurrentWeatherProps) {
  const { location, current } = data;
  const currentDate = new Date(current.dateTime);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getWeatherIcon = (iconCode: string) => {
    // Simple mapping of OpenWeatherMap icons to text representations
    const iconMap: Record<string, string> = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '⛅',
      '02n': '☁️',
      '03d': '☁️',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌦️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '❄️',
      '13n': '❄️',
      '50d': '🌫️',
      '50n': '🌫️',
    };
    return iconMap[iconCode] || '☀️';
  };

  return (
    <Card className="card-shadow overflow-hidden">
      <div className="weather-gradient p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span className="text-lg font-medium" data-testid="text-location">
                {location.city}, {location.country}
              </span>
            </div>
            <div className="text-6xl lg:text-7xl font-light" data-testid="text-temperature">
              {current.temperature}°F
            </div>
            <div className="text-xl opacity-90 capitalize" data-testid="text-description">
              {current.description}
            </div>
            <div className="text-sm opacity-75" data-testid="text-date">
              {formatDate(currentDate)}
            </div>
          </div>
          
          <div className="mt-6 lg:mt-0 flex flex-col items-center">
            <div className="text-6xl lg:text-8xl opacity-90">
              {getWeatherIcon(current.icon)}
            </div>
            <div className="mt-4 text-center space-y-1">
              <div className="text-sm opacity-75">Feels like</div>
              <div className="text-2xl font-medium" data-testid="text-feels-like">
                {current.feelsLike}°F
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Details */}
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center space-y-2">
            <Eye className="h-6 w-6 text-primary mx-auto" />
            <div className="text-sm text-muted-foreground">Visibility</div>
            <div className="text-lg font-semibold" data-testid="text-visibility">
              {current.visibility} mi
            </div>
          </div>
          <div className="text-center space-y-2">
            <Droplets className="h-6 w-6 text-blue-500 mx-auto" />
            <div className="text-sm text-muted-foreground">Humidity</div>
            <div className="text-lg font-semibold" data-testid="text-humidity">
              {current.humidity}%
            </div>
          </div>
          <div className="text-center space-y-2">
            <Wind className="h-6 w-6 text-gray-500 mx-auto" />
            <div className="text-sm text-muted-foreground">Wind Speed</div>
            <div className="text-lg font-semibold" data-testid="text-wind-speed">
              {current.windSpeed} mph
            </div>
          </div>
          <div className="text-center space-y-2">
            <Thermometer className="h-6 w-6 text-red-500 mx-auto" />
            <div className="text-sm text-muted-foreground">UV Index</div>
            <div className="text-lg font-semibold" data-testid="text-uv-index">
              {current.uvIndex}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
