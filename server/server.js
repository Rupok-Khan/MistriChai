const app = require("./app");
const { syncSchema } = require("./config/schemaSync");

const port = process.env.PORT || 5000;

async function start() {
  try {
    await syncSchema();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to sync schema:", err.message);
    process.exit(1);
  }
}

start();
