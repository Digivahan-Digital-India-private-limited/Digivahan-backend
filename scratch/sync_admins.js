require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/admin.model');

async function syncAdmins() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(n => n.trim()).filter(Boolean);
    
    if (adminPhones.length === 0) {
      console.log('No admin phones found in .env');
      return;
    }
    
    for (const phone of adminPhones) {
      const exists = await Admin.findOne({ phone });
      if (exists) {
        console.log(`Admin with phone ${phone} already exists.`);
      } else {
        console.log(`Creating admin with phone ${phone}...`);
        // We need some default values for required fields
        await Admin.create({
          first_name: 'Admin',
          last_name: phone === adminPhones[0] ? 'Primary' : 'Secondary',
          phone: phone,
          email: `admin_${phone}@digivahan.in`,
          is_active: true,
          role: 'super_admin'
        });
        console.log(`Admin ${phone} created.`);
      }
    }

    const allAdmins = await Admin.find({ phone: { $in: adminPhones } });
    console.log('Current Admins:', JSON.stringify(allAdmins, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

syncAdmins();
