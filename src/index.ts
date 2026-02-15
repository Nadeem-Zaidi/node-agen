import z from "zod";
import { addTwoNumber, makeNWSRequest } from "./service_helper/weather";
import { fileReader } from "./service_helper/file_reader";
import { readFilesInDir } from "./service_helper/file_reader_in_dir";
import { listDirectory } from "./service_helper/list_dir";
import { MServer } from "./server/server";
import { DatabaseConfig } from "./database/idatabaseadapter";
import { DatabaseType } from "./database/databasefactory";
import { DatabaseManager } from "./database/databasemanager";



const server = new MServer();

async function run (){
  const dbConfig: DatabaseConfig = {
  host: "localhost",
  port: 5432,
  database: "testerp",
  username: "postgres",
  password: "owl",
  ssl: false,
  maxConnections: 10,
  connectionTimeout: 10000,
};

const dbManager = DatabaseManager.getInstance();

// ✅ FIX: Get the database adapter from the connection
const db = await dbManager.addConnection(
  "default",
  DatabaseType.PostgreSQL,
  dbConfig
);

server.registerTools(
  "list_directory",
  {
    description: "Use this tool to get the names of files and folders inside a directory on the server. Call this whenever the user asks to list, show, or see files in a folder.",
    inputSchema: z.object({
      dir: z.string().describe("Directory path to list files from"),
    }),
  },
  async ({ dir }) => {
    try {
      const files = await listDirectory(dir);

      if (files.length === 0) {
        return {
          content: [{ type: "text", text: "Directory is empty." }],
        };
      }

      const formatted = files.map(f => `- ${f}`).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Files in ${dir}:\n${formatted}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error listing directory: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

server.registerTools(
  "get_current_directory",
  {
    description: "Use this tool ONLY when the user asks for the current working directory of the server process.",
    inputSchema: z.object({}), // no arguments needed
  },
  async () => {
    try {
      const cwd = process.cwd();

      return {
        content: [
          {
            type: "text",
            text: `Current working directory is: ${cwd}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error getting directory: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

server.registerTools(
  "read_list_dir",
  {
    description: "read_all_the_list_dir",
    inputSchema: z.object({
      dir: z.string().describe("Directory path to scan"),
      ext: z.string().describe("File extension to filter, e.g. .ts or .md"),
    })
  },
  async ({ dir, ext }) => {
    try {
      let combinedText = "";

      for await (const chunk of readFilesInDir(dir, ext)) {
        combinedText += chunk;
      }

      if (!combinedText) {
        return {
          content: [{ type: "text", text: "No matching files found." }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: combinedText.slice(0, 5000), // avoid huge outputs
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error reading directory: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

server.registerTools(
  "add_two_number",
  {
    description: "Get current weather for an Indian city",
    inputSchema: z.object({
      x: z.number().int(),
      y: z.number().int()
    })
  },
  async ({ x, y }) => {
    const data = await addTwoNumber(x, y);

    if (!data) {
      return {
        content: [{ type: "text", text: "Weather data not found." }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: `Answer is ${data}`
      }]
    };
  }
);

// ✅ NEW: Query work orders by status
server.registerTools(
  "query_workorders_by_status",
  {
    description: "Query work orders from the database filtered by status. Use this when the user asks about work orders with a specific status like 'show me cancelled work orders' or 'list approved work orders'. Valid statuses are: WAPPR (Waiting for Approval), APPR (Approved), INPRG (In Progress), COMP (Completed), CAN (Cancelled).",
    inputSchema: z.object({
      status: z.enum(['WAPPR', 'APPR', 'INPRG', 'COMP', 'CAN']).describe("Work order status to filter by"),
    }),
  },
  async ({ status }) => {
    try {
      // ✅ FIX: Get the connection from dbManager
      const dbConnection = dbManager.getConnection("default");
      
      // Query the database
      const result = await dbConnection.query(
        "SELECT * FROM workorder WHERE status=$1 ORDER BY targetstartdate DESC",
        [status]
      );

      if (result.rowCount === 0) {
        return {
          content: [
            { 
              type: "text", 
              text: `No work orders found with status '${status}'.` 
            }
          ],
        };
      }

      // Format the results
      const statusNames: Record<string, string> = {
        'WAPPR': 'Waiting for Approval',
        'APPR': 'Approved',
        'INPRG': 'In Progress',
        'COMP': 'Completed',
        'CAN': 'Cancelled'
      };

      let formatted = `Found ${result.rowCount} work order(s) with status '${statusNames[status]}':\n\n`;
      
      result.rows.forEach((wo: any, index: number) => {
        formatted += `${index + 1}. ${wo.wonum} - ${wo.description}\n`;
        formatted += `   Status: ${wo.status}`;
        if (wo.pmnum) formatted += ` | PM#: ${wo.pmnum}`;
        formatted += `\n   Start: ${new Date(wo.targetstartdate).toLocaleString()}`;
        formatted += `\n   Finish: ${new Date(wo.targetfinishdate).toLocaleString()}\n\n`;
      });

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error querying work orders: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ✅ NEW: Get all work orders (no filter)
server.registerTools(
  "get_all_workorders",
  {
    description: "Get all work orders from the database. Use this when the user asks to see all work orders, list all work orders, or show the complete work order list.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      // ✅ FIX: Get the connection from dbManager
      const dbConnection = dbManager.getConnection("default");
      
      const result = await dbConnection.query(
        "SELECT * FROM workorder ORDER BY status, targetstartdate DESC"
      );

      if (result.rowCount === 0) {
        return {
          content: [
            { type: "text", text: "No work orders found in the database." }
          ],
        };
      }

      // Get counts by status
      const statusCounts = await dbConnection.query(`
        SELECT status, COUNT(*) as count 
        FROM workorder 
        GROUP BY status 
        ORDER BY status
      `);

      let formatted = `Total Work Orders: ${result.rowCount}\n\n`;
      formatted += `Status Breakdown:\n`;
      statusCounts.rows.forEach((row: any) => {
        formatted += `- ${row.status}: ${row.count}\n`;
      });
      formatted += `\n`;

      // Show first 10 work orders
      const limit = Math.min(10, result.rowCount);
      formatted += `Showing first ${limit} work orders:\n\n`;
      
      result.rows.slice(0, 10).forEach((wo: any, index: number) => {
        formatted += `${index + 1}. ${wo.wonum} - ${wo.description}\n`;
        formatted += `   Status: ${wo.status}`;
        if (wo.pmnum) formatted += ` | PM#: ${wo.pmnum}`;
        formatted += `\n   Start: ${new Date(wo.targetstartdate).toLocaleString()}\n\n`;
      });

      if (result.rowCount > 10) {
        formatted += `... and ${result.rowCount - 10} more work orders.\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error fetching work orders: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ✅ NEW: Get work order by number
server.registerTools(
  "get_workorder_by_number",
  {
    description: "Get a specific work order by its work order number. Use this when the user asks for details about a specific work order like 'show me WO-2024-001' or 'get details for work order WO-2024-005'.",
    inputSchema: z.object({
      wonum: z.string().describe("Work order number (e.g., WO-2024-001)"),
    }),
  },
  async ({ wonum }) => {
    try {
      // ✅ FIX: Get the connection from dbManager
      const dbConnection = dbManager.getConnection("default");
      
      const result = await dbConnection.query(
        "SELECT * FROM workorder WHERE wonum=$1",
        [wonum]
      );

      if (result.rowCount === 0) {
        return {
          content: [
            { 
              type: "text", 
              text: `Work order '${wonum}' not found.` 
            }
          ],
        };
      }

      const wo = result.rows[0];
      
      const formatted = `Work Order Details:\n\n` +
        `Number: ${wo.wonum}\n` +
        `Description: ${wo.description}\n` +
        `Status: ${wo.status}\n` +
        `PM Number: ${wo.pmnum || 'N/A'}\n` +
        `Target Start: ${new Date(wo.targetstartdate).toLocaleString()}\n` +
        `Target Finish: ${new Date(wo.targetfinishdate).toLocaleString()}\n` +
        `Created: ${new Date(wo.created_at).toLocaleString()}\n` +
        `Updated: ${new Date(wo.updated_at).toLocaleString()}`;

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error fetching work order: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ✅ NEW: Get work order statistics
server.registerTools(
  "get_workorder_stats",
  {
    description: "Get statistics about work orders including counts by status, upcoming work orders, and overdue items. Use this when the user asks for work order statistics, summary, or overview.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      // ✅ FIX: Get the connection from dbManager
      const dbConnection = dbManager.getConnection("default");
      
      // Get counts by status
      const statusStats = await dbConnection.query(`
        SELECT status, COUNT(*) as count 
        FROM workorder 
        GROUP BY status 
        ORDER BY status
      `);

      // Get total count
      const totalResult = await dbConnection.query(`SELECT COUNT(*) as total FROM workorder`);
      const total = totalResult.rows[0].total;

      // Get upcoming work orders (next 7 days)
      const upcomingResult = await dbConnection.query(`
        SELECT COUNT(*) as count 
        FROM workorder 
        WHERE targetstartdate BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND status NOT IN ('COMP', 'CAN')
      `);

      // Get overdue work orders
      const overdueResult = await dbConnection.query(`
        SELECT COUNT(*) as count 
        FROM workorder 
        WHERE targetfinishdate < NOW()
        AND status NOT IN ('COMP', 'CAN')
      `);

      let formatted = `📊 Work Order Statistics\n\n`;
      formatted += `Total Work Orders: ${total}\n\n`;
      
      formatted += `Status Breakdown:\n`;
      statusStats.rows.forEach((row: any) => {
        const statusNames: any = {
          'WAPPR': 'Waiting for Approval',
          'APPR': 'Approved',
          'INPRG': 'In Progress',
          'COMP': 'Completed',
          'CAN': 'Cancelled'
        };
        formatted += `- ${statusNames[row.status] || row.status}: ${row.count}\n`;
      });

      formatted += `\n`;
      formatted += `📅 Upcoming (Next 7 days): ${upcomingResult.rows[0].count}\n`;
      formatted += `⚠️  Overdue: ${overdueResult.rows[0].count}\n`;

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error fetching statistics: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

server.start();

}
run()



// import { DatabaseType } from "./database/databasefactory";
// import { DatabaseManager } from "./database/databasemanager";
// import { DatabaseConfig } from "./database/idatabaseadapter";
// import { migrations } from "./migration_manager/migration";
// import { MigrationManager } from "./migration_manager/migrationmanager";
// import { S3_Client } from "./s3_client/s3_client"
// import dotenv from "dotenv";
// dotenv.config();

// async function start() {
//   // const client = new S3_Client("nadeem-bucket-9891", "processed/");

//   // await client.processFilesInBatches(5, async (fileKey, paragraph) => {

//   //   console.log("Embedding:", paragraph);


//   // });

//   const dbManager=DatabaseManager.getInstance();
//   await dbManager.addConnection("postgresql",DatabaseType.PostgreSQL,{
//     host: process.env.MYSQL_HOST || 'localhost',
//         port: parseInt(process.env.POSTGRES_HOST || '5432'),
//         database: process.env.POSTGRES_DATABASE || 'myapp',
//         username: process.env.POSTGRES_USERNAME || 'root',
//         password: process.env.POSTGRES_PASSWORD || 'password',
//         maxConnections: 10,
//   });

//   console.log(dbManager.hasConnection("postgresql"))



// }

// start()

// const dbConfig: DatabaseConfig = {
//   host: "localhost",
//   port: 5432,
//   database: "testerp",
//   username: "postgres",
//   password: "owl",
//   ssl: false,
//   maxConnections: 10,
//   connectionTimeout: 10000,
// };

// async function run() {
//   try {
//     const dbManager = DatabaseManager.getInstance();

//     const db = await dbManager.addConnection(
//       "default",
//       DatabaseType.PostgreSQL,
//       dbConfig
//     );

//     // const migrationManager = new MigrationManager(db);

//     // const results = await migrationManager.migrateUp(migrations);

//     // console.log("Migration Results:", results);
//     console.log(await db.query("SELECT * FROM workorder WHERE status='CAN'"));

//     await dbManager.closeAll();

//   } catch (error) {
//     console.error("Migration failed:", error);
//   }
// }

// run();