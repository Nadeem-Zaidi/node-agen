import dotenv from "dotenv";
dotenv.config();


export class JiraReader {
    issueUrl: string;
    apiToken: string;

    constructor(issueUrl: string, apiToken: string) {
        this.issueUrl = issueUrl;
        this.apiToken = apiToken;
    }
    private markdownToADF(markdown: string): any {
        const lines = markdown.split('\n');
        const content: any[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // H1 Heading
            if (trimmed.startsWith('### ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: trimmed.slice(4) }]
                });
            }
            // H2 Heading
            else if (trimmed.startsWith('## ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: trimmed.slice(3) }]
                });
            }
            // H1 Heading
            else if (trimmed.startsWith('# ')) {
                content.push({
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: trimmed.slice(2) }]
                });
            }
            // Bullet list item
            else if (trimmed.startsWith('- ')) {
                const lastNode = content[content.length - 1];
                const itemContent = this.parseInlineMarkdown(trimmed.slice(2));

                if (lastNode?.type === 'bulletList') {
                    lastNode.content.push({
                        type: 'listItem',
                        content: [{ type: 'paragraph', content: itemContent }]
                    });
                } else {
                    content.push({
                        type: 'bulletList',
                        content: [{
                            type: 'listItem',
                            content: [{ type: 'paragraph', content: itemContent }]
                        }]
                    });
                }
            }
            // Numbered list item
            else if (/^\d+\.\s/.test(trimmed)) {
                const lastNode = content[content.length - 1];
                const itemText = trimmed.replace(/^\d+\.\s/, '');
                const itemContent = this.parseInlineMarkdown(itemText);

                if (lastNode?.type === 'orderedList') {
                    lastNode.content.push({
                        type: 'listItem',
                        content: [{ type: 'paragraph', content: itemContent }]
                    });
                } else {
                    content.push({
                        type: 'orderedList',
                        content: [{
                            type: 'listItem',
                            content: [{ type: 'paragraph', content: itemContent }]
                        }]
                    });
                }
            }
            // Regular paragraph
            else {
                content.push({
                    type: 'paragraph',
                    content: this.parseInlineMarkdown(trimmed)
                });
            }
        }

        return { type: 'doc', version: 1, content };
    }

    // Handles inline **bold** and plain text
    private parseInlineMarkdown(text: string): any[] {
        const nodes: any[] = [];
        const regex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Plain text before bold
            if (match.index > lastIndex) {
                nodes.push({
                    type: 'text',
                    text: text.slice(lastIndex, match.index)
                });
            }
            // Bold text
            nodes.push({
                type: 'text',
                text: match[1],
                marks: [{ type: 'strong' }]
            });
            lastIndex = regex.lastIndex;
        }

        // Remaining plain text
        if (lastIndex < text.length) {
            nodes.push({ type: 'text', text: text.slice(lastIndex) });
        }

        return nodes.length > 0 ? nodes : [{ type: 'text', text }];
    }

    private getAuthHeader(): string {
        const EMAIL = "nadeem.tat@gmail.com";
        const API_TOKEN = process.env.JIRA_API;
        if (!EMAIL || !API_TOKEN) {
            throw new Error("JIRA_EMAIL or JIRA_API not set in environment");
        }
        return Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
    }
    async addComment(issueKey: string, commentText: string) {
    const auth = this.getAuthHeader();
    const url = `https://nadeemowl.atlassian.net/rest/api/3/issue/${issueKey}/comment`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Basic ${auth}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            body: this.markdownToADF(commentText) // ✅ convert markdown to ADF
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Comment added:", data.id);
    return data;
}

    async updateJira(issueKey: string, content: string) {
        const auth = this.getAuthHeader();

        const response = await fetch(this.issueUrl, {
            method: 'PUT',
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json",
                "Content-Type": "application/json"   // ← was missing
            },
            body: JSON.stringify({
                fields: {
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",          // ← was "text"
                                content: [
                                    {
                                        type: "text",
                                        text: content       // ← "text" not "content"
                                    }
                                ]
                            }
                        ]
                    }
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                error.errorMessages?.[0] ||
                JSON.stringify(error.errors) ||
                "Failed to update Jira issue"
            );
        }

        return { success: true, issueKey };
    }

    async fetchDetails() {
        const auth = this.getAuthHeader();

        const response = await fetch(this.issueUrl, {
            method: 'GET',
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(result.fields.description)
        return result
    }
}