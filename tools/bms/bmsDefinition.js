export const bmsToolDefinition = {
    functionDeclarations: [
        {
            name: "searchBmsDatabase",
            description: "Searches the database for commercial or financial records. Uses intent detection to target specific tables for higher accuracy.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search keyword (e.g., 'PI-2024', 'O-500', 'Samsung')."
                    },
                    entity_type: {
                        type: "string",
                        enum: ["proforma", "order", "payment_request", "payment", "supplier", "buyer"],
                        description: "The specific entity to search for if known. If omitted, the system performs a sequential fallback search."
                    }
                },
                required: ["query"]
            }
        }
    ]
};
