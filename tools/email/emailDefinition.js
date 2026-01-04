export const emailToolDefinition = {
    functionDeclarations: [
        {
            name: "sendEmail",
            description: "Sends an email to a specified recipient. Use this tool when the user explicitly requests to send an email. You MUST auto-generate the 'subject', 'text', and 'html' content based on the conversation history if the user implies it (e.g., 'email this to me'). Do not ask the user to provide content you already have.",
            parameters: {
                type: "OBJECT",
                properties: {
                    to: {
                        type: "STRING",
                        description: "The recipient's email address."
                    },
                    subject: {
                        type: "STRING",
                        description: "The subject of the email. Auto-generate a relevant subject if not provided (e.g., 'Chat Summary')."
                    },
                    text: {
                        type: "STRING",
                        description: "The plain text body of the email. Strictly contain ONLY the conversation transcript. Do NOT include introductory phrases like 'Here is the email you requested'. Start directly with the first message or summary."
                    },
                    html: {
                        type: "STRING",
                        description: "The HTML body of the email. Strictly contain ONLY the conversation transcript. Do NOT include introductory phrases like 'Here is the email you requested'. Use nice formatting."
                    },
                    userTime: {
                        type: "STRING",
                        description: "The user's local time string, if explicitly mentioned in the prompt (e.g., 'My local time is ...')."
                    }
                },
                required: ["to", "subject", "text"]
            }
        }
    ]
};
