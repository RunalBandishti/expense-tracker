import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { formatDateRange, pluralize } from '../lib/dates';
import type { InvitePreview, Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';

export function JoinPage() {
  const { token } = useParams();
  const { receiveTrip } = useTrips();
  const navigate = useNavigate();
  const toast = useToast();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api<{ invite: InvitePreview }>(`/invites/${token}`).then(
      ({ invite: preview }) => {
        if (preview.alreadyMember) navigate(`/trips/${preview.tripId}`, { replace: true });
        else setInvite(preview);
      },
      (err: Error) => setError(err.message),
    );
  }, [token, navigate]);

  const join = async () => {
    setJoining(true);
    try {
      const { trip } = await api<{ trip: Trip }>(`/invites/${token}/accept`, { method: 'POST' });
      receiveTrip(trip);
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (err) {
      toast({ message: (err as Error).message, tone: 'error' });
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 pt-24">
        <EmptyState emoji="🔗" title="Invite not available" body={error} action={<Button onClick={() => navigate('/')}>Go to my events</Button>} />
      </div>
    );
  }
  if (!invite) return <PageLoader />;

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-zinc-100 text-4xl">{invite.emoji}</span>
        <p className="mt-5 text-sm text-zinc-500">{invite.ownerName} invited you to</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{invite.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {[invite.startDate && invite.endDate && formatDateRange(invite.startDate, invite.endDate), pluralize(invite.memberCount, 'member')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={join} disabled={joining}>
          {joining && <LoaderCircle className="size-4 animate-spin" />}
          Join event
        </Button>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-zinc-500 hover:text-zinc-900">
          Not now
        </Link>
      </div>
    </div>
  );
}
