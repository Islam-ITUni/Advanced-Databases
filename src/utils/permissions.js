function isObjectIdEqual(a, b) {
  return String(a) === String(b);
}

function canManageShop(user, shop) {
  if (!user || !shop) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return isObjectIdEqual(user._id, shop.owner);
}

function isShopStaff(user, shop) {
  if (!user || !shop) {
    return false;
  }

  if (canManageShop(user, shop)) {
    return true;
  }

  return shop.staff.some((member) => isObjectIdEqual(member.user, user._id));
}

module.exports = {
  isObjectIdEqual,
  canManageShop,
  isShopStaff
};
