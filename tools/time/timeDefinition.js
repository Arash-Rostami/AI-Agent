export const timeToolDefinition = {
    functionDeclarations: [
        {
            name: "getCurrentTime",
            description: "Gets the current time for a specific timezone. Use this when the user asks 'what time is it in X?'.",
            parameters: {
                type: "OBJECT",
                properties: {
                    timezone: {
                        type: "STRING",
                        description: "The IANA timezone identifier (e.g., 'Asia/Tokyo', 'America/New_York', 'UTC'). You must infer this from the user's location request.",
                    },
                },
                required: ["timezone"],
            },
        },
    ],
};
