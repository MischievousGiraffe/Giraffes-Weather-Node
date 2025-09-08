import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { locationSearchSchema, coordinatesSchema, type WeatherData } from "@shared/schema";

// Helper function to detect if input looks like a zipcode
function isZipcodeFormat(input: string): boolean {
  const trimmed = input.trim();
  
  // US zipcode patterns: 12345 or 12345-6789
  const usZipPattern = /^\d{5}(-\d{4})?$/;
  
  // UK postcode pattern: SW1A 1AA
  const ukPostcodePattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
  
  // Canadian postal code: K1A 0A6
  const canadaPostalPattern = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
  
  // General pattern for numeric zipcodes
  const numericPattern = /^\d{4,6}$/;
  
  return usZipPattern.test(trimmed) || 
         ukPostcodePattern.test(trimmed) || 
         canadaPostalPattern.test(trimmed) || 
         numericPattern.test(trimmed);
}

// Helper function to format zipcode for OpenWeatherMap API
function formatZipcode(input: string): string {
  const trimmed = input.trim();
  
  // If already has country code (format: "12345,US"), return as-is
  if (trimmed.includes(',')) {
    return trimmed;
  }
  
  // US zipcode patterns
  if (/^\d{5}(-\d{4})?$/.test(trimmed)) {
    return `${trimmed},US`;
  }
  
  // UK postcode
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(trimmed)) {
    return `${trimmed},GB`;
  }
  
  // Canadian postal code
  if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(trimmed)) {
    return `${trimmed},CA`;
  }
  
  // Default to US for numeric codes
  return `${trimmed},US`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const API_KEY = process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_API_KEY || "";
  
  if (!API_KEY) {
    console.warn("No OpenWeatherMap API key found. Set OPENWEATHER_API_KEY environment variable.");
  }

  // Search weather by city name or zipcode
  app.post("/api/weather/search", async (req, res) => {
    try {
      const { query } = locationSearchSchema.parse(req.body);
      
      const cacheKey = `search:${query.toLowerCase()}`;
      const cached = await storage.getCachedWeatherData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Detect if input is a zipcode and format accordingly
      const isZipcode = isZipcodeFormat(query);
      let geoUrl: string;
      
      if (isZipcode) {
        // Format zipcode for API (add country code if not present)
        const formattedZip = formatZipcode(query);
        geoUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(formattedZip)}&appid=${API_KEY}`;
      } else {
        // Regular city search
        geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`;
      }

      const geoResponse = await fetch(geoUrl);
      
      if (!geoResponse.ok) {
        throw new Error("Failed to fetch location data");
      }
      
      const geoData = await geoResponse.json();
      
      let lat: number, lon: number, name: string, country: string;
      
      if (isZipcode) {
        // Zipcode API returns a single object
        if (!geoData.lat || !geoData.lon) {
          return res.status(404).json({ message: "Zipcode not found" });
        }
        lat = geoData.lat;
        lon = geoData.lon;
        name = geoData.name || "Unknown Location";
        country = geoData.country || "";
      } else {
        // City search API returns an array
        if (!geoData.length) {
          return res.status(404).json({ message: "Location not found" });
        }
        const location = geoData[0];
        lat = location.lat;
        lon = location.lon;
        name = location.name;
        country = location.country;
      }

      const weatherData = await fetchWeatherData(lat, lon, name, country, API_KEY);
      
      await storage.setCachedWeatherData(cacheKey, weatherData);
      res.json(weatherData);
    } catch (error) {
      console.error("Weather search error:", error);
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  // Get weather by coordinates
  app.post("/api/weather/coordinates", async (req, res) => {
    try {
      const { lat, lon } = coordinatesSchema.parse(req.body);
      
      const cacheKey = `coords:${lat.toFixed(2)},${lon.toFixed(2)}`;
      const cached = await storage.getCachedWeatherData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Get city name from coordinates
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
      );
      
      const geoData = await geoResponse.json();
      const cityName = geoData[0]?.name || "Unknown Location";
      const country = geoData[0]?.country || "";

      const weatherData = await fetchWeatherData(lat, lon, cityName, country, API_KEY);
      
      await storage.setCachedWeatherData(cacheKey, weatherData);
      res.json(weatherData);
    } catch (error) {
      console.error("Weather coordinates error:", error);
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function fetchWeatherData(lat: number, lon: number, city: string, country: string, apiKey: string): Promise<WeatherData> {
  // Fetch current weather and forecast
  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`)
  ]);

  if (!currentResponse.ok || !forecastResponse.ok) {
    throw new Error("Failed to fetch weather data from OpenWeatherMap");
  }

  const currentData = await currentResponse.json();
  const forecastData = await forecastResponse.json();

  // Process forecast data (get one per day for 5 days)
  const dailyForecasts = [];
  const processedDates = new Set();
  
  for (const item of forecastData.list) {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toDateString();
    
    if (!processedDates.has(dateKey) && dailyForecasts.length < 5) {
      processedDates.add(dateKey);
      dailyForecasts.push({
        date: date.toISOString(),
        dayName: dailyForecasts.length === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
        tempHigh: Math.round(item.main.temp_max),
        tempLow: Math.round(item.main.temp_min),
        description: item.weather[0].description,
        icon: item.weather[0].icon,
      });
    }
  }

  return {
    location: {
      city,
      country,
      lat,
      lon,
    },
    current: {
      temperature: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed),
      visibility: Math.round(currentData.visibility / 1609.34), // Convert meters to miles
      uvIndex: 0, // OpenWeatherMap UV index requires separate API call
      dateTime: new Date().toISOString(),
    },
    forecast: dailyForecasts,
  };
}
