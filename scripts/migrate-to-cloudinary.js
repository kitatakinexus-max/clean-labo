require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('../services/cloudinary');
const firebase = require('../services/firebase-admin');

async function migrate() {
  const publicImgDir = path.join(__dirname, '../public/img');
  const publicVidDir = path.join(__dirname, '../public/videos');
  
  const assetMap = {};

  async function uploadDir(dir, type = 'image') {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;
      
      console.log(`Uploading ${file}...`);
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'clean-lab',
          resource_type: type === 'videos' ? 'video' : 'auto'
        });
        const normalizedKey = `/${type}/${file}`;
        assetMap[normalizedKey] = result.secure_url;
        console.log(`✅ Uploaded: ${file} -> ${result.secure_url} (Key: ${normalizedKey})`);
      } catch (err) {
        console.error(`❌ Error uploading ${file}:`, err.message);
      }
    }
  }

  console.log('--- Starting Migration ---');
  await uploadDir(publicImgDir, 'img');
  await uploadDir(publicVidDir, 'videos');
  
  if (Object.keys(assetMap).length > 0) {
    if (firebase.isInitialized && firebase.db) {
      await firebase.db.collection('siteConfig').doc('assets').set(assetMap, { merge: true });
      console.log('✅ Asset map saved to Firestore');
    } else {
      console.warn('⚠️ Firebase not initialized, saving locally to asset_map.json');
      fs.writeFileSync('asset_map.json', JSON.stringify(assetMap, null, 2));
    }
  }
  
  console.log('--- Migration Finished ---');
}

migrate();
