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
                        description: "The unit of temperature (e.g., 'celsius' or 'fahrenheit'). Defaults to 'celsius'. You do not need to ask about this. Always search the default one unless asked otherwise.",
                        enum: ["celsius", "fahrenheit"],
                    },
                },
                required: ["location"],
            },
        },
    ],
};