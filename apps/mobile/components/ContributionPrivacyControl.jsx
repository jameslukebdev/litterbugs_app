import { useEffect, useRef, useState } from 'react';
import { contributorNameShown, setContributorVisibility } from '../lib/contributorCredit';
import { PaymentNameVisibility } from './DonationPrivacy';

export default function ContributionPrivacyControl({ item, onSaved }) {
  const [shown, setShown] = useState(() => contributorNameShown(item.show_contributor_name));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setShown(contributorNameShown(item.show_contributor_name)); }, [item.show_contributor_name]);
  const change = async next => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await setContributorVisibility(item.id, next);
      if (!mounted.current) return;
      setShown(next);
      onSaved?.();
    } catch {
      if (mounted.current) setError('Your name preference could not be saved. Please retry.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return <PaymentNameVisibility shown={shown} busy={busy} error={error} onChange={change} />;
}
