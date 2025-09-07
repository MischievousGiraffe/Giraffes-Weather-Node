import { type WeatherData } from "@shared/schema";

// Simple in-memory cache for weather data
export interface IStorage {
  getCachedWeatherData(key: string): Promise<WeatherData | undefined>;
  setCachedWeatherData(key: string, data: WeatherData): Promise<void>;
}

export class MemStorage implements IStorage {
  private weatherCache: Map<string, { data: WeatherData; timestamp: number }>;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.weatherCache = new Map();
  }

  async getCachedWeatherData(key: string): Promise<WeatherData | undefined> {
    const cached = this.weatherCache.get(key);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.weatherCache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  async setCachedWeatherData(key: string, data: WeatherData): Promise<void> {
    this.weatherCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

export const storage = new MemStorage();
