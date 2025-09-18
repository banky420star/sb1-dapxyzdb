# Codex CLI 🤖

An AI-powered coding assistant that runs directly in your terminal. Codex helps you write code, debug issues, and manage your development workflow with the power of advanced language models.

## Features

- 🚀 **Interactive Terminal UI** - Beautiful terminal interface for seamless interaction
- 🧠 **Multiple AI Models** - Choose from GPT-5, GPT-5 Codex, and other models
- 🔐 **Flexible Authentication** - Sign in with ChatGPT account or use API keys
- 📁 **File Operations** - Read, write, and manage files with intelligent suggestions
- 💻 **Command Execution** - Run shell commands with safety controls
- 🖼️ **Image Support** - Attach images for visual context
- 🛡️ **Approval Modes** - Control what Codex can do on your system
- ⚡ **Exec Mode** - Run non-interactively for automation

## Installation

### Install with npm

```bash
npm install -g @openai/codex
```

### Install with Homebrew

```bash
brew install codex
```

### Install from source

```bash
git clone https://github.com/openai/codex-cli.git
cd codex-cli
npm install
npm run build
npm link
```

## Quick Start

### First Run

```bash
codex
```

The first time you run Codex, you'll be prompted to authenticate. We recommend signing in with your ChatGPT account to use Codex as part of your Plus, Pro, Team, Edu, or Enterprise plan.

### Run with a prompt

```bash
codex "explain this codebase"
```

### Attach images

```bash
codex -i screenshot.png "Fix this error"
codex --image diagram1.png,diagram2.png "Explain these architecture diagrams"
```

### Non-interactive execution

```bash
codex exec "fix the failing tests"
```

## Commands

### Interactive Mode Commands

When running Codex interactively, you can use these commands:

- `/model` - Change the AI model and reasoning level
- `/approvals` - Change the approval mode
- `/clear` - Clear the chat history
- `/help` - Show available commands
- `/exit` - Exit Codex

### CLI Commands

```bash
# Main interactive mode
codex [prompt] [options]

# Execute mode (non-interactive)
codex exec <prompt> [options]

# Configuration management
codex config --show        # Show current configuration
codex config --reset       # Reset to defaults

# Authentication management
codex auth --status        # Check authentication status
codex auth --logout        # Log out of current session
```

## Options

### Global Options

- `-m, --model <model>` - Specify the model to use (gpt-5, gpt-5-codex, o4-mini)
- `-i, --image <paths>` - Comma-separated paths to images
- `--api-key <key>` - Use a specific OpenAI API key
- `--approval <mode>` - Set approval mode (auto, read-only, full)

## Models & Reasoning

### Available Models

- **GPT-5** (Default) - Latest and most capable model
- **GPT-5 Codex** - Optimized specifically for coding tasks
- **O4 Mini** - Fast and efficient for simple tasks
- **GPT-4 Turbo** - Previous generation, still very capable
- **GPT-3.5 Turbo** - Legacy model, fast but less capable

### Reasoning Levels

- **Low** - Quick responses for simple tasks
- **Medium** (Default) - Balanced performance
- **High** - Deep analysis for complex problems

Change model and reasoning level with the `/model` command in interactive mode.

## Approval Modes

Codex offers three approval modes to control what operations it can perform:

### Auto (Default)
- Automatic approval for operations within the working directory
- Requires approval for:
  - Operations outside the working directory
  - Network access
  - Sensitive files (.env, .git, etc.)
  - Dangerous commands (rm, sudo, etc.)

### Read Only
- Chat-only mode
- No file or command operations allowed
- Perfect for planning and discussion

### Full Access
- No approval required for any operation
- Use with caution!

Change approval mode with the `/approvals` command or `--approval` flag.

## Authentication

### ChatGPT Account (Recommended)

Sign in with your ChatGPT account to use Codex as part of your subscription:
- Plus, Pro, Team, Edu, or Enterprise plans included
- No additional API costs
- Automatic updates and improvements

### API Key

Use your OpenAI API key for direct API access:
```bash
codex --api-key sk-...
```

Or set the environment variable:
```bash
export OPENAI_API_KEY=sk-...
codex
```

## Examples

### Explain a codebase
```bash
codex "explain the architecture of this project"
```

### Debug an error
```bash
codex -i error_screenshot.png "help me fix this error"
```

### Refactor code
```bash
codex "refactor the authentication module to use JWT tokens"
```

### Write tests
```bash
codex "write comprehensive unit tests for the UserService class"
```

### Generate documentation
```bash
codex "generate API documentation for all endpoints"
```

### Fix CI/CD issues
```bash
codex exec "fix the failing GitHub Actions workflow"
```

### Batch operations
```bash
codex exec "update all dependencies and fix any breaking changes"
```

## Configuration

Configuration is stored in `~/.config/configstore/@openai/codex.json`

### View configuration
```bash
codex config --show
```

### Reset configuration
```bash
codex config --reset
```

### Configuration options

- `model` - Default AI model
- `reasoningLevel` - Default reasoning level
- `approvalMode` - Default approval mode
- `workingDirectory` - Default working directory

## Tips & Best Practices

1. **Start with Read Only mode** when exploring a new codebase
2. **Use specific prompts** for better results
3. **Attach images** for visual bugs or UI issues
4. **Review operations** before approving in Auto mode
5. **Use exec mode** for CI/CD and automation
6. **Switch models** based on task complexity
7. **Clear chat** when switching contexts

## Troubleshooting

### Authentication Issues

If you're having trouble authenticating:
```bash
codex auth --logout
codex auth --status
codex  # Re-authenticate
```

### Rate Limits

If you encounter rate limits:
- Switch to a different model
- Reduce reasoning level
- Wait a few moments before retrying

### File Operation Errors

Ensure you have proper permissions:
```bash
ls -la  # Check file permissions
codex --approval full  # Temporarily use full access
```

## Privacy & Security

- Codex respects `.gitignore` and won't read ignored files
- Sensitive files require explicit approval
- Network operations require approval in Auto mode
- Your code is processed according to OpenAI's privacy policy

## Upgrade

### Upgrade with npm
```bash
npm install -g @openai/codex@latest
```

### Upgrade with Homebrew
```bash
brew upgrade codex
```

## Support

- **Documentation**: https://platform.openai.com/docs/codex
- **Issues**: https://github.com/openai/codex-cli/issues
- **Community**: https://community.openai.com
- **Email**: support@openai.com

## License

MIT License - See [LICENSE](LICENSE) file for details

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

Built with ❤️ by OpenAI