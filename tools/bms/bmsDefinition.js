import {searchBmsDatabase} from "../../services/bmsTool.js";

export const bmsToolDefinition = {
    functionDeclarations: [
        {
            name: "searchBmsDatabase",
            "description": "Searches the Business Management Software (BMS) database for Contracts, Orders, Payments, and Partners. Returns a comprehensive knowledge graph of the requested entity. If a specific Reference Number (e.g., SP/404/269/017) fails, try searching for a simplified version (e.g., 404/269) or a related entity.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        "description": "The search keyword. Can be a Reference Number (PI-100, O-500), Contract Number, or Company Name. Precise matches are preferred, but partial matches are supported."                    },
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
