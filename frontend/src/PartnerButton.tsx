import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { Player } from '../../shared/game/types';

export function PartnerButton({ partner, open, onClick }: { partner?: Player; open: boolean; onClick: () => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const online = partner && Math.max(now, Date.now()) - partner.lastSeen < 60000;
  return <button className="partner-button" aria-label={online ? `Partner: ${partner.name}` : 'Invite your partner'} aria-expanded={open} title={online ? `${partner.name} is connected` : 'Invite your partner'} onClick={onClick}>
    {online && <span className="presence online"/>}<span>{online ? partner.name : 'Invite your partner'}</span><Link2 size={16}/>
  </button>;
}
