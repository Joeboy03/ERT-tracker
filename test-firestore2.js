import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    await setDoc(doc(db, 'users', 'test_user'), {
      categories: [],
      dailyGoal: 10,
      baseRate: 10,
      premiumRate: 10,
      showEarnings: true
    });
  } catch (e) {
    console.error("EXPECTED ERROR:", e.code, e.message);
  }
}
test();
