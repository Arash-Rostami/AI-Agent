import axios from 'axios';
import { WEATHER_API_KEY } from '../config/index.js';

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
            pressure: data.main.pressure
        };
    } catch (error) {
        console.error('❌ Error fetching weather:', error.response?.data || error.message);
        if (error.response && error.response.status === 404) {
            throw new Error(`Could not find weather data for "${location}". Please check the city name.`);
        }
        throw new Error(`Failed to retrieve weather for ${location}. Details: ${error.message}`);
    }
}