import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
var serviceAccount = require("./dantion-firebase-adminsdk.json");
export const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://dantion-firebase-default-rtdb.asia-southeast1.firebasedatabase.app",
})
