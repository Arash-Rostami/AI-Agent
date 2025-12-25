export const weatherToolDefinition = {
    functionDeclarations: [
        {
            name: "getCurrentWeather",
            description: "Gets the current weather conditions for a specified location.",
            parameters: {
                type: "OBJECT",
                properties: {
                    location: {
                        type: "STRING",
                        description: "The city or location to get the weather for.",
                    },
                    unit: {
                        type: "STRING",
                        description: "The unit of temperature (e.g., 'celsius' or 'fahrenheit'). Defaults to 'celsius'.",
                        enum: ["celsius", "fahrenheit"],
                    },
                },
                required: ["location"],
            },
        },
        {
            name: "getWeatherForecast",
            description: "Gets the 5-day weather forecast for a specified location. Use this when the user asks for future weather.",
            parameters: {
                type: "OBJECT",
                properties: {
                    location: {
                        type: "STRING",
                        description: "The city or location to get the forecast for.",
                    },
                    unit: {
                        type: "STRING",
                        description: "The unit of temperature (e.g., 'celsius' or 'fahrenheit'). Defaults to 'celsius'.",
                        enum: ["celsius", "fahrenheit"],
                    },
                },
                required: ["location"],
            },
        },
        {
            name: "getAirQuality",
            description: "Gets the current air quality index (AQI) and pollution details for a specified location.",
            parameters: {
                type: "OBJECT",
                properties: {
                    location: {
                        type: "STRING",
                        description: "The city or location to get air quality for.",
                    },
                },
                required: ["location"],
            },
        }
    ],
};
