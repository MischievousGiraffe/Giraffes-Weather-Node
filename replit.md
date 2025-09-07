# Overview

This is a modern weather application built with React, TypeScript, and Express. The application allows users to search for weather information by city name or use their current location to get real-time weather data and 5-day forecasts. It features a clean, responsive UI built with shadcn/ui components and integrates with the OpenWeatherMap API for weather data.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints for weather data retrieval with proper error handling
- **Data Validation**: Zod schemas for runtime type checking and API validation
- **Caching**: In-memory caching system for weather data with 10-minute TTL to reduce API calls

## Data Storage Solutions
- **Primary Storage**: In-memory storage using Map for weather data caching
- **Database ORM**: Drizzle ORM configured for PostgreSQL (schema defined but not actively used)
- **Session Storage**: PostgreSQL session store configuration available via connect-pg-simple
- **Cache Strategy**: Time-based cache invalidation for weather data to balance freshness with API rate limits

## External Dependencies

### Third-Party Services
- **OpenWeatherMap API**: Primary weather data provider for current conditions and forecasts
- **Geolocation API**: Browser-native API for obtaining user's current coordinates
- **Neon Database**: PostgreSQL database service (configured via @neondatabase/serverless)

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Development Server**: Hot module replacement and development middleware
- **Build Process**: ESBuild for server bundling and Vite for client bundling

### Key Integrations
- **Weather Data Flow**: City search → OpenWeatherMap Geocoding API → Weather API → Cached response
- **Location Services**: Browser geolocation → Coordinates → Weather API → Real-time data
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Response Caching**: Strategic caching to minimize API calls while maintaining data freshness