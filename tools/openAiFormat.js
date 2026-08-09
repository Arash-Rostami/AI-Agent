function convertSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const converted = {...schema};
    if (typeof converted.type === 'string') converted.type = converted.type.toLowerCase();
    if (converted.properties) {
        converted.properties = Object.fromEntries(
            Object.entries(converted.properties).map(([key, value]) => [key, convertSchema(value)])
        );
    }
    if (converted.items) converted.items = convertSchema(converted.items);
    return converted;
}

// Converts Gemini-shaped tool definitions into OpenAI's tool-calling format.
export function toOpenAiTools(geminiToolDefinitions) {
    return geminiToolDefinitions.flatMap(def =>
        (def.functionDeclarations || []).map(fn => ({
            type: 'function',
            function: {
                name: fn.name,
                description: fn.description,
                parameters: convertSchema(fn.parameters)
            }
        }))
    );
}
