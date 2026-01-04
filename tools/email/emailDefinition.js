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
                        description: "The plain text body of the email. Auto-generate this from the conversation history if the user requests a summary or copy."
                    },
                    html: {
                        type: "STRING",
                        description: "The HTML body of the email. Auto-generate this from the conversation history if the user requests a summary or copy."
                    }
                },
                required: ["to", "subject", "text"]
            }
        }
    ]
};
