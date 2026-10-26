import { useState, type ReactNode } from 'react';
import { Copy, Globe, MessageCircle, Share2, UserPlus, X } from 'lucide-react';
import { ApiError } from '../lib/api';
import { canNativeShare, copyText, nativeShare, whatsappUrl } from '../lib/share';
import { tripSummaryText } from '../lib/shareText';
import type { Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { Avatar, Button, Sheet } from './ui';

function LinkBox({ url, label, onTurnOff }: { url: string; label: string; onTurnOff?: () => void }) {
  const toast = useToast();
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="truncate rounded-xl bg-zinc-100 px-3 py-2.5 font-mono text-sm text-zinc-700">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => copyText(url).then(() => toast({ message: 'Link copied' }))}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
        {canNativeShare() && (
          <Button size="sm" variant="secondary" onClick={() => void nativeShare({ title: label, url })}>
            <Share2 className="size-3.5" />
            Share
          </Button>
        )}
        {onTurnOff && (
          <Button size="sm" variant="danger" onClick={onTurnOff} className="ml-auto">
            Turn off
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex gap-3 px-1">
        <span className="mt-0.5 text-zinc-400">{icon}</span>
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

type Props = { trip: Trip; onClose: () => void; onChooseIdentity: () => void };

export function ShareSheet({ trip, onClose, onChooseIdentity }: Props) {
  const { user, runAction } = useTrips();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const isOwner = trip.ownerId === user.id;
  const liveLink = trip.shareToken ? `${window.location.origin}/s/${trip.shareToken}` : null;
  const inviteLink = trip.inviteToken ? `${window.location.origin}/join/${trip.inviteToken}` : null;
  const summary = tripSummaryText(trip, { liveLink: liveLink ?? undefined, origin: window.location.origin });
  const me = trip.members.find((member) => member.userId === user.id);
  const myPerson = trip.people.find((person) => person.id === me?.personId);

  const act = async (key: string, path: string, method: 'POST' | 'DELETE') => {
    setBusy(key);
    try {
      await runAction(trip.id, path, method);
    } catch (err) {
      const offline = err instanceof ApiError && err.status === 0;
      toast({ message: offline ? 'You need to be online for this' : (err as Error).message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet title="Share" onClose={onClose} cancelLabel="Done">
      <div className="space-y-8">
        <Section
          icon={<MessageCircle className="size-5" />}
          title="Send a summary"
          description="Totals, each person's share and who pays whom, ready for your group chat."
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-100 px-3 py-2.5 font-sans text-sm text-zinc-700">
              {summary}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={whatsappUrl(summary)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
              <Button size="sm" variant="secondary" onClick={() => copyText(summary).then(() => toast({ message: 'Summary copied' }))}>
                <Copy className="size-3.5" />
                Copy
              </Button>
              {canNativeShare() && (
                <Button size="sm" variant="secondary" onClick={() => void nativeShare({ text: summary })}>
                  <Share2 className="size-3.5" />
                  More…
                </Button>
              )}
            </div>
          </div>
        </Section>

        <Section
          icon={<Globe className="size-5" />}
          title="Live view link"
          description="Anyone with the link sees the latest totals and balances. No account needed, and they can't edit."
        >
          {liveLink ? (
            <LinkBox
              url={liveLink}
              label={`${trip.name} expenses`}
              onTurnOff={isOwner ? () => void act('share-off', '/share', 'DELETE') : undefined}
            />
          ) : (
            <Button variant="secondary" disabled={busy === 'share'} onClick={() => void act('share', '/share', 'POST')}>
              Create live link
            </Button>
          )}
        </Section>

        <Section
          icon={<UserPlus className="size-5" />}
          title="Invite to edit"
          description="Friends sign in with this link and can add expenses with you."
        >
          {inviteLink ? (
            <LinkBox
              url={inviteLink}
              label={`Join ${trip.name}`}
              onTurnOff={isOwner ? () => void act('invite-off', '/invite', 'DELETE') : undefined}
            />
          ) : (
            <Button variant="secondary" disabled={busy === 'invite'} onClick={() => void act('invite', '/invite', 'POST')}>
              Create invite link
            </Button>
          )}
          <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {trip.members.map((member) => {
              const person = trip.people.find((candidate) => candidate.id === member.personId);
              return (
                <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white">
                    {member.username.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {member.username}
                      {member.userId === user.id && <span className="font-normal text-zinc-400"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {member.role === 'owner' ? 'Owner' : 'Can edit'}
                      {person && ` · ${person.name}`}
                    </p>
                  </div>
                  {isOwner && member.userId !== user.id && (
                    <button
                      type="button"
                      aria-label={`Remove ${member.username}`}
                      disabled={busy === member.userId}
                      onClick={() => {
                        if (window.confirm(`Remove ${member.username} from this trip?`)) {
                          void act(member.userId, `/members/${member.userId}`, 'DELETE');
                        }
                      }}
                      className="grid size-8 place-items-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <section className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          {myPerson && <Avatar person={myPerson} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-500">You are</p>
            <p className="truncate text-[15px] font-medium">
              {myPerson ? myPerson.name : me?.personId === null ? 'Not on this trip' : 'Not chosen yet'}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onChooseIdentity}>
            Change
          </Button>
        </section>
      </div>
    </Sheet>
  );
}
