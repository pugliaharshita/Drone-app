const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Sample phone numbers data
const phoneData = [
  { phoneNumber: '1234567890', region: '1' },
  { phoneNumber: '9876543210', region: '1' },
  { phoneNumber: '5555555555', region: '91' },
  { phoneNumber: '6666666666', region: '91' },
  { phoneNumber: '7777777777', region: '1' },
  { phoneNumber: '8888888888', region: '91' }
];

// Create workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(phoneData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Phone Numbers');

// Write to file in both public and build directories
const publicPath = path.join(__dirname, '..', 'public', 'data', 'phone-numbers.xlsx');
const buildPath = path.join(__dirname, '..', 'build', 'data', 'phone-numbers.xlsx');

// Create directories if they don't exist
[publicPath, buildPath].forEach(filePath => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  XLSX.writeFile(workbook, filePath);
  console.log(`Excel file created at: ${filePath}`);
}); 