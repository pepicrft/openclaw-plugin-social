# 📱 Clawdbot Social Scheduler

[![CI](https://github.com/pepicrft/clawd-plugin-social/actions/workflows/ci.yml/badge.svg)](https://github.com/pepicrft/clawd-plugin-social/actions/workflows/ci.yml)

A powerful Clawdbot plugin for social media scheduling using dstask. Like Buffer, but open-source and better integrated with your workflow.

## ✨ Features

- 📝 **Multi-platform support**: Twitter/X, LinkedIn, Mastodon, Bluesky
- 📅 **Flexible scheduling**: Schedule posts for specific times
- 💾 **Draft management**: Save and organize drafts
- 🎯 **Campaign tracking**: Group posts by campaign/series
- 🔄 **Smart filtering**: Filter by platform, status, or campaign
- ⏰ **Upcoming view**: See what's publishing soon
- 🔀 **Status management**: draft → scheduled → published
- 🗂️ **Git-backed**: Version control for all your posts
- 🔍 **Searchable**: Find posts by content or metadata
- 🎨 **Priority support**: Urgent, high, normal, low priorities

## 📦 Installation

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

### Install the Plugin

```bash
clawdbot plugins install clawd-plugin-social
```

Or from GitHub:
```bash
clawdbot plugins install github:pepicrft/clawd-plugin-social
```

## 🚀 Usage

### 💻 CLI Commands

```bash
# Create a draft post
clawdbot social draft "Check out my new blog post!" \
  --platforms twitter,linkedin \
  --campaign "blog-promotion"

# Schedule a post
clawdbot social schedule 42 2026-01-15T14:00

# Publish immediately
clawdbot social publish 42

# List drafts
clawdbot social list draft

# List scheduled posts
clawdbot social list scheduled

# Filter by platform
clawdbot social list --platform twitter

# Filter by campaign
clawdbot social list --campaign "blog-promotion"

# See upcoming posts (next 24 hours)
clawdbot social upcoming

# See posts for next 48 hours
clawdbot social upcoming 48

# Cancel a scheduled post
clawdbot social cancel 42

# Delete a post
clawdbot social delete 42
```

### 🤖 Tool (for Claude)

Claude can manage your social media schedule:

```
Create a draft tweet: "Just shipped a new feature! 🚀"
```

```
Schedule post 42 for tomorrow at 2pm
```

```
What's scheduled for the next 24 hours?
```

```
Show me all my LinkedIn drafts
```

### 🌐 Gateway RPC

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

# Get upcoming posts
curl -X POST http://localhost:3000/api/gateway/rpc \
  -H "Content-Type: application/json" \
  -d '{"method": "social.upcoming", "params": {"hours": 48}}'
```

## 📋 Requirements

- [dstask](https://github.com/naggie/dstask) must be installed and available in your PATH
- 💡 **Tip:** Use `mise use -g go:github.com/naggie/dstask/cmd/dstask@latest` for hassle-free installation!

## 🔧 How It Works

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

### Benefits
- 💾 **Persistent** across sessions
- 🔍 **Searchable** with dstask's query features
- 🔄 **Integrated** with your existing workflow
- 🗂️ **Git-backed** for version control
- 🎨 **Extensible** with custom tags

## 🎯 Workflow Examples

### Basic Posting
```bash
# Create draft
clawdbot social draft "Exciting news!" --platforms twitter

# Review and schedule
clawdbot social list draft
clawdbot social schedule 1 2026-01-15T14:00

# Check what's upcoming
clawdbot social upcoming
```

### Campaign Management
```bash
# Create posts for a campaign
clawdbot social draft "Post 1" --campaign "launch-week" --platforms twitter,linkedin
clawdbot social draft "Post 2" --campaign "launch-week" --platforms twitter,linkedin
clawdbot social draft "Post 3" --campaign "launch-week" --platforms twitter,linkedin

# Schedule all campaign posts
clawdbot social list draft --campaign "launch-week"
# ... schedule each post

# Track campaign progress
clawdbot social list scheduled --campaign "launch-week"
clawdbot social list published --campaign "launch-week"
```

### Multi-Platform Strategy
```bash
# Create platform-specific variants
clawdbot social draft "Short tweet" --platforms twitter
clawdbot social draft "Professional update with more context" --platforms linkedin
clawdbot social draft "Casual toot" --platforms mastodon

# Review by platform
clawdbot social list --platform twitter
clawdbot social list --platform linkedin
```

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/pepicrft/clawd-plugin-social.git
cd clawd-plugin-social

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Test UI
npm run test:ui
```

### 🧪 Testing

This plugin uses [Vitest](https://vitest.dev/) for testing. The test suite includes:

- ✅ Plugin registration tests
- ✅ Tool handler validation tests (15+ test cases)
- ✅ Input schema validation tests
- ✅ Multi-platform support tests
- ✅ CI pipeline that runs on every commit

CI runs tests on Node.js 20.x and 22.x to ensure compatibility.

## 🚀 Future Enhancements

Potential additions:
- 🧵 Thread support (Twitter/X threads, LinkedIn carousels)
- 🖼️ Media attachment tracking
- 🔄 Recurring post templates
- 📊 Analytics integration
- 🤖 Auto-publishing daemon
- 📱 Mobile app notifications

## 📄 License

MIT © Pedro Piñera

## 🔗 Links

- 🏠 [Repository](https://github.com/pepicrft/clawd-plugin-social)
- 📚 [Clawdbot Plugin Docs](https://docs.clawd.bot/plugin)
- 🛠️ [dstask](https://github.com/naggie/dstask)
- 🔧 [Similar plugin: clawd-plugin-grocery](https://github.com/pepicrft/clawd-plugin-grocery)
