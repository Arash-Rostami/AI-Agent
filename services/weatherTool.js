import axios from 'axios';
import { WEATHER_API_KEY } from '../config/index.js';

async function getCoordinates(location) {
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${WEATHER_API_KEY}`
        );
        if (response.data.cod && response.data.cod !== 200) {
             throw new Error(response.data.message);
        }
        return response.data.coord; // returns { lat, lon }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error(`Could not find coordinates for "${location}".`);
        }
        throw error;
    }
}

export async function getCurrentWeather(location, unit = 'celsius') {
    if (!location) {
        throw new Error('Location is required to get weather information.');
    }

    try {
        const unitsParam = unit === 'celsius' ? 'metric' : 'imperial';
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${WEATHER_API_KEY}&units=${unitsParam}`
        );
        const data = response.data;

        if (data.cod && data.cod !== 200) {
            throw new Error(data.message || `Error fetching weather for ${location}.`);
        }

        return {
            location: data.name,
            temperature: data.main.temp,
            conditions: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            pressure: data.main.pressure,
            coordinates: data.coord
        };
    } catch (error) {
        console.error('❌ Error fetching weather:', error.response?.data || error.message);
        if (error.response && error.response.status === 404) {
            throw new Error(`Could not find weather data for "${location}". Please check the city name.`);
        }
        throw new Error(`Failed to retrieve weather for ${location}. Details: ${error.message}`);
    }
}

export async function getWeatherForecast(location, unit = 'celsius') {
    if (!location) {
        throw new Error('Location is required to get weather forecast.');
    }

    try {
        const unitsParam = unit === 'celsius' ? 'metric' : 'imperial';
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${WEATHER_API_KEY}&units=${unitsParam}`
        );
        const data = response.data;

        if (data.cod && data.cod !== "200") { // API returns string "200" for forecast
            throw new Error(data.message || `Error fetching forecast for ${location}.`);
        }

        // Filter for one reading per day (approx) or return a summarized list
        // Returning the first 5 days (40 3-hour chunks total, usually)
        // Let's return a simplified daily summary to save tokens
        const dailyForecasts = {};

        data.list.forEach(item => {
            const date = item.dt_txt.split(' ')[0];
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    date: date,
                    temp_min: item.main.temp_min,
                    temp_max: item.main.temp_max,
                    conditions: item.weather[0].description
                };
            } else {
                dailyForecasts[date].temp_min = Math.min(dailyForecasts[date].temp_min, item.main.temp_min);
                dailyForecasts[date].temp_max = Math.max(dailyForecasts[date].temp_max, item.main.temp_max);
            }
        });

        return {
            location: data.city.name,
            forecast: Object.values(dailyForecasts).slice(0, 5) // Return first 5 days
        };

    } catch (error) {
        console.error('❌ Error fetching forecast:', error.response?.data || error.message);
        throw new Error(`Failed to retrieve forecast for ${location}. Details: ${error.message}`);
    }
}

export async function getAirQuality(location) {
    if (!location) {
        throw new Error('Location is required to get air quality.');
    }

    try {
        const { lat, lon } = await getCoordinates(location);

        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
        );
        const data = response.data;

        if (!data.list || data.list.length === 0) {
            throw new Error(`No air quality data found for ${location}.`);
        }

        const aqiMap = {
            1: "Good",
            2: "Fair",
            3: "Moderate",
            4: "Poor",
            5: "Very Poor"
        };

        const result = data.list[0];

        return {
            location: location,
            aqi: result.main.aqi,
            quality: aqiMap[result.main.aqi] || "Unknown",
            components: result.components // co, no, no2, o3, so2, pm2_5, pm10, nh3
        };

    } catch (error) {
        console.error('❌ Error fetching air quality:', error.response?.data || error.message);
        throw new Error(`Failed to retrieve air quality for ${location}. Details: ${error.message}`);
    }
}
