# Social Scheduling System Research

## Requirements Analysis

### Core Features (like Buffer)
1. **Multi-platform support**: Twitter/X, LinkedIn, Mastodon, Bluesky
2. **Scheduling**: Post at specific times
3. **Drafts**: Save posts for later
4. **Queue management**: Auto-schedule from queue
5. **Recurring posts**: Weekly/monthly patterns
6. **Thread support**: Multiple connected posts
7. **Media attachments**: Track media files
8. **Post status tracking**: draft → scheduled → published → failed

## dstask Integration Strategy

### Using dstask Fields
- **Tags**: Platform identification (+twitter, +linkedin, +mastodon, +bluesky)
- **Status tags**: +draft, +scheduled, +published, +failed
- **Due date**: When to publish
- **Priority**: Urgency (P0=immediate, P1=high, P2=normal)
- **Project**: Campaign/content series name
- **Summary**: Post content (first 100 chars preview)
- **Notes**: Full post content + metadata (thread, media URLs)

### Flexible Design
- **Platform-agnostic**: Easy to add new platforms
- **Metadata in notes**: JSON structure for platform-specific data
- **Queue system**: Priority + due date = smart scheduling
- **Thread support**: Parent/child task relationships
- **Template system**: Reusable post templates

### Commands Needed
1. `draft` - Create draft post
2. `schedule` - Schedule a post for publishing
3. `queue` - Add to auto-schedule queue
4. `publish` - Publish immediately
5. `list` - View drafts/scheduled/published
6. `cancel` - Cancel scheduled post
7. `reschedule` - Change publish time
8. `template` - Manage post templates
9. `thread` - Create thread of posts

## Architecture Benefits
- ✅ Git-backed (version control for posts)
- ✅ Searchable (find posts by content/platform)
- ✅ Portable (plain YAML files)
- ✅ Scriptable (integrate with CI/CD)
- ✅ Flexible (extend with custom tags)
