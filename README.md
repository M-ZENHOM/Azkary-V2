# Azkar App

A lightweight desktop app for periodic Islamic Azkar (remembrance) notifications. Built with Tauri, React, and TypeScript.

## Features

- Periodic notifications at customizable intervals
- Daily Azkar counter (auto-resets at midnight)
- Add, edit, and remove your own Azkar
- Auto-start with Windows
- Runs efficiently in the background

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.9.0+)
- [Rust](https://www.rust-lang.org/tools/install)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/azkar-app-rust.git
cd azkar-app-rust

# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build
```

## Usage

- **Add Azkar**: Type in the input field and click "Add"
- **Edit Azkar**: Click on any text to edit inline
- **Remove Azkar**: Click the × button
- **Set Interval**: Adjust notification timing in settings
- **Auto-start**: Toggle "Start with Windows" option

## Tech Stack

- React 19 + TypeScript
- Tauri 2
- Vite
- Rust

## Contributing

Contributions are welcome! Here's how:

1. **Fork the repo** and clone it locally
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Make your changes** and test thoroughly
4. **Commit**: `git commit -m "Add your feature"`
5. **Push**: `git push origin feature/your-feature`
6. **Open a Pull Request**

### Guidelines

- Follow existing code style
- Run `cargo fmt` for Rust code before committing
- Test your changes in dev mode
- Update docs if needed

### What to Contribute

- Bug fixes
- New features
- Documentation improvements
- UI/UX enhancements
- Translations

## License

MIT License - see [LICENSE](LICENSE) file

---

**Made with ❤️ for those who remember Allah**
