# Wi-Fi Share 📡

A feature-rich local file sharing web application built with Flask. Share files across your local network with a beautiful, mobile-friendly interface.

## Features ✨

### Core Features
- **🔐 Password Protection** - Secure access with password authentication
- **📤 File Upload** - Upload multiple files or entire folders
- **📁 Folder Management** - Create, browse, and organize folders
- **⬇️ Download** - Download individual files or folders as ZIP
- **🗑️ Delete** - Remove files and folders
- **📱 QR Code Access** - Quick mobile access via QR code

### New Enhanced Features

#### 📊 Storage Statistics
- View total storage usage
- Count of files and folders
- File type distribution
- Click "📊 Storage Stats" to view

#### 🎨 Dark Mode
- Toggle between light and dark themes
- Persists across sessions
- Easy on the eyes for night use

#### ☑️ Bulk Operations
- Select multiple files at once
- Delete multiple items simultaneously
- Efficient batch management

#### 🔍 Advanced Filtering & Sorting
- Search files by name
- Filter by type (images, videos, documents, etc.)
- Sort by name (A-Z, Z-A)
- Sort by date and size

#### 🖼️ File Preview
- Preview images directly in the browser
- Play videos inline
- Play audio files inline
- Quick view without downloading

#### ✏️ Text Editor
- Edit text files directly in the browser
- Supports: .txt, .md, .json, .js, .py, .c, .cpp, .h, .java, .php, .html, .css, .xml, .log, .csv, .sh, .bat, .sql, and more
- Create new text files
- Syntax-friendly monospace editor
- Support for 40+ programming languages and config files

#### 📦 Move Files
- Move files between folders
- Reorganize your storage
- Simple drag-free interface

#### 🔗 Link Management
- Save and organize web links
- Copy links quickly
- Edit and delete saved links
- Great for sharing URLs across devices

#### ✂️ Clipboard Operations
- Copy/Cut/Paste files across folders
- Persistent clipboard state (survives page refresh)
- Visual indicators for clipboard status
- Cancel button to clear clipboard

#### 🎯 Context Menus
- Right-click files for quick actions
- Preview, Edit, Rename, Move, Copy, Cut, Paste
- Download and Delete options
- Details view for files and folders

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Scan the QR code or visit the URL shown in terminal

## Configuration

Edit `config.py` to customize:

- **PASSWORD** - Change default password (currently "1234")
- **PORT** - Change server port (default: 8000)
- **MAX_CONTENT_LENGTH** - Max upload size (default: 5 GB)

## File Structure

```
wifi-share/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── requirements.txt    # Python dependencies
├── routes/            # Route handlers
│   ├── auth.py        # Authentication
│   ├── files.py       # File operations
│   ├── links.py       # Link management
│   └── views.py       # Page views
├── services/          # Business logic
│   ├── filesystem.py  # File system operations
│   └── links_store.py # Link storage
├── static/            # Frontend assets
│   ├── app.js         # JavaScript functionality
│   └── style.css      # Styling
├── templates/         # HTML templates
│   └── index.html     # Main page
└── uploads/           # File storage directory
```

## Security Features

- Password authentication required
- Path traversal protection
- System folder protection (`.system` directory)
- File size limits
- Secure file operations with validation

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for all screen sizes

## Tips

1. **Mobile Upload**: Use camera buttons to take photos/videos and upload directly
2. **Keyboard Shortcuts**: Use browser search (Ctrl/Cmd+F) to find files quickly
3. **Dark Mode**: Toggle for comfortable viewing in low light
4. **Bulk Delete**: Select multiple files to delete them all at once
5. **Text Editing**: Right-click text files and select Edit to modify them inline
6. **Copy/Paste**: Cut or copy files, navigate to destination folder, click "Paste Here" button
7. **Context Menu**: Right-click any file or folder for quick access to all operations
8. **Audio Playback**: On mobile, use the larger audio controls for easier slider access

## Requirements

- Python 3.7+
- Flask
- qrcode
- All dependencies in `requirements.txt`

## License

Open source - feel free to modify and use!
