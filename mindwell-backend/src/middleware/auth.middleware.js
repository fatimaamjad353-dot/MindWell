const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Handle all three roles
    if (decoded.role === 'patient') {
      req.user = await Patient.findById(decoded.id).select('-password');
    } else if (decoded.role === 'psychiatrist') {
      req.user = await Psychiatrist.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
    }

    // ✅ Guard against user not found in DB
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user.role = decoded.role;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };