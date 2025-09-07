import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { type WeatherData } from "@shared/schema";

interface WeatherForecastProps {
  forecast: WeatherData['forecast'];
}

export default function WeatherForecast({ forecast }: WeatherForecastProps) {
  const getWeatherIcon = (iconCode: string) => {
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
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>5-Day Forecast</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {forecast.map((day, index) => (
            <div
              key={index}
              className="forecast-card bg-muted/50 rounded-lg p-4 text-center space-y-3 cursor-pointer hover:transform hover:-translate-y-1 transition-transform duration-200"
              data-testid={`card-forecast-${index}`}
            >
              <div className="text-sm font-medium text-muted-foreground">
                {day.dayName}
              </div>
              <div className="text-3xl">
                {getWeatherIcon(day.icon)}
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold" data-testid={`text-temp-high-${index}`}>
                  {day.tempHigh}°
                </div>
                <div className="text-sm text-muted-foreground" data-testid={`text-temp-low-${index}`}>
                  {day.tempLow}°
                </div>
              </div>
              <div className="text-xs text-muted-foreground capitalize" data-testid={`text-forecast-description-${index}`}>
                {day.description}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
