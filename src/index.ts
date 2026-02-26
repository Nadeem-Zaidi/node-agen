// // index.ts
// import z from "zod";
// import { addTwoNumber } from "./service_helper/weather";
// import { readFilesInDir } from "./service_helper/file_reader_in_dir";
// import { listDirectory } from "./service_helper/list_dir";
// import { MServer } from "./server/server";
// import { DatabaseConfig } from "./database/idatabaseadapter";
// import { DatabaseType } from "./database/databasefactory";
// import { DatabaseManager } from "./database/databasemanager";
// import { MHTTPServer } from "./mhttp/mhttpserver";
// import { ChartGenerator } from "./reports/chart_generator";
// import { JiraReader } from "./tools/jira_reader";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import { QDrant_Db } from "./vector_db/qdrant_db";
// import { OpenAIProvider } from "./llm/llms/open_ai";
// import dotenv from "dotenv";

import { S3Client } from "@aws-sdk/client-s3";
import { S3Reader } from "./file_reader/s3_reader";


// dotenv.config();
// const USE_HTTP = process.env.USE_HTTP === "true";
// const PORT = parseInt(process.env.PORT || "3000");
// const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });
// const vectorDb = new QDrant_Db(qdrantClient, 1536, "latest");
// const llmProvider = new OpenAIProvider({
//   apiKey: process.env.OPENAI_API_KEY!,
//   model: "gpt-4o",
// });
// async function run() {
//   const dbConfig: DatabaseConfig = {
//     host: "localhost",
//     port: 5432,
//     database: "testerp",
//     username: "postgres",
//     password: "owl",
//     ssl: false,
//     maxConnections: 10,
//     connectionTimeout: 10000,
//   };

//   const dbManager = DatabaseManager.getInstance();

//   // Get the database adapter from the connection
//   const db = await dbManager.addConnection(
//     "default",
//     DatabaseType.PostgreSQL,
//     dbConfig
//   );

//   // Initialize appropriate server
//   const server = USE_HTTP ? new MHTTPServer(PORT) : new MServer();

//   console.log(`🚀 Starting ${USE_HTTP ? 'HTTP' : 'Stdio'} MCP Server...`);



//   server.registerTools(
//     "list_directory",
//     {
//       description: "Use this tool to get the names of files and folders inside a directory on the server. Call this whenever the user asks to list, show, or see files in a folder.",
//       inputSchema: z.object({
//         dir: z.string().describe("Directory path to list files from"),
//       }),
//     },
//     async ({ dir }: { dir: string }) => {
//       try {
//         const files = await listDirectory(dir);

//         if (files.length === 0) {
//           return {
//             content: [{ type: "text", text: "Directory is empty." }],
//           };
//         }

//         const formatted = files.map(f => `- ${f}`).join("\n");

//         return {
//           content: [
//             {
//               type: "text",
//               text: `Files in ${dir}:\n${formatted}`,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error listing directory: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "get_current_directory",
//     {
//       description: "Use this tool ONLY when the user asks for the current working directory of the server process.",
//       inputSchema: z.object({}),
//     },
//     async () => {
//       try {
//         const cwd = process.cwd();

//         return {
//           content: [
//             {
//               type: "text",
//               text: `Current working directory is: ${cwd}`,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error getting directory: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "read_list_dir",
//     {
//       description: "Read all files in a directory with a specific extension and return their contents.",
//       inputSchema: z.object({
//         dir: z.string().describe("Directory path to scan"),
//         ext: z.string().describe("File extension to filter, e.g. .ts or .md"),
//       })
//     },
//     async ({ dir, ext }: { dir: string; ext: string }) => {
//       try {
//         let combinedText = "";

//         for await (const chunk of readFilesInDir(dir, ext)) {
//           combinedText += chunk;
//         }

//         if (!combinedText) {
//           return {
//             content: [{ type: "text", text: "No matching files found." }],
//           };
//         }

//         return {
//           content: [
//             {
//               type: "text",
//               text: combinedText.slice(0, 5000),
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error reading directory: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "add_two_number",
//     {
//       description: "Add two numbers together and return the result.",
//       inputSchema: z.object({
//         x: z.number().int().describe("First number"),
//         y: z.number().int().describe("Second number")
//       })
//     },
//     async ({ x, y }: { x: number; y: number }) => {
//       const data = await addTwoNumber(x, y);

//       if (!data) {
//         return {
//           content: [{ type: "text", text: "Calculation failed." }],
//           isError: true
//         };
//       }

//       return {
//         content: [{
//           type: "text",
//           text: `Answer is ${data}`
//         }]
//       };
//     }
//   );

//   // ===== WORK ORDER TOOLS =====

//   server.registerTools(
//     "query_workorders_by_status",
//     {
//       description: "Query work orders from the database filtered by status. Use this when the user asks about work orders with a specific status like 'show me cancelled work orders' or 'list approved work orders'. Valid statuses are: WAPPR (Waiting for Approval), APPR (Approved), INPRG (In Progress), COMP (Completed), CAN (Cancelled).",
//       inputSchema: z.object({
//         status: z.enum(['WAPPR', 'APPR', 'INPRG', 'COMP', 'CAN']).describe("Work order status to filter by"),
//       }),
//     },
//     async ({ status }: { status: string }) => {
//       try {
//         const dbConnection = dbManager.getConnection("default");

//         const result = await dbConnection.query(
//           "SELECT * FROM workorder WHERE status=$1 ORDER BY targetstartdate DESC",
//           [status]
//         );

//         if (result.rowCount === 0) {
//           return {
//             content: [
//               {
//                 type: "text",
//                 text: `No work orders found with status '${status}'.`
//               }
//             ],
//           };
//         }

//         const statusNames: Record<string, string> = {
//           'WAPPR': 'Waiting for Approval',
//           'APPR': 'Approved',
//           'INPRG': 'In Progress',
//           'COMP': 'Completed',
//           'CAN': 'Cancelled'
//         };

//         let formatted = `Found ${result.rowCount} work order(s) with status '${statusNames[status]}':\n\n`;

//         result.rows.forEach((wo: any, index: number) => {
//           formatted += `${index + 1}. **${wo.wonum}** - ${wo.description}\n`;
//           formatted += `   - Status: ${wo.status}`;
//           if (wo.pmnum) formatted += ` | PM#: ${wo.pmnum}`;
//           formatted += `\n   - Start: ${new Date(wo.targetstartdate).toLocaleString()}`;
//           formatted += `\n   - Finish: ${new Date(wo.targetfinishdate).toLocaleString()}\n\n`;
//         });

//         return {
//           content: [
//             {
//               type: "text",
//               text: formatted,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error querying work orders: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "get_all_workorders",
//     {
//       description: "Get all work orders from the database. Use this when the user asks to see all work orders, list all work orders, or show the complete work order list.",
//       inputSchema: z.object({}),
//     },
//     async () => {
//       try {
//         const dbConnection = dbManager.getConnection("default");

//         const result = await dbConnection.query(
//           "SELECT * FROM workorder ORDER BY status, targetstartdate DESC"
//         );

//         if (result.rowCount === 0) {
//           return {
//             content: [
//               { type: "text", text: "No work orders found in the database." }
//             ],
//           };
//         }

//         const statusCounts = await dbConnection.query(`
//           SELECT status, COUNT(*) as count 
//           FROM workorder 
//           GROUP BY status 
//           ORDER BY status
//         `);

//         let formatted = `## 📋 All Work Orders\n\n`;
//         formatted += `**Total:** ${result.rowCount} work orders\n\n`;

//         formatted += `### Status Breakdown:\n`;
//         statusCounts.rows.forEach((row: any) => {
//           formatted += `- **${row.status}**: ${row.count}\n`;
//         });
//         formatted += `\n---\n\n`;

//         const limit = Math.min(10, result.rowCount);
//         formatted += `### Showing first ${limit} work orders:\n\n`;

//         result.rows.slice(0, 10).forEach((wo: any, index: number) => {
//           formatted += `**${index + 1}. ${wo.wonum}** - ${wo.description}\n`;
//           formatted += `   - Status: ${wo.status}`;
//           if (wo.pmnum) formatted += ` | PM#: ${wo.pmnum}`;
//           formatted += `\n   - Start: ${new Date(wo.targetstartdate).toLocaleString()}\n\n`;
//         });

//         if (result.rowCount > 10) {
//           formatted += `\n*... and ${result.rowCount - 10} more work orders.*\n`;
//         }

//         return {
//           content: [
//             {
//               type: "text",
//               text: formatted,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error fetching work orders: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "get_workorder_by_number",
//     {
//       description: "Get a specific work order by its work order number. Use this when the user asks for details about a specific work order like 'show me WO-2024-001' or 'get details for work order WO-2024-005'.",
//       inputSchema: z.object({
//         wonum: z.string().describe("Work order number (e.g., WO-2024-001)"),
//       }),
//     },
//     async ({ wonum }: { wonum: string }) => {
//       try {
//         const dbConnection = dbManager.getConnection("default");

//         const result = await dbConnection.query(
//           "SELECT * FROM workorder WHERE wonum=$1",
//           [wonum]
//         );

//         if (result.rowCount === 0) {
//           return {
//             content: [
//               {
//                 type: "text",
//                 text: `Work order '${wonum}' not found.`
//               }
//             ],
//           };
//         }

//         const wo = result.rows[0];

//         const formatted = `## 🔧 Work Order Details\n\n` +
//           `**Number:** ${wo.wonum}\n` +
//           `**Description:** ${wo.description}\n` +
//           `**Status:** ${wo.status}\n` +
//           `**PM Number:** ${wo.pmnum || 'N/A'}\n\n` +
//           `### Timeline:\n` +
//           `- **Target Start:** ${new Date(wo.targetstartdate).toLocaleString()}\n` +
//           `- **Target Finish:** ${new Date(wo.targetfinishdate).toLocaleString()}\n` +
//           `- **Created:** ${new Date(wo.created_at).toLocaleString()}\n` +
//           `- **Updated:** ${new Date(wo.updated_at).toLocaleString()}`;

//         return {
//           content: [
//             {
//               type: "text",
//               text: formatted,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error fetching work order: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "get_workorder_stats",
//     {
//       description: "Get statistics about work orders including counts by status, upcoming work orders, and overdue items. Use this when the user asks for work order statistics, summary, or overview.",
//       inputSchema: z.object({}),
//     },
//     async () => {
//       try {
//         const dbConnection = dbManager.getConnection("default");

//         const statusStats = await dbConnection.query(`
//           SELECT status, COUNT(*) as count 
//           FROM workorder 
//           GROUP BY status 
//           ORDER BY status
//         `);

//         const totalResult = await dbConnection.query(`SELECT COUNT(*) as total FROM workorder`);
//         const total = totalResult.rows[0].total;

//         const upcomingResult = await dbConnection.query(`
//           SELECT COUNT(*) as count 
//           FROM workorder 
//           WHERE targetstartdate BETWEEN NOW() AND NOW() + INTERVAL '7 days'
//           AND status NOT IN ('COMP', 'CAN')
//         `);

//         const overdueResult = await dbConnection.query(`
//           SELECT COUNT(*) as count 
//           FROM workorder 
//           WHERE targetfinishdate < NOW()
//           AND status NOT IN ('COMP', 'CAN')
//         `);

//         let formatted = `## 📊 Work Order Statistics\n\n`;
//         formatted += `**Total Work Orders:** ${total}\n\n`;

//         formatted += `### Status Breakdown:\n`;
//         const statusNames: any = {
//           'WAPPR': 'Waiting for Approval',
//           'APPR': 'Approved',
//           'INPRG': 'In Progress',
//           'COMP': 'Completed',
//           'CAN': 'Cancelled'
//         };

//         statusStats.rows.forEach((row: any) => {
//           formatted += `- **${statusNames[row.status] || row.status}**: ${row.count}\n`;
//         });

//         formatted += `\n### Time-based Summary:\n`;
//         formatted += `- 📅 **Upcoming (Next 7 days):** ${upcomingResult.rows[0].count}\n`;
//         formatted += `- ⚠️  **Overdue:** ${overdueResult.rows[0].count}\n`;

//         return {
//           content: [
//             {
//               type: "text",
//               text: formatted,
//             },
//           ],
//         };
//       } catch (err: any) {
//         return {
//           content: [
//             { type: "text", text: `Error fetching statistics: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );


//   server.registerTools(
//     "jira_add_comment",
//     {
//       description: "Add a comment to a Jira issue. Use this when the user wants to comment on or update a Jira story.",
//       inputSchema: z.object({
//         issueKey: z.string().describe("Jira issue key e.g. JA-1"),
//         comment: z.string().describe("The comment text to add to the issue")
//       })
//     },
//     async ({ issueKey, comment }: { issueKey: string, comment: string }) => {
//       try {
//         console.log(`💬 Adding comment to ${issueKey}:`, comment);

//         const cleanId = issueKey.trim().toUpperCase();
//         const url = `https://nadeemowl.atlassian.net/rest/api/3/issue/${cleanId}`;

//         const jiraReader = new JiraReader(url, "");
//         const result = await jiraReader.addComment(cleanId, comment);

//         return {
//           content: [{
//             type: "text",
//             text: `✅ Comment added successfully to ${cleanId}. Comment ID: ${result.id}`
//           }]
//         };

//       } catch (error) {
//         console.error("❌ Add comment error:", error);
//         return {
//           content: [{
//             type: "text",
//             text: `Failed to add comment: ${(error as any).message}`
//           }],
//           isError: true
//         };
//       }
//     }
//   );

//   server.registerTools(
//     "jira_story_reader",
//     {
//       description: "Read the jira story description and design the solution for it",
//       inputSchema: z.object({
//         issueKey: z.string()
//       })

//     },
//     async ({ issueKey }: { issueKey: string }) => {
//       try {
//         const cleanStoryId = issueKey.trim().toUpperCase();
//         const url = `https://nadeemowl.atlassian.net/rest/api/2/issue/${cleanStoryId}`.trim()
//         console.log(url)


//         const jiraReader = new JiraReader(url, "");
//         const response = await jiraReader.fetchDetails();
//         const description = response.fields.description ?? "No description"


//         return {
//           content: [
//             {
//               type: "text",
//               text: `${description}`
//             }
//           ]
//         }

//       } catch (error) {
//         console.error("❌ Jira tool error:", error); // ← THIS is the key log
//         return {
//           content: [{ type: "text", text: "Something went wrong" }],
//           isError: true
//         };

//       }

//     }
//   );
//   server.registerTools(
//     "generate_workorder_report_with_charts",
//     {
//       description: "Generate a visual report with charts for work orders. Creates pie charts, bar charts showing status distribution, trends over time, and priority breakdown. Use this when the user asks for a visual report, dashboard, or charts.",
//       inputSchema: z.object({
//         days: z.number().int().optional().describe("Number of days to look back (default: 30)"),
//       }),
//     },
//     async ({ days = 30 }: { days?: number }) => {
//       try {
//         console.log(`📊 Starting chart generation for ${days} days...`);

//         const dbConnection = dbManager.getConnection("default");
//         const chartGenerator = new ChartGenerator('./public/charts');

//         // Get date range
//         const startDate = new Date();
//         startDate.setDate(startDate.getDate() - days);

//         // Query work orders
//         const result = await dbConnection.query(
//           `SELECT * FROM workorder 
//            WHERE created_at >= $1 
//            ORDER BY created_at DESC`,
//           [startDate]
//         );

//         console.log(`📦 Found ${result.rowCount} work orders`);

//         if (result.rowCount === 0) {
//           return {
//             content: [
//               { type: "text", text: `No work orders found in the last ${days} days.` }
//             ],
//           };
//         }

//         // Calculate statistics
//         const statusCounts: Record<string, number> = {};
//         const priorityCounts: Record<string, number> = {};
//         const dailyCounts: Record<string, number> = {};

//         result.rows.forEach((wo: any) => {
//           // Count by status
//           statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1;

//           // Count by priority
//           const priority = wo.priority || 'N/A';
//           priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

//           // Count by day
//           const date = new Date(wo.created_at).toLocaleDateString();
//           dailyCounts[date] = (dailyCounts[date] || 0) + 1;
//         });

//         console.log('📈 Generating charts...');

//         // Generate charts
//         const timestamp = Date.now();

//         // 1. Status Distribution Pie Chart
//         const statusChartPath = await chartGenerator.generatePieChart(
//           {
//             labels: Object.keys(statusCounts),
//             data: Object.values(statusCounts),
//             backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#007bff', '#6c757d'],
//           },
//           'Work Order Status Distribution',
//           `status-pie-${timestamp}.png`
//         );
//         console.log(`✅ Status chart: ${statusChartPath}`);

//         // 2. Priority Distribution Bar Chart
//         const priorityChartPath = await chartGenerator.generateBarChart(
//           {
//             labels: Object.keys(priorityCounts),
//             data: Object.values(priorityCounts),
//             backgroundColor: ['#dc3545', '#ffc107', '#28a745', '#6c757d'],
//             label: 'Count',
//           },
//           'Work Orders by Priority',
//           `priority-bar-${timestamp}.png`
//         );
//         console.log(`✅ Priority chart: ${priorityChartPath}`);

//         // 3. Timeline Line Chart
//         const sortedDates = Object.keys(dailyCounts).sort();
//         const timelineChartPath = await chartGenerator.generateLineChart(
//           {
//             labels: sortedDates,
//             data: sortedDates.map(date => dailyCounts[date]),
//             label: 'Work Orders Created',
//           },
//           `Work Orders Timeline (Last ${days} Days)`,
//           `timeline-line-${timestamp}.png`
//         );
//         console.log(`✅ Timeline chart: ${timelineChartPath}`);

//         // 4. Status Doughnut Chart (alternative view)
//         const statusDoughnutPath = await chartGenerator.generateDoughnutChart(
//           {
//             labels: Object.keys(statusCounts),
//             data: Object.values(statusCounts),
//             backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#007bff', '#6c757d'],
//           },
//           'Work Order Status Overview',
//           `status-doughnut-${timestamp}.png`
//         );
//         console.log(`✅ Doughnut chart: ${statusDoughnutPath}`);

//         // 🔥 Build absolute URLs
//         const statusChart = `${SERVER_URL}${statusChartPath}`;
//         const priorityChart = `${SERVER_URL}${priorityChartPath}`;
//         const timelineChart = `${SERVER_URL}${timelineChartPath}`;
//         const statusDoughnut = `${SERVER_URL}${statusDoughnutPath}`;

//         console.log('🎨 Chart URLs generated successfully');

//         // 🔥 FIXED: Proper markdown formatting with blank lines
//         const htmlReport = `## 📊 Work Order Visual Report

// **Period:** Last ${days} days

// **Total Work Orders:** ${result.rowCount}

// **Generated:** ${new Date().toLocaleString()}

// ---

// ### Status Distribution

// ![Status Chart](${statusChart})

// ### Priority Breakdown

// ![Priority Chart](${priorityChart})

// ### Timeline

// ![Timeline Chart](${timelineChart})

// ### Status Overview

// ![Status Doughnut](${statusDoughnut})

// ---

// ### Summary Statistics

// **Status Breakdown:**

// ${Object.entries(statusCounts).map(([status, count]) => `- **${status}**: ${count}`).join('\n')}

// **Priority Breakdown:**

// ${Object.entries(priorityCounts).map(([priority, count]) => `- **${priority}**: ${count}`).join('\n')}

// ---

// *Click on any chart above to view in full size.*`;

//         console.log('✅ Report generation complete!');

//         return {
//           content: [
//             {
//               type: "text",
//               text: htmlReport,
//             },
//           ],
//         };
//       } catch (err: any) {
//         console.error('❌ Chart generation error:', err);
//         return {
//           content: [
//             { type: "text", text: `Error generating report: ${err.message}` },
//           ],
//           isError: true,
//         };
//       }
//     }
//   );
//   server.registerTools(
//     "ask_documentation",
//     {
//       description: "Search the documentation and answer questions using AI. Use this when the user asks a question about the system, how something works, or needs help understanding any feature or concept from the docs.",
//       inputSchema: z.object({
//         question: z.string().describe("The question to search and answer from documentation"),
//         limit: z.number().int().optional().describe("Number of relevant chunks to retrieve (default: 5)")
//       })
//     },
//     async ({ question, limit = 5 }: { question: string; limit?: number }) => {
//       try {
//         console.log(`🔍 Searching docs for: "${question}"`);

//         // 1. embed the user's question
//         const questionVector = await llmProvider.generateEmbedding(question);

//         // 2. search qdrant for relevant chunks
//         const context = await vectorDb.search(questionVector, limit, true);

//         if (!context) {
//           return {
//             content: [{
//               type: "text",
//               text: "No relevant documentation found for your question."
//             }]
//           };
//         }

//         console.log(`📚 Found relevant context, asking LLM...`);

//         // 3. feed the context + question to the LLM
//         const messages = [
//           {
//             role: "system" as const,
//             content: `You are a helpful assistant. Answer the user's question using ONLY the context provided below. 
// If the answer is not in the context, say "I don't have enough information in the documentation to answer this."

// --- CONTEXT START ---
// ${context}
// --- CONTEXT END ---`
//           },
//           {
//             role: "user" as const,
//             content: question
//           }
//         ];

//         const response = await llmProvider.chat(messages);

//         return {
//           content: [{
//             type: "text",
//             text: response.content ?? "No response generated."
//           }]
//         };

//       } catch (err: any) {
//         console.error("❌ Documentation search error:", err);
//         return {
//           content: [{
//             type: "text",
//             text: `Error searching documentation: ${err.message}`
//           }],
//           isError: true
//         };
//       }
//     }
//   );

//   // Start the server
//   await server.start();

//   // Log success
//   console.log("✅ All tools registered successfully!");
//   if (USE_HTTP) {
//     console.log(`\n🌐 Open your browser at: http://localhost:${PORT}`);
//     console.log(`📊 Server URL for charts: ${SERVER_URL}`);
//   }
// }

// // Run the server
// run().catch((error) => {
//   console.error("❌ Server startup failed:", error);
//   process.exit(1);
// });
import dotenv from "dotenv";
dotenv.config();
const s3Client=new S3Client({
  region: "ap-south-1",
});

const reader=new S3Reader("nadeem-bucket-9891","docs",s3Client,"");

async function main() {
  for await (const chunk of reader.read_txt_files(4)) {
    console.log(chunk)
  }
}

main();