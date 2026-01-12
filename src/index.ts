import { execSync } from "child_process";

const SOCIAL_TAG = "+social";
const PLATFORM_TAGS = {
  twitter: "+twitter",
  linkedin: "+linkedin",
  mastodon: "+mastodon",
  bluesky: "+bluesky",
} as const;

const STATUS_TAGS = {
  draft: "+draft",
  scheduled: "+scheduled",
  published: "+published",
  failed: "+failed",
} as const;

type Platform = keyof typeof PLATFORM_TAGS;
type Status = keyof typeof STATUS_TAGS;

interface DstaskItem {
  uuid: string;
  status: string;
  id: number;
  summary: string;
  notes: string;
  tags: string[];
  project: string;
  priority: string;
  created: string;
  resolved: string;
  due: string;
}

interface PostMetadata {
  thread?: string[];
  media?: string[];
  platforms?: Platform[];
}

function execDstask(args: string[]): string {
  try {
    const dstaskCmd = `mise exec -- dstask ${args.join(" ")} 2>/dev/null || dstask ${args.join(" ")}`;
    
    return execSync(dstaskCmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: "/bin/bash",
    }).trim();
  } catch (error: any) {
    throw new Error(`dstask command failed: ${error.message}`);
  }
}

function parseDstaskJson(output: string): DstaskItem[] {
  const lines = output.split('\n');
  const jsonLines: string[] = [];
  let started = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('[')) {
      started = true;
    }
    if (started) {
      jsonLines.push(line);
      if (line.trim() === ']') {
        break;
      }
    }
  }
  
  if (jsonLines.length === 0) {
    return [];
  }
  
  try {
    const json = jsonLines.join('\n');
    return JSON.parse(json) as DstaskItem[];
  } catch (error) {
    return [];
  }
}

function createPost(
  content: string,
  platforms: Platform[],
  status: Status = "draft",
  options: { campaign?: string; due?: string; priority?: string; metadata?: PostMetadata } = {}
): string {
  const summary = content.substring(0, 100);
  const tags = [
    SOCIAL_TAG,
    STATUS_TAGS[status],
    ...platforms.map(p => PLATFORM_TAGS[p]),
  ];
  
  const args = ["add", summary, ...tags];
  
  if (options.campaign) {
    args.push(`project:${options.campaign}`);
  }
  
  if (options.priority) {
    args.push(options.priority);
  }
  
  if (options.due) {
    args.push(`due:${options.due}`);
  }
  
  execDstask(args);
  
  // Add full content and metadata to notes
  if (content.length > 100 || options.metadata) {
    const posts = listPosts({ status, limit: 1 });
    if (posts.length > 0) {
      const noteContent = [content];
      if (options.metadata) {
        noteContent.push('---');
        noteContent.push(JSON.stringify(options.metadata, null, 2));
      }
      execDstask(["note", posts[0].id.toString(), noteContent.join('\n')]);
    }
  }
  
  return `Created ${status} post for ${platforms.join(', ')}`;
}

function listPosts(filters: {
  status?: Status;
  platform?: Platform;
  campaign?: string;
  limit?: number;
} = {}): DstaskItem[] {
  const tags = [SOCIAL_TAG];
  
  if (filters.status) {
    tags.push(STATUS_TAGS[filters.status]);
  }
  
  if (filters.platform) {
    tags.push(PLATFORM_TAGS[filters.platform]);
  }
  
  const args = ["next", ...tags];
  
  if (filters.campaign) {
    args.push(`project:${filters.campaign}`);
  }
  
  const output = execDstask(args);
  const items = parseDstaskJson(output);
  
  return filters.limit ? items.slice(0, filters.limit) : items;
}

function schedulePost(id: string, date: string): string {
  // Remove draft tag, add scheduled tag
  execDstask(["modify", id, "-draft", "+scheduled", `due:${date}`]);
  return `Scheduled post ${id} for ${date}`;
}

function publishPost(id: string): string {
  execDstask(["modify", id, "-scheduled", "+published"]);
  execDstask(["done", id]);
  return `Published post ${id}`;
}

function cancelPost(id: string): string {
  execDstask(["modify", id, "-scheduled", "+draft"]);
  return `Cancelled post ${id}, moved to drafts`;
}

function deletePost(id: string): string {
  execDstask(["remove", id]);
  return `Deleted post ${id}`;
}

function getUpcoming(hours: number = 24): DstaskItem[] {
  const posts = listPosts({ status: "scheduled" });
  const now = new Date();
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return posts.filter(post => {
    if (post.due === "0001-01-01T00:00:00Z") return false;
    const dueDate = new Date(post.due);
    return dueDate >= now && dueDate <= until;
  });
}

export default function (api: any) {
  // Register CLI commands
  api.registerCli(
    ({ program }: any) => {
      const social = program.command("social").description("Social media scheduling system");

      // Draft command
      social
        .command("draft <content...>")
        .option("-p, --platforms <platforms>", "Comma-separated platforms (twitter,linkedin,mastodon,bluesky)", "twitter")
        .option("-c, --campaign <campaign>", "Campaign/series name")
        .description("Create a draft post")
        .action((contentParts: string[], options: any) => {
          const content = contentParts.join(" ");
          const platforms = options.platforms.split(",") as Platform[];
          console.log(createPost(content, platforms, "draft", { campaign: options.campaign }));
        });

      // Schedule command
      social
        .command("schedule <id> <date>")
        .description("Schedule a post (date format: 2026-01-15T14:00)")
        .action((id: string, date: string) => {
          console.log(schedulePost(id, date));
        });

      // Publish command
      social
        .command("publish <id>")
        .description("Publish a post immediately")
        .action((id: string) => {
          console.log(publishPost(id));
        });

      // List command
      social
        .command("list [status]")
        .option("-p, --platform <platform>", "Filter by platform")
        .option("-c, --campaign <campaign>", "Filter by campaign")
        .description("List posts (status: draft, scheduled, published)")
        .action((status: Status | undefined, options: any) => {
          const posts = listPosts({
            status,
            platform: options.platform,
            campaign: options.campaign,
          });
          
          if (posts.length === 0) {
            console.log(`📭 No ${status || 'social'} posts found`);
            return;
          }
          
          console.log(`📱 Social Posts (${posts.length}):`);
          posts.forEach((post) => {
            const platforms = post.tags.filter(t => t.match(/^(twitter|linkedin|mastodon|bluesky)$/));
            const statusTag = post.tags.find(t => t.match(/^(draft|scheduled|published|failed)$/));
            const due = post.due !== "0001-01-01T00:00:00Z" ? ` 📅 ${new Date(post.due).toLocaleString()}` : '';
            const campaign = post.project ? ` [${post.project}]` : '';
            console.log(`  ${post.id}. ${post.summary}`);
            console.log(`     ${platforms.join(', ')} • ${statusTag}${due}${campaign}`);
          });
        });

      // Upcoming command
      social
        .command("upcoming [hours]")
        .description("Show posts scheduled in the next N hours (default: 24)")
        .action((hours: string = "24") => {
          const posts = getUpcoming(parseInt(hours));
          
          if (posts.length === 0) {
            console.log(`📭 No posts scheduled in the next ${hours} hours`);
            return;
          }
          
          console.log(`🕐 Upcoming Posts (${posts.length}):`);
          posts.forEach((post) => {
            const platforms = post.tags.filter(t => t.match(/^(twitter|linkedin|mastodon|bluesky)$/));
            const due = new Date(post.due);
            console.log(`  ${post.id}. ${post.summary}`);
            console.log(`     ${platforms.join(', ')} • ${due.toLocaleString()}`);
          });
        });

      // Cancel command
      social
        .command("cancel <id>")
        .description("Cancel scheduled post (moves to drafts)")
        .action((id: string) => {
          console.log(cancelPost(id));
        });

      // Delete command
      social
        .command("delete <id>")
        .description("Delete a post permanently")
        .action((id: string) => {
          console.log(deletePost(id));
        });
    },
    { commands: ["social"] }
  );

  // Register tool for Claude
  api.registerTool({
    name: "social_scheduler",
    description: "Manage social media posts across multiple platforms. Create drafts, schedule posts, publish immediately, and track your social media pipeline.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["draft", "schedule", "publish", "list", "upcoming", "cancel", "delete"],
          description: "Action to perform",
        },
        content: {
          type: "string",
          description: "Post content (for draft action)",
        },
        platforms: {
          type: "array",
          items: {
            type: "string",
            enum: ["twitter", "linkedin", "mastodon", "bluesky"],
          },
          description: "Target platforms (for draft action)",
        },
        id: {
          type: "string",
          description: "Post ID (for schedule, publish, cancel, delete actions)",
        },
        date: {
          type: "string",
          description: "Schedule date in ISO format (for schedule action)",
        },
        status: {
          type: "string",
          enum: ["draft", "scheduled", "published"],
          description: "Filter by status (for list action)",
        },
        platform: {
          type: "string",
          enum: ["twitter", "linkedin", "mastodon", "bluesky"],
          description: "Filter by platform (for list action)",
        },
        campaign: {
          type: "string",
          description: "Campaign name (for draft/list actions)",
        },
        hours: {
          type: "number",
          description: "Hours to look ahead (for upcoming action)",
        },
      },
      required: ["action"],
    },
    handler: async (params: any, { respond }: any) => {
      try {
        let result: string;

        switch (params.action) {
          case "draft":
            if (!params.content) throw new Error("Content is required for draft action");
            if (!params.platforms || params.platforms.length === 0) {
              params.platforms = ["twitter"];
            }
            result = createPost(params.content, params.platforms, "draft", {
              campaign: params.campaign,
            });
            break;

          case "schedule":
            if (!params.id) throw new Error("Post ID is required for schedule action");
            if (!params.date) throw new Error("Date is required for schedule action");
            result = schedulePost(params.id, params.date);
            break;

          case "publish":
            if (!params.id) throw new Error("Post ID is required for publish action");
            result = publishPost(params.id);
            break;

          case "list":
            const posts = listPosts({
              status: params.status,
              platform: params.platform,
              campaign: params.campaign,
            });
            result = posts.length === 0
              ? "No posts found"
              : `Found ${posts.length} post(s):\n${posts.map((p) => 
                  `${p.id}. ${p.summary} [${p.tags.filter(t => !t.match(/^(social|draft|scheduled|published)$/)).join(', ')}]`
                ).join("\n")}`;
            break;

          case "upcoming":
            const upcoming = getUpcoming(params.hours || 24);
            result = upcoming.length === 0
              ? `No posts scheduled in the next ${params.hours || 24} hours`
              : `${upcoming.length} post(s) upcoming:\n${upcoming.map((p) =>
                  `${p.id}. ${p.summary} @ ${new Date(p.due).toLocaleString()}`
                ).join("\n")}`;
            break;

          case "cancel":
            if (!params.id) throw new Error("Post ID is required for cancel action");
            result = cancelPost(params.id);
            break;

          case "delete":
            if (!params.id) throw new Error("Post ID is required for delete action");
            result = deletePost(params.id);
            break;

          default:
            throw new Error(`Unknown action: ${params.action}`);
        }

        respond(true, { ok: true, result });
      } catch (error: any) {
        respond(false, { ok: false, error: error.message });
      }
    },
  });

  // Register Gateway RPC methods
  api.registerGatewayMethod("social.draft", async (params: { content: string; platforms: Platform[]; campaign?: string }) => {
    const result = createPost(params.content, params.platforms, "draft", { campaign: params.campaign });
    return { ok: true, message: result };
  });

  api.registerGatewayMethod("social.schedule", async (params: { id: string; date: string }) => {
    const result = schedulePost(params.id, params.date);
    return { ok: true, message: result };
  });

  api.registerGatewayMethod("social.list", async (params: { status?: Status; platform?: Platform; campaign?: string }) => {
    const posts = listPosts(params);
    return { ok: true, posts };
  });

  api.registerGatewayMethod("social.upcoming", async (params: { hours?: number }) => {
    const posts = getUpcoming(params.hours);
    return { ok: true, posts };
  });
}
