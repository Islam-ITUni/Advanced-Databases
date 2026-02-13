const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');

async function startServer() {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      console.log(`Server is running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
