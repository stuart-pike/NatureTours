const dotenv = require('dotenv');

dotenv.config({ path: './config.env', override: true });

const app = require('./app');
//console.log(process.env);
//////////////// Start Server ////////////////
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
