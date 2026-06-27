// createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

const AdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
}, { timestamps: true });

AdminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const Admin = mongoose.model('Admin', AdminSchema);

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existing = await Admin.findOne({ email: 'admin@mindwell.com' });
    if (existing) {
      console.log('✅ Admin already exists');
      console.log('   Email: admin@mindwell.com');
      console.log('   Password: admin123');
      process.exit();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin
    const admin = new Admin({
      name: 'MindWell Admin',
      email: 'admin@mindwell.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('   Email: admin@mindwell.com');
    console.log('   Password: admin123');
    console.log('   Password is hashed for security');
    process.exit();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit();
  }
};

createAdmin();