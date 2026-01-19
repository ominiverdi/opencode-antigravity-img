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

This creates `antigravity-accounts.json` in your opencode config directory.

## Tools

### generate_image

Generate an image from a text prompt.

**Arguments:**
- `prompt` (required): Text description of the image to generate
- `filename` (optional): Output filename (default: `generated_<timestamp>.jpg`)
- `output_dir` (optional): Output directory (default: current working directory)
- `aspect_ratio` (optional): Image aspect ratio. Supported values: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` (default: `1:1`)
- `image_size` (optional): Image resolution. Supported values: `1K`, `2K`, `4K` (default: `1K`)

**Example:**
```
Generate a 16:9 landscape image of a sunset over mountains with a lake in the foreground
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
- **Resolutions**: 
  - `1K`: 1024x1024 (default)
  - `2K`: 2048x2048
  - `4K`: 4096x4096
- **Aspect ratios**: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`
- **Format**: JPEG (always, regardless of filename extension)
- **Generation time**: 10-30 seconds

## Unsupported Parameters

The following parameters are documented in Google's API but are **not supported** by the Gemini 3 Pro Image model (they are Imagen-specific):

- `personGeneration` - Control generation of people in images
- `outputMimeType` - Output format selection (always returns JPEG)
- `compressionQuality` - JPEG compression control

These parameters may work with Imagen models but have no effect with Gemini 3 Pro Image.

## Quota

Image generation uses a separate quota from text models. The quota resets every 5 hours. Use the `image_quota` tool to check your remaining quota.

## Troubleshooting

### "No Antigravity account found"

Make sure you've:
1. Installed `opencode-antigravity-auth`
2. Authenticated with your Google account
3. The credentials file `antigravity-accounts.json` exists in your opencode config directory

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

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Authentication (required)
- [opencode-antigravity-web](https://github.com/ominiverdi/opencode-antigravity-web) - Web search and URL reading

## License

MIT
