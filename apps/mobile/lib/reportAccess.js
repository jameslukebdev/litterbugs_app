export const isPermanentUser = (user) => Boolean(user?.id && user.is_anonymous !== true);

export const permanentUserId = (user) => (isPermanentUser(user) ? user.id : null);

export const canManageReport = (report, user) => {
  const userId = permanentUserId(user);
  return Boolean(userId && report?.user_id === userId);
};
