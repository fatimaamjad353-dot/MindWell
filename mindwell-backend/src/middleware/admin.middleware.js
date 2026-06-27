const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
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

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as admin'
      });
    }

    req.user = await Admin.findById(decoded.id)
      .select('-password');
    req.user.role = 'admin';
    next();

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

module.exports = { protectAdmin };