# opencode-antigravity-img

[![npm version](https://img.shields.io/npm/v/opencode-antigravity-img.svg)](https://www.npmjs.com/package/opencode-antigravity-img)
[![npm downloads](https://img.shields.io/npm/dm/opencode-antigravity-img.svg)](https://www.npmjs.com/package/opencode-antigravity-img)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenCode plugin for generating images using Gemini 3 Pro Image model via Google's Antigravity/CloudCode API.

## Requirements

- [OpenCode](https://github.com/sst/opencode) installed
- Google One AI Premium subscription
- Authentication via [opencode-antigravity-auth](https://www.npmjs.com/package/opencode-antigravity-auth) plugin

## Installation

1. First, install and configure the authentication plugin:

```bash
# Add to your opencode.json
"plugin": [
  "opencode-antigravity-auth",
  "opencode-antigravity-img"
]
```

2. Run the auth plugin to authenticate with your Google account:

```bash
opencode
# Use the authenticate command from antigravity-auth
```

This creates `~/.config/opencode/antigravity-accounts.json` with your credentials.

## Tools

### generate_image

Generate an image from a text prompt.

**Arguments:**
- `prompt` (required): Text description of the image to generate
- `filename` (optional): Output filename (default: `generated_<timestamp>.png`)
- `output_dir` (optional): Output directory (default: current working directory)

**Example:**
```
Generate an image of a sunset over mountains with a lake in the foreground
```

**Output:**
- Image file saved to specified path
- Returns path, size, format, and remaining quota

### image_quota

Check the remaining quota for the Gemini 3 Pro Image model.

**Arguments:** None

**Output:**
- Visual progress bar showing remaining quota percentage
- Time until quota resets

## Image Details

- **Model**: Gemini 3 Pro Image
- **Resolution**: 1408x768 pixels
- **Format**: JPEG (typically 600KB - 1MB)
- **Generation time**: 10-30 seconds

## Quota

Image generation uses a separate quota from text models. The quota resets every 5 hours. Use the `image_quota` tool to check your remaining quota before generating images.

## Troubleshooting

### "No Antigravity account found"

Make sure you've:
1. Installed `opencode-antigravity-auth`
2. Authenticated with your Google account
3. The credentials file exists at `~/.config/opencode/antigravity-accounts.json`

### "Rate limited" or generation fails

- Wait a few seconds and try again
- Check your quota with `image_quota`
- The plugin automatically tries multiple endpoints

### Slow generation

Image generation typically takes 10-30 seconds. This is normal due to the complexity of image synthesis.

## API Endpoints

The plugin uses Google's CloudCode API with fallback endpoints:
1. `https://daily-cloudcode-pa.googleapis.com` (primary)
2. `https://daily-cloudcode-pa.sandbox.googleapis.com` (fallback)
3. `https://cloudcode-pa.googleapis.com` (production)

## Related Plugins

- [opencode-antigravity-auth](https://www.npmjs.com/package/opencode-antigravity-auth) - Authentication (required)
- [opencode-antigravity-quota](https://www.npmjs.com/package/opencode-antigravity-quota) - Text model quota checking

## License

MIT
