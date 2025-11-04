# Electron Build Instructions

This document explains how to build and run your Inventory Flow app as a standalone desktop application (.exe for Windows, .dmg for Mac, .AppImage for Linux).

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. **Git** (to clone the repository)

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

To run the app in Electron during development (with hot reload):

```bash
# Terminal 1: Start the Vite dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

The app will open in an Electron window. Any changes you make to the code will automatically reload.

## Building for Production

### Build for Windows (.exe)

```bash
npm run build
npm run electron:build:win
```

The installer will be created in the `release` folder as a `.exe` file.

### Build for macOS (.dmg)

```bash
npm run build
npm run electron:build:mac
```

**Note:** You need to run this on a Mac to create macOS builds.

### Build for Linux (.AppImage)

```bash
npm run build
npm run electron:build:linux
```

### Build for All Platforms

```bash
npm run build
npm run electron:build
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "cross-env NODE_ENV=development electron electron/main.js",
    "electron:build": "electron-builder",
    "electron:build:win": "electron-builder --win",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:linux": "electron-builder --linux"
  }
}
```

## Database Location

When running as an Electron app, the SQLite database is stored at:

- **Windows:** `C:\Users\<Username>\AppData\Roaming\Inventory Flow\inventory.db`
- **macOS:** `~/Library/Application Support/Inventory Flow/inventory.db`
- **Linux:** `~/.config/Inventory Flow/inventory.db`

## Offline Functionality

The Electron version is **fully offline** and includes:

- ✅ Local SQLite database
- ✅ All data stored on your computer
- ✅ No internet connection required
- ✅ Backup and restore functionality
- ✅ PDF generation
- ✅ Excel import/export

## Key Features

### Authentication
- Default login: `admin` / `admin`
- Create additional admin accounts
- All credentials stored locally and securely

### Data Management
- All inventory data stored in local SQLite database
- Fast performance with indexed queries
- Automatic data persistence
- Export data to JSON for backup
- Import data from JSON to restore

### Differences from Web Version

| Feature | Web Version | Electron Version |
|---------|-------------|------------------|
| Data Storage | localStorage (5-10MB limit) | SQLite (unlimited) |
| Performance | Good | Excellent |
| Offline | Limited | Full |
| Installation | Browser-based | Desktop app |
| Updates | Automatic | Manual |

## Troubleshooting

### "better-sqlite3" build errors

If you encounter errors with `better-sqlite3`, you may need to install:

**Windows:**
- Visual Studio Build Tools
- Python 3.x

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
- Build essentials: `sudo apt-get install build-essential`

### App won't start

1. Check console for errors
2. Delete the database file and restart
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Database issues

To reset the database:
1. Close the app
2. Delete the database file (see "Database Location" above)
3. Restart the app

## Distribution

Once built, you can distribute the installer files (.exe, .dmg, or .AppImage) to users. They can install and run the app without any additional setup or internet connection.

## Next Steps

1. **Install cross-env** for cross-platform development:
   ```bash
   npm install --save-dev cross-env
   ```

2. **Customize the app**:
   - Update app name and icon in `electron-builder.json`
   - Modify company settings defaults
   - Add custom branding

3. **Code signing** (for production):
   - Windows: Get a code signing certificate
   - macOS: Enroll in Apple Developer Program
   - Linux: No code signing required

## Support

For issues or questions, refer to:
- Electron documentation: https://www.electronjs.org/docs
- electron-builder: https://www.electron.build/
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
