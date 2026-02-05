# OpenClaw Social Scheduler

[![CI](https://github.com/pepicrft/openclaw-plugin-social/actions/workflows/ci.yml/badge.svg)](https://github.com/pepicrft/openclaw-plugin-social/actions/workflows/ci.yml)

A powerful OpenClaw plugin for social media scheduling using dstask. Like Buffer, but open-source and better integrated with your workflow. **Publishes posts automatically using browser automation!**

## Features

- **Multi-platform support**: Twitter/X, LinkedIn, Mastodon, Bluesky
- **Flexible scheduling**: Schedule posts for specific times
- **Browser automation**: Actually publishes posts using OpenClaw's browser tool
- **Draft management**: Save and organize drafts
- **Campaign tracking**: Group posts by campaign/series
- **Smart filtering**: Filter by platform, status, or campaign
- **Upcoming view**: See what's publishing soon
- **Status management**: draft -> scheduled -> published
- **Git-backed**: Version control for all your posts
- **Searchable**: Find posts by content or metadata
- **Priority support**: Urgent, high, normal, low priorities
- **Intelligent dstask execution**: Uses mise if available, falls back to direct dstask

## Installation

### Prerequisites

First, install dstask using mise (recommended):

```bash
# Install dstask via mise go backend
mise use -g go:github.com/naggie/dstask/cmd/dstask@latest
```

Or install manually:
```bash
go install github.com/naggie/dstask/cmd/dstask@latest
```

**Note**: The plugin will automatically use mise if available, otherwise it falls back to direct dstask execution.

### Install the Plugin

```bash
openclaw plugins install openclaw-plugin-social
```

Or from GitHub:
```bash
openclaw plugins install github:pepicrft/openclaw-plugin-social
```

## Usage

### CLI Commands

```bash
# Create a draft post
openclaw social draft "Check out my new blog post!" \
  --platforms twitter,linkedin \
  --campaign "blog-promotion"

# Schedule a post
openclaw social schedule 42 2026-01-15T14:00

# Publish immediately (uses browser automation!)
openclaw social publish 42

# List drafts
openclaw social list draft

# List scheduled posts
openclaw social list scheduled

# Filter by platform
openclaw social list --platform twitter

# Filter by campaign
openclaw social list --campaign "blog-promotion"

# See upcoming posts (next 24 hours)
openclaw social upcoming

# See posts for next 48 hours
openclaw social upcoming 48

# Cancel a scheduled post
openclaw social cancel 42

# Delete a post
openclaw social delete 42
```

### Tool (for Claude)

Claude can manage your social media schedule and publish posts:

```
Create a draft tweet: "Just shipped a new feature!"
```

```
Schedule post 42 for tomorrow at 2pm
```

```
Publish post 42 now
```

```
What's scheduled for the next 24 hours?
```

```
Show me all my LinkedIn drafts
```

### Gateway RPC

```bash
# Create draft
curl -X POST http://localhost:3000/api/gateway/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "social.draft",
    "params": {
      "content": "New blog post!",
      "platforms": ["twitter", "linkedin"],
      "campaign": "blog-promotion"
    }
  }'

# Schedule post
curl -X POST http://localhost:3000/api/gateway/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "social.schedule",
    "params": {
      "id": "42",
      "date": "2026-01-15T14:00:00Z"
    }
  }'

# Publish post (uses browser automation)
curl -X POST http://localhost:3000/api/gateway/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "social.publish",
    "params": {"id": "42"}
  }'

# List posts
curl -X POST http://localhost:3000/api/gateway/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "social.list",
    "params": {
      "status": "scheduled",
      "platform": "twitter"
    }
  }'
```

## Browser Automation

The plugin uses OpenClaw's browser tool to actually post content to social media platforms:

### How It Works
1. When you run `publish`, the plugin opens the platform in a browser
2. Navigates to the compose area
3. Types your content
4. Clicks the post button
5. Updates the post status to "published" in dstask

### Supported Platforms
- **Twitter/X**: Opens compose, types content, clicks post
- **LinkedIn**: Opens feed, starts post, types content, publishes
- **Bluesky**: Opens app, composes post, publishes
- **Mastodon**: Requires instance configuration (coming soon)

### Requirements
- OpenClaw browser tool must be available
- You must be logged into the platforms in your browser
- Browser automation may require adjusting selectors if platforms change their UI

## Requirements

- [dstask](https://github.com/naggie/dstask) must be installed
- **Tip:** Use `mise use -g go:github.com/naggie/dstask/cmd/dstask@latest` for hassle-free installation!
- The plugin automatically detects mise and uses it if available
- OpenClaw browser tool must be available for publishing

## How It Works

This plugin uses dstask with a smart tagging system:

### Tags
- `+social` - All social posts
- `+twitter`, `+linkedin`, `+mastodon`, `+bluesky` - Platform tags
- `+draft`, `+scheduled`, `+published`, `+failed` - Status tags

### Fields
- **Due date**: When to publish
- **Priority**: Urgency (P0=critical, P1=high, P2=normal, P3=low)
- **Project**: Campaign/series name
- **Summary**: First 100 chars of post
- **Notes**: Full content + metadata

### Intelligent Execution
The plugin checks for mise availability at runtime:
- If mise is available: `mise exec go:github.com/naggie/dstask/cmd/dstask@latest -- dstask`
- Otherwise: `dstask` (direct execution)

### Benefits
- **Persistent** across sessions
- **Searchable** with dstask's query features
- **Integrated** with your existing workflow
- **Git-backed** for version control
- **Extensible** with custom tags
- **Actually publishes** using browser automation!

## Workflow Examples

### Basic Posting with Automation
```bash
# Create draft
openclaw social draft "Exciting news!" --platforms twitter

# Review and schedule
openclaw social list draft
openclaw social schedule 1 2026-01-15T14:00

# Publish immediately (browser automation)
openclaw social publish 1
```

### Campaign Management
```bash
# Create posts for a campaign
openclaw social draft "Post 1" --campaign "launch-week" --platforms twitter,linkedin
openclaw social draft "Post 2" --campaign "launch-week" --platforms twitter,linkedin

# Schedule them
openclaw social list draft --campaign "launch-week"
openclaw social schedule 1 2026-01-15T09:00
openclaw social schedule 2 2026-01-15T15:00

# Or publish immediately
openclaw social publish 1
```

## Development

```bash
# Clone the repo
git clone https://github.com/pepicrft/openclaw-plugin-social.git
cd openclaw-plugin-social

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

### Testing

This plugin uses [Vitest](https://vitest.dev/) for testing. The test suite includes:

- Plugin registration tests
- Tool handler validation tests (15+ test cases)
- Input schema validation tests
- Multi-platform support tests
- CI pipeline that runs on every commit

CI runs tests on Node.js 20.x and 22.x to ensure compatibility.

## Future Enhancements

Potential additions:
- Thread support (Twitter/X threads, LinkedIn carousels)
- Media attachment uploading
- Recurring post templates
- Analytics integration
- Auto-publishing daemon (check upcoming and publish automatically)
- Better error handling for browser automation
- OAuth integration for API-based posting

## License

MIT (c) Pedro Pinera

## Links

- [Repository](https://github.com/pepicrft/openclaw-plugin-social)
- [OpenClaw Plugin Docs](https://docs.openclaw.ai/plugin)
- [dstask](https://github.com/naggie/dstask)
- [Similar plugin: openclaw-plugin-grocery](https://github.com/pepicrft/openclaw-plugin-grocery)
