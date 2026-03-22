// print-qr.js  - prints TWO QR codes for the Mushroom Farm app
// Usage: node print-qr.js <emulator-url> <phone-url>
var qrcode = require('./node_modules/qrcode-terminal');

var emulatorUrl = process.argv[2] || 'exp://127.0.0.1:8081';
var phoneUrl    = process.argv[3] || 'exp://192.168.x.x:8081';
var line = '='.repeat(52);

console.log('');
console.log('  ' + line);
console.log('  QR 1 -- Android Emulator (this PC)');
console.log('  ' + line);
qrcode.generate(emulatorUrl, { small: true }, function (qr) {
  console.log(qr);
  console.log('  URL: ' + emulatorUrl);
  console.log('');

  console.log('  ' + line);
  console.log('  QR 2 -- Real Phone (must be on same WiFi)');
  console.log('  ' + line);
  qrcode.generate(phoneUrl, { small: true }, function (qr2) {
    console.log(qr2);
    console.log('  URL: ' + phoneUrl);
    console.log('');
    console.log('  Open Expo Go -> tap "Enter URL manually" -> paste the URL above.');
    console.log('  Or scan the QR code with your phone camera / Expo Go app.');
    console.log('');
  });
});
