const app = require("./app");
const { syncSchema } = require("./config/schemaSync");

const port = process.env.PORT || 5000;

async function start() {
  try {
    await syncSchema();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to sync schema:", err.message);
    process.exit(1);
  }
}

start();
