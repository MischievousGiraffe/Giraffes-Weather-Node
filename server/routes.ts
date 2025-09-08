import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { locationSearchSchema, coordinatesSchema, autocompleteQuerySchema, type WeatherData, type AutocompleteResponse } from "@shared/schema";

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

// Helper function to calculate location priority for autocomplete suggestions
function calculateLocationPriority(location: any): number {
  let priority = 0;
  
  // Prioritize major countries
  const majorCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'JP', 'KR', 'IN', 'CN', 'BR', 'MX', 'AR'];
  if (majorCountries.includes(location.country)) {
    priority += 10;
  }
  
  // Boost US cities further
  if (location.country === 'US') {
    priority += 5;
  }
  
  // Prioritize cities with states (often indicates larger cities)
  if (location.state) {
    priority += 5;
  }
  
  // Boost based on name length (longer names often indicate established cities)
  if (location.name.length >= 5) {
    priority += 3;
  }
  
  // Boost well-known city patterns
  const wellKnownCities = /\b(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|jacksonville|fort worth|columbus|charlotte|san francisco|indianapolis|seattle|denver|washington|boston|el paso|detroit|nashville|portland|oklahoma city|las vegas|louisville|baltimore|milwaukee|albuquerque|tucson|fresno|sacramento|kansas city|mesa|atlanta|omaha|colorado springs|raleigh|miami|oakland|minneapolis|tulsa|cleveland|wichita|arlington|tampa|bakersfield|new orleans|honolulu|anaheim|santa ana|corpus christi|riverside|lexington|stockton|toledo|st. paul|newark|greensboro|buffalo|plano|lincoln|henderson|fort wayne|jersey city|st. petersburg|chula vista|norfolk|orlando|chandler|laredo|madison|lubbock|winston salem|garland|glendale|hialeah|reno|baton rouge|irvine|chesapeake|irving|scottsdale|north las vegas|fremont|gilbert|san bernardino|boise|birmingham)\b/i;
  if (wellKnownCities.test(location.name)) {
    priority += 15;
  }
  
  return priority;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const API_KEY = process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_API_KEY || "";
  
  if (!API_KEY) {
    console.warn("No OpenWeatherMap API key found. Set OPENWEATHER_API_KEY environment variable.");
  }

  // Autocomplete endpoint for city suggestions
  app.post("/api/weather/autocomplete", async (req, res) => {
    try {
      const { query } = autocompleteQuerySchema.parse(req.body);
      
      if (query.length < 2) {
        return res.json({ suggestions: [] });
      }

      // Use OpenWeatherMap geocoding API for city suggestions
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${API_KEY}`
      );
      
      if (!geoResponse.ok) {
        console.error("Autocomplete API error:", geoResponse.statusText);
        return res.json({ suggestions: [] });
      }
      
      const geoData = await geoResponse.json();
      
      // Filter and improve suggestion quality
      const filteredSuggestions = geoData
        .filter((location: any) => {
          // Filter out very short names (often incomplete or too generic)
          if (location.name.length < 3) return false;
          
          // Filter out names that are just numbers or weird characters
          if (/^[\d\W]+$/.test(location.name)) return false;
          
          // Be very strict about very short queries to avoid problematic results
          if (query.length <= 3 && location.name.length <= 3) {
            // Only allow well-known 3-letter city codes or major cities
            const wellKnown3Letter = /^(NYC|LAX|SFO|DFW|ORD|JFK|LGA|BOS|ATL|DEN|SEA|LAS|MIA|PHX|CLT|MSP|DTW|PHL|BWI|DCA|IAD|SLC|PDX|SAN|TPA|STL|PIT|CLE|MCI|OAK|SNA|BUR|MDW|HOU|IAH|MSY|RDU|BNA|CVG|CMH|IND|MKE|BUF|ROC|SYR|ALB|BDL|PVD|BGR)$/i.test(location.name);
            if (!wellKnown3Letter) return false;
          }
          
          // Prioritize major countries that typically have good weather data
          const majorCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'JP', 'KR', 'IN', 'CN', 'BR', 'MX', 'AR', 'RU', 'ZA', 'EG', 'NG', 'KE', 'MA', 'TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'BD', 'PK', 'IR', 'TR', 'SA', 'AE', 'IL', 'JO', 'LB', 'SY', 'IQ', 'AF', 'UZ', 'KZ', 'GE', 'AM', 'AZ'];
          const isFromMajorCountry = majorCountries.includes(location.country);
          
          // Be stricter about countries that often have data quality issues
          const problematicCountries = ['NG', 'CD', 'CF', 'TD', 'SO', 'SS', 'ER', 'DJ', 'KM', 'ST', 'CV', 'GW', 'GM', 'SL', 'LR', 'ML', 'BF', 'NE', 'MR', 'GN', 'SN'];
          if (problematicCountries.includes(location.country)) {
            // Only allow cities with states/regions (likely larger cities)
            if (!location.state || location.name.length < 4) {
              return false;
            }
          }
          
          // Filter out places that seem too obscure (very specific local names)
          const hasObscureWords = /\b(railway|station|airport|hospital|school|farm|ranch|creek|river|road|street|avenue|lane|district|ward|quarter|sector|zone|area|region|subdivision|hamlet|village|settlement|camp|base|facility|center|centre)\b/i.test(location.name);
          if (hasObscureWords) return false;
          
          return true;
        })
        .map((location: any) => ({
          name: location.name,
          country: location.country,
          state: location.state || undefined,
          lat: location.lat,
          lon: location.lon,
          // Add scoring for prioritization
          _priority: calculateLocationPriority(location)
        }))
        .sort((a: any, b: any) => b._priority - a._priority);

      // Remove duplicates based on name and country
      const uniqueSuggestions = filteredSuggestions.filter((location: any, index: number, arr: any[]) => {
        const key = `${location.name.toLowerCase()}-${location.country}`;
        return arr.findIndex((l: any) => `${l.name.toLowerCase()}-${l.country}` === key) === index;
      });

      // Remove the priority field and limit to 5 results
      const suggestions: AutocompleteResponse['suggestions'] = uniqueSuggestions
        .slice(0, 5)
        .map((location: any) => {
          const { _priority, ...cleanLocation } = location;
          return cleanLocation;
        });

      res.json({ suggestions });
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.json({ suggestions: [] });
    }
  });

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
