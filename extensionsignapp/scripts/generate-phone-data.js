const XLSX = require('xlsx');
const path = require('path');

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

// Write to file
const outputPath = path.join(__dirname, '..', 'data', 'phone-numbers.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Excel file created at: ${outputPath}`); 