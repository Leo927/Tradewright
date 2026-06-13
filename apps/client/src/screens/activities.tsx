import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { ActivityView } from '@tradewright/contract';
import { useAppState, navigate, assignActivityAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatDuration } from '../i18n/format.js';

function LockChips({ activity }: { activity: ActivityView }) {
  const { itemList } = useNames();
  return (
    <span className="chips">
      {activity.lockReasons.map((r, i) => {
        switch (r.code) {
          case 'TIER_LOCKED':
            return (
              <em className="chip" key={i}>
                🔒 <FormattedMessage id="common.tier" values={{ tier: r.requiredTier }} />
              </em>
            );
          case 'INSUFFICIENT_INPUTS':
            return (
              <em className="chip" key={i}>
                <FormattedMessage
                  id="activities.missing-inputs"
                  values={{ items: itemList(r.missing) }}
                />
              </em>
            );
          case 'STATION_TIER_LOW':
            return (
              <em className="chip" key={i}>
                🔒 <FormattedMessage id="common.tier" values={{ tier: r.requiredTier }} />
              </em>
            );
        }
      })}
    </span>
  );
}

function ConfirmSheet({
  activity,
  onClose,
}: {
  activity: ActivityView;
  onClose: () => void;
}) {
  const { locale, character } = useAppState();
  const intl = useIntl();
  const { name, itemList } = useNames();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const replacing =
    character?.assignment && character.assignment.haltReason === null
      ? character.assignment.activityId
      : null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet">
        <h2>{name(activity.activityId)}</h2>
        <p>
          <FormattedMessage
            id="activities.confirm.duration"
            values={{ duration: formatDuration(locale, activity.actionSeconds) }}
          />
        </p>
        <p>
          <FormattedMessage
            id="activities.confirm.consumes"
            values={{ items: activity.inputs.length > 0 ? itemList(activity.inputs) : '—' }}
          />
        </p>
        <p>
          <FormattedMessage
            id="activities.confirm.yields"
            values={{ items: itemList(activity.outputs) }}
          />
        </p>
        <p>
          <FormattedMessage
            id="activities.confirm.xp"
            values={{ xp: activity.xpPerAction, skill: name(activity.skillId) }}
          />
        </p>
        {replacing ? (
          <p className="hint" data-testid="replace-warning">
            <FormattedMessage
              id="activities.confirm.replace-warning"
              values={{ current: name(replacing) }}
            />
          </p>
        ) : null}
        {errorCode ? (
          <p role="alert" className="error">
            {intl.formatMessage({ id: `error.${errorCode}` })}
          </p>
        ) : null}
        <div className="sheet-actions">
          <button onClick={onClose}>
            <FormattedMessage id="common.cancel" />
          </button>
          <button
            className="primary"
            data-testid="confirm-start"
            onClick={async () => {
              const code = await assignActivityAction(activity.activityId, replacing !== null);
              if (code) setErrorCode(code);
            }}
          >
            <FormattedMessage id="activities.confirm.start" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActivitiesScreen() {
  const { activities, character, locale } = useAppState();
  const { name } = useNames();
  const [selected, setSelected] = useState<ActivityView | null>(null);

  const bySkill = new Map<string, ActivityView[]>();
  for (const a of activities) {
    bySkill.set(a.skillId, [...(bySkill.get(a.skillId) ?? []), a]);
  }
  const levelOf = (skillId: string) =>
    character?.skills.find((s) => s.skillId === skillId)?.level ?? 1;

  return (
    <main className="screen" data-screen="activities">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.activities" />
        </h1>
      </header>
      {[...bySkill.entries()].map(([skillId, list]) => (
        <section key={skillId}>
          <h2 className="section-label">
            {name(skillId)} ·{' '}
            <FormattedMessage id="common.level" values={{ level: levelOf(skillId) }} />
          </h2>
          <ul className="option-list">
            {list.map((a) => (
              <li key={a.activityId}>
                <button
                  data-testid={`activity-${a.activityId}`}
                  disabled={a.locked}
                  onClick={() => setSelected(a)}
                >
                  <span>{name(a.activityId)}</span>
                  {a.locked ? (
                    <LockChips activity={a} />
                  ) : (
                    <span className="hint" data-i18n-exempt>
                      {formatDuration(locale, a.actionSeconds)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {selected ? <ConfirmSheet activity={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
