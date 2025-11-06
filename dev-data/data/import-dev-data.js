// Create a script to import JSON data into the database
// or delete all data from the database

const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');

dotenv.config({ path: './config.env', override: true });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB)
  .then(() => console.log('✅ DB connection successful!'))
  .catch((err) => console.error('❌ DB connection error:', err));

// Read JSON file
let tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8'),
);

// 🧠 Convert startDates from strings → real Date objects
// tours = tours.map((tour) => {
//   if (Array.isArray(tour.startDates)) {
//     tour.startDates = tour.startDates.map((dateStr) => {
//       // The input format is "YYYY-MM-DD,HH:mm"
//       // Replace comma with 'T' to form a valid ISO date-time string
//       // and append 'Z' to mark as UTC
//       const isoString = `${dateStr.replace(',', 'T')}Z`;
//       return new Date(isoString);
//     });
//   }
//   return tour;
// });

// Import data into DB
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('✅ Data successfully loaded!');
  } catch (err) {
    console.error('❌ Error loading data:', err);
  }
  process.exit();
};

// Delete all data from DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('🧻 Data successfully deleted!');
  } catch (err) {
    console.error('❌ Error deleting data:', err);
  }
  process.exit();
};

// Run the import or delete function based on command line argument
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
