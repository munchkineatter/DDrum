# Casino Drawing Winner Display System

A web-based system for displaying casino drawing winners, featuring a user input page and a public display page.

## Features

- User input page for entering winner information
- Display page for showing winners in real-time
- Timer functionality for drawing countdowns
- Header image upload capability
- CSV export of winner data
- Mobile-responsive design with a dark theme and cyan accents

## Setup Instructions

### Frontend (GitHub Pages)

1. The frontend code is hosted on GitHub Pages.
2. Visit the live site at: `https://your-username.github.io/casino-drawing-system`

### Backend (Render)

The backend API is hosted on Render and handles:
- Storing winner information
- Retrieving winner data
- Data export capabilities

## Local Development

To run the system locally:

1. Clone the repository
```bash
git clone https://github.com/your-username/casino-drawing-system.git
cd casino-drawing-system
```

2. Install dependencies
```bash
npm install
```

3. Run the server
```bash
npm start
```

4. Open your browser and navigate to:
   - Input page: `http://localhost:3000`
   - Display page: `http://localhost:3000/display.html`

## API Endpoints

- `GET /api/winners` - Retrieve all winners
- `POST /api/winners` - Add new winners
- `DELETE /api/winners` - Clear all winner data

## Technologies Used

- HTML5, CSS3, and JavaScript
- Node.js and Express for the backend
- GitHub Pages for frontend hosting
- Render for backend hosting

## License

MIT 