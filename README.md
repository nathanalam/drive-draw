# Drive Draw

Drive Draw is a seamless integration of [Excalidraw](https://excalidraw.com/) with Google Drive. It allows you to create, edit, and manage your Excalidraw diagrams directly within your Google Drive storage, providing a native file management experience.

## How it Works

Drive Draw operates as a Google Drive application, offering the following workflow:

1.  **Authentication**: Users sign in with their Google account to authorize access to their Drive.
2.  **File Management**:
    *   **Dashboard**: Upon login, users are presented with a dashboard to create new drawings or open existing ones.
    *   **Direct Storage**: All `.excalidraw` files are stored directly in your Google Drive. There is no third-party database holding your data.
    *   **Open from Drive**: You can open files directly from the Google Drive interface (Right-click -> Open with -> Drive Draw) or use the in-app file picker.
3.  **Real-time Saving**: Changes made to the canvas are automatically synced back to the specific file in Google Drive.
4.  **Sharing**: You can use the standard Google Drive sharing features to collaborate with others. The "Share" button in the app opens the Drive sharing dialog.

## Features

This application utilizes the core **Excalidraw** engine. For a complete list of drawing features, shortcuts, and tools, please refer to the official documentation:

*   [Excalidraw Website](https://excalidraw.com/)
*   [Excalidraw Documentation](https://docs.excalidraw.com/)

**Drive Draw specific features:**
*   Automatic Dark Mode aesthetics.
*   Custom File Picker for identifying valid Excalidraw files in your Drive.
*   Direct integration with Google Drive Revision History.

## Technology Stack

*   [React](https://react.dev/)
*   [Vite](https://vitejs.dev/)
*   [Excalidraw Package](https://www.npmjs.com/package/@excalidraw/excalidraw)
*   [Google Drive API v3](https://developers.google.com/drive/api/v3/reference)

## Development

To run this project locally:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a Google Cloud Project and configure OAuth credentials (see `src/main.jsx`).
4.  Run the development server:
    ```bash
    npm run dev
    ```
