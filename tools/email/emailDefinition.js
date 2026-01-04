export const emailToolDefinition = {
    functionDeclarations: [
        {
            name: "sendEmail",
            description: "Sends an email to a recipient. Automatically generate the subject, text, and html content based on the conversation context if the user does not provide them explicitly. Do not ask for content that can be inferred.",
            parameters: {
                type: "OBJECT",
                properties: {
                    to: {
                        type: "STRING",
                        description: "The recipient email address."
                    },
                    subject: {
                        type: "STRING",
                        description: "The email subject line. Generate a relevant and concise subject if not provided."
                    },
                    text: {
                        type: "STRING",
                        description: "The plain text body. Strictly contains the requested content, transcript, or summary. Exclude conversational filler, introductions, or meta-commentary."
                    },
                    html: {
                        type: "STRING",
                        description: "The HTML body. Structured with semantic HTML tags for readability. Contains the same core content as the text field. Exclude conversational filler."
                    },
                    userTime: {
                        type: "STRING",
                        description: "The user's current local time to be included in the email footer or metadata. You can leverage this tool provided."
                    }
                },
                required: ["to", "subject", "text"]
            }
        }
    ]
};