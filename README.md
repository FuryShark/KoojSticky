# KoojSticky

Desktop sticky-note app for Windows. Create notes with image backgrounds and styled text regions, then pin them to your desktop as always-on-top floating windows.

Built with Electron, React, and Fabric.js.

## Install

**Download the latest installer from [Releases](https://github.com/FuryShark/KoojSticky/releases).**

1. Download `KoojSticky Setup x.x.x.exe`
2. Double-click to install (creates Desktop and Start Menu shortcuts)
3. Launch KoojSticky from the shortcut

To pin to your taskbar: launch the app, right-click its taskbar icon, and select "Pin to taskbar".

> Windows may show a SmartScreen warning since the app isn't code-signed. Click "More info" then "Run anyway".

## Features

- **Canvas editor** with draggable, resizable text and link regions
- **Background images** via drag-and-drop or file picker (PNG, JPG, WebP)
- **Rich text styling** per region: font, size, weight, color, alignment, line height, padding
- **Region styling**: background fill, border color/width, corner radius, opacity
- **Link regions** with clickable URLs in viewer mode
- **Always-on-top viewer** windows (frameless sticky notes on your desktop)
- **Click-through mode** so notes don't block interaction with apps behind them
- **Opacity control** for viewer windows
- **Profile system** to save reusable layouts as templates
- **Gallery view** with preview thumbnails and search
- **Export** to PNG or WebP at 1x, 2x, or 4x scale with optional transparency
- **Undo/redo** history
- **Layer ordering** in the sidebar

## How to Use

### Creating a Note

1. Open the app — you start in the **Editor** with a blank canvas
2. **Import a background image**: drag-and-drop an image onto the canvas, or click the **Import** button in the toolbar
3. **Add text regions**: select the **Text tool** (T icon) in the toolbar, then click and drag on the canvas to place a text area. Type inside it to add text.
4. **Add link regions**: select the **Link tool** (chain icon), drag to create the region, then set the URL in the Properties panel on the right
5. **Style your regions**: click any region to select it, then use the Properties panel to change font, colors, borders, etc.
6. **Transform the background**: click the background image to move, scale, rotate, or adjust its opacity

### Saving and Loading

- Press **Ctrl+S** or click **Save** to save your note
- Notes appear in the **Gallery** sidebar tab (left panel) and the full **Gallery** view
- Click any saved note to reload it into the editor

### Viewing as a Sticky Note

1. Click **View** in the toolbar (or the eye icon on a saved note)
2. A frameless window appears that floats on your desktop
3. **Hover the top-right** to see controls:
   - **Pin** — toggle always-on-top
   - **Ghost** — toggle click-through mode (clicks pass through to apps behind)
   - **Pencil** — open in editor
   - **X** — close
4. **Hover the bottom** to adjust opacity
5. **Drag anywhere** to reposition
6. Links in the note are clickable and open in your default browser

### Profiles (Templates)

- **Save Profile**: saves the current layout without text content as a reusable template
- **Update Profile**: pushes layout changes back to the linked profile
- **New Note from Profile**: click any profile in the Gallery to create a fresh note with that layout
- Profiles support **tags** for organization and can be searched by name or tag

### Exporting

- Press **Ctrl+E** or click **Export** to open the export dialog
- Choose **PNG** or **WebP** format
- Select scale: **1x**, **2x**, or **4x**
- Optionally enable **transparent background**

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+S | Save note |
| Ctrl+E | Export dialog |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Delete selected region |
| Escape | Deselect / close dialogs |

## Development

Requires Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for production (preview)
npm run preview

# Build Windows installer
npm run dist
```

The installer is output to the `release/` folder.

## Project Structure

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

## Data Storage

User data is stored in:
- **Development**: `./data/` (project root)
- **Installed**: `%APPDATA%/kooj-sticky/data/`

```
data/
  assets/          Imported images (deduplicated by hash)
  profiles/<id>/   profile.json + preview.png
  notes/<id>/      note.json + preview.png
```
