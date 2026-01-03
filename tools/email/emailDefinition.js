export const emailToolDefinition = {
    name: "sendEmail",
    description: "Sends an email to a specified recipient. Use this tool when the user explicitly requests to send an email.",
    functionDeclarations: [
        {
            name: "sendEmail",
            description: "Sends an email to a specified recipient.",
            parameters: {
                type: "OBJECT",
                properties: {
                    to: {
                        type: "STRING",
                        description: "The recipient's email address."
                    },
                    subject: {
                        type: "STRING",
                        description: "The subject of the email."
                    },
                    text: {
                        type: "STRING",
                        description: "The plain text body of the email."
                    },
                    html: {
                        type: "STRING",
                        description: "The HTML body of the email (optional, for formatted content)."
                    }
                },
                required: ["to", "subject", "text"]
            }
        }
    ]
};
