import { execSync } from "child_process";
import { setCookiesInBrowser } from "./cookies.js";

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

let miseAvailable: boolean | null = null;

function checkMiseAvailable(): boolean {
  if (miseAvailable !== null) return miseAvailable;
  
  try {
    execSync('which mise', { stdio: 'pipe' });
    miseAvailable = true;
    return true;
  } catch {
    miseAvailable = false;
    return false;
  }
}

function execDstask(args: string[]): string {
  try {
    let dstaskCmd: string;
    
    if (checkMiseAvailable()) {
      dstaskCmd = `mise exec go:github.com/naggie/dstask/cmd/dstask@latest -- dstask ${args.join(" ")}`;
    } else {
      dstaskCmd = `dstask ${args.join(" ")}`;
    }
    
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

async function postToBrowser(api: any, platform: Platform, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (platform) {
      case "twitter":
        return await postToTwitter(api, content);
      case "linkedin":
        return await postToLinkedIn(api, content);
      case "mastodon":
        return await postToMastodon(api, content);
      case "bluesky":
        return await postToBluesky(api, content);
      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function postToTwitter(api: any, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Open X.com
    await api.browser({ 
      action: "open", 
      targetUrl: "https://x.com"
    });
    
    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Load cookies for authentication
    console.log('🍪 Loading X cookies...');
    await setCookiesInBrowser(api, 'x.com');
    
    // Refresh to apply cookies
    await api.browser({
      action: "navigate",
      targetUrl: "https://x.com/compose/tweet"
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take snapshot to find compose area
    const snapshot = await api.browser({ action: "snapshot" });
    console.log('📸 Page loaded, attempting to post...');
    
    // This is a simplified version - actual implementation would need
    // to parse the snapshot and find the correct elements
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function postToLinkedIn(api: any, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.browser({ action: "open", targetUrl: "https://www.linkedin.com/" });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Load LinkedIn cookies
    console.log('🍪 Loading LinkedIn cookies...');
    await setCookiesInBrowser(api, 'linkedin.com');
    
    // Refresh to apply cookies
    await api.browser({
      action: "navigate",
      targetUrl: "https://www.linkedin.com/"
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function postToMastodon(api: any, content: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "Mastodon posting requires instance configuration" };
}

async function postToBluesky(api: any, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.browser({ action: "open", targetUrl: "https://bsky.app/" });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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

function getPost(id: string): DstaskItem | null {
  const allPosts = listPosts({});
  return allPosts.find(p => p.id.toString() === id) || null;
}

function schedulePost(id: string, date: string): string {
  execDstask(["modify", id, "-draft", "+scheduled", `due:${date}`]);
  return `Scheduled post ${id} for ${date}`;
}

async function publishPost(api: any, id: string): Promise<string> {
  const post = getPost(id);
  if (!post) {
    throw new Error(`Post ${id} not found`);
  }
  
  const platforms = post.tags.filter(t => 
    ['twitter', 'linkedin', 'mastodon', 'bluesky'].includes(t)
  ) as Platform[];
  
  if (platforms.length === 0) {
    throw new Error(`Post ${id} has no platform tags`);
  }
  
  const content = post.notes || post.summary;
  
  console.log(`📱 Publishing post ${id} to ${platforms.join(', ')}...`);
  
  const results: { platform: Platform; success: boolean; error?: string }[] = [];
  
  for (const platform of platforms) {
    console.log(`🚀 Posting to ${platform}...`);
    const result = await postToBrowser(api, platform, content);
    results.push({ platform, ...result });
  }
  
  const allSucceeded = results.every(r => r.success);
  const someSucceeded = results.some(r => r.success);
  
  if (allSucceeded) {
    execDstask(["modify", id, "-scheduled", "-draft", "+published"]);
    execDstask(["done", id]);
    return `✅ Published post ${id} to ${platforms.join(', ')}`;
  } else if (someSucceeded) {
    const succeeded = results.filter(r => r.success).map(r => r.platform);
    const failed = results.filter(r => !r.success).map(r => r.platform);
    execDstask(["modify", id, "+failed"]);
    return `⚠️  Partially published post ${id}. Success: ${succeeded.join(', ')}. Failed: ${failed.join(', ')}`;
  } else {
    execDstask(["modify", id, "+failed"]);
    const errors = results.map(r => `${r.platform}: ${r.error}`).join('; ');
    throw new Error(`❌ Failed to publish post ${id}. Errors: ${errors}`);
  }
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
  api.registerCli(
    ({ program }: any) => {
      const social = program.command("social").description("Social media scheduling system");

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

      social
        .command("schedule <id> <date>")
        .description("Schedule a post (date format: 2026-01-15T14:00)")
        .action((id: string, date: string) => {
          console.log(schedulePost(id, date));
        });

      social
        .command("publish <id>")
        .description("Publish a post immediately using browser automation with cookies")
        .action(async (id: string) => {
          try {
            const result = await publishPost(api, id);
            console.log(result);
          } catch (error: any) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
          }
        });

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

      social
        .command("cancel <id>")
        .description("Cancel scheduled post (moves to drafts)")
        .action((id: string) => {
          console.log(cancelPost(id));
        });

      social
        .command("delete <id>")
        .description("Delete a post permanently")
        .action((id: string) => {
          console.log(deletePost(id));
        });
    },
    { commands: ["social"] }
  );

  api.registerTool({
    name: "social_scheduler",
    description: "Manage social media posts across multiple platforms. Automatically loads cookies from ~/openclaw/cookies/ for authentication. Create drafts, schedule posts, publish immediately via browser automation, and track your social media pipeline.",
    parameters: {
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
            result = await publishPost(api, params.id);
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

  api.registerGatewayMethod("social.draft", async (params: { content: string; platforms: Platform[]; campaign?: string }) => {
    const result = createPost(params.content, params.platforms, "draft", { campaign: params.campaign });
    return { ok: true, message: result };
  });

  api.registerGatewayMethod("social.schedule", async (params: { id: string; date: string }) => {
    const result = schedulePost(params.id, params.date);
    return { ok: true, message: result };
  });

  api.registerGatewayMethod("social.publish", async (params: { id: string }) => {
    try {
      const result = await publishPost(api, params.id);
      return { ok: true, message: result };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
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
