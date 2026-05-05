# Waseel Backend

Node.js + Express backend foundation for Waseel.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create/update the `.env` file (already added with placeholders):

```bash
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

3. Run the server:

```bash
npm start
```

The server will start on port `5000` (or the `PORT` defined in `.env`) and connect to MongoDB using `MONGODB_URI`.

