const bcrypt = require('bcrypt');

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

module.exports = { hashPassword, comparePassword, isRoleAutorise, ROLES_AUTORISES };
