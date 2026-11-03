const recipients = ['gegibson@icloud.com', 'jameslukeb.evj@gmail.com'];

export default {
  async email(message) {
    if (message.to.toLowerCase() !== 'admin@litterbugs.app') {
      message.setReject('Unknown recipient');
      return;
    }

    // A pending or unavailable destination must not prevent the other copy.
    const results = await Promise.allSettled(
      recipients.map((recipient) => message.forward(recipient)),
    );
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      console.error(`Admin email forwarding: ${failures.length} destination(s) failed`);
    }
    if (failures.length === recipients.length) {
      throw new Error('No admin email destination accepted the message');
    }
  },
};
