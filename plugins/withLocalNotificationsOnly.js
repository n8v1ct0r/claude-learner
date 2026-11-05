// Strips the aps-environment (Push Notifications) entitlement from the iOS build.
// CCA Quest uses LOCAL notifications only (decision D12): on-device scheduled streak reminders
// need no APNs/push capability. Free Apple "Personal Team" accounts do not support the Push
// Notifications capability, so leaving aps-environment in the entitlements makes the app impossible
// to install on a free account. This config plugin keeps every prebuild output installable.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
