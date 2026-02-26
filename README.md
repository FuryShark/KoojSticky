# KoojSticky

> **This is an AI-generated test project for a friend. Not intended for public use.**

## Table of Contents

- [What is KoojSticky?](#what-is-koojsticky)
- [How to Use](#how-to-use)
  - [Installing](#installing)
  - [Creating a Note](#creating-a-note)
  - [Saving, Loading, and Viewing](#saving-loading-and-viewing)
  - [Profiles (Templates)](#profiles-templates)
  - [Exporting](#exporting)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Developing with Claude Code](#developing-with-claude-code)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
  - [Project Structure](#project-structure)
  - [Data Storage](#data-storage)

---

## What is KoojSticky?

A desktop sticky-note app for Windows 10/11. You create notes with image backgrounds and styled text regions, then pin them to your desktop as always-on-top floating windows.

**Features:**
- Canvas editor with draggable, resizable text and link regions
- Background images via drag-and-drop or file picker (PNG, JPG, WebP)
- Rich text styling: font, size, weight, color, alignment, line height, padding
- Region styling: background fill, border, corner radius, opacity
- Link regions with clickable URLs
- Always-on-top frameless viewer windows (floating sticky notes)
- Click-through mode so notes don't block apps behind them
- Opacity control for viewer windows
- Profile system to save reusable layouts as templates
- Gallery view with preview thumbnails and search
- Export to PNG or WebP at 1x/2x/4x scale with optional transparency
- Undo/redo, layer ordering, keyboard shortcuts

Built with Electron, React, and Fabric.js.

---

## How to Use

### Installing

**Download the latest installer from [Releases](https://github.com/FuryShark/KoojSticky/releases).**

1. Download `KoojSticky Setup x.x.x.exe`
2. Double-click to install (creates Desktop and Start Menu shortcuts)
3. Launch KoojSticky from the shortcut
4. To pin to taskbar: right-click the taskbar icon while running and select "Pin to taskbar"

> Windows may show a SmartScreen warning since the app isn't code-signed. Click "More info" then "Run anyway".

### Creating a Note

1. Open the app — you start in the **Editor** with a blank canvas
2. **Import a background image**: drag-and-drop an image onto the canvas, or click **Import** in the toolbar
3. **Add text regions**: select the **Text tool** (T icon), then click and drag on the canvas
4. **Add link regions**: select the **Link tool** (chain icon), drag to create, then set the URL in the Properties panel
5. **Style your regions**: click any region, then use the Properties panel on the right
6. **Transform the background**: click the background image to move, scale, rotate, or adjust opacity

### Saving, Loading, and Viewing

- **Ctrl+S** or click **Save** to save your note
- Click any saved note in the sidebar Gallery tab to reload it
- Click **View** to open the note as a floating sticky note on your desktop
  - Hover top-right for controls: pin, click-through, edit, close
  - Hover bottom for opacity slider
  - Drag anywhere to reposition

### Profiles (Templates)

- **Save Profile**: saves the current layout as a reusable template (text stripped by default)
- **Update Profile**: pushes layout changes back to the linked profile
- Click any profile in the Gallery to create a new note from that layout

### Exporting

- **Ctrl+E** or click **Export** — choose PNG or WebP, 1x/2x/4x scale, optional transparent background

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+S | Save note |
| Ctrl+E | Export dialog |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Delete selected region |
| Escape | Deselect / close dialogs |

---

## Developing with Claude Code

If you want Claude to clone this repo, make changes, and rebuild the installer locally, here's how.

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer installed
- [Git](https://git-scm.com/) installed
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed

### Steps

1. **Clone the repo:**
   ```bash
   git clone https://github.com/FuryShark/KoojSticky.git
   cd KoojSticky
   npm install
   ```

2. **Open Claude Code in the project folder:**
   ```bash
   claude
   ```

3. **Ask Claude to make changes.** For example:
   - "Add a new font option to the text regions"
   - "Change the default canvas background color to light blue"
   - "Add a button to duplicate a note"

4. **Test your changes:**
   ```bash
   npm run dev
   ```
   This launches the app in development mode with hot reload.

5. **Build a new installer when you're happy:**
   ```bash
   npm run dist
   ```
   The new installer appears in the `release/` folder.

### Project Structure

```
electron/
  main.js          Main process (windows, IPC, file I/O)
  preload.js       Context bridge (renderer API)
src/
  App.jsx          Main editor UI
  main.jsx         Editor entry point
  viewer-main.jsx  Viewer entry point
  components/
    Editor/        Canvas editor, toolbar, properties panel
    Viewer/        Sticky note viewer window
    Gallery/       Profile and note gallery
    Sidebar.jsx    Sidebar with gallery + layers
    Icons.jsx      SVG icon components
  styles/
    index.css      Full design system
  utils/
    schemas.js     Data model helpers
build/
  icon.ico         App icon (Windows)
  icon.png         App icon (PNG)
```

### Data Storage

- **Development**: `./data/` (project root)
- **Installed app**: `%APPDATA%/kooj-sticky/data/`

```
data/
  assets/          Imported images (deduplicated by hash)
  profiles/<id>/   profile.json + preview.png
  notes/<id>/      note.json + preview.png
```
