const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

const ROLES_AUTORISES = ['informatique', 'direction', 'controleur'];

async function hashPassword(plainText) {
  return bcrypt.hash(plainText, 10);
}

async function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

function isRoleAutorise(role) {
  return ROLES_AUTORISES.includes(role);
}

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '8h',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  hashPassword,
  comparePassword,
  isRoleAutorise,
  generateToken,
  verifyToken,
  ROLES_AUTORISES,
};