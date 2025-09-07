import { z } from "zod";

export const weatherDataSchema = z.object({
  location: z.object({
    city: z.string(),
    country: z.string(),
    lat: z.number(),
    lon: z.number(),
  }),
  current: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    description: z.string(),
    icon: z.string(),
    humidity: z.number(),
    windSpeed: z.number(),
    visibility: z.number(),
    uvIndex: z.number(),
    dateTime: z.string(),
  }),
  forecast: z.array(z.object({
    date: z.string(),
    dayName: z.string(),
    tempHigh: z.number(),
    tempLow: z.number(),
    description: z.string(),
    icon: z.string(),
  })),
});

export const locationSearchSchema = z.object({
  query: z.string().min(1, "Please enter a location"),
});

export const coordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export type WeatherData = z.infer<typeof weatherDataSchema>;
export type LocationSearch = z.infer<typeof locationSearchSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
