import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { ActivityView } from '@tradewright/contract';
import { useAppState, navigate, assignActivityAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatDuration } from '../i18n/format.js';

/** Compact lock explanations rendered inline as chips (crafting design,
 *  Principle VIII): tier and station gates show the required tier; missing
 *  inputs name exact items + counts, and the holding settlement(s) when the
 *  materials sit elsewhere (FR-022). */
function LockChips({ activity }: { activity: ActivityView }) {
  const { itemList, name } = useNames();
  const intl = useIntl();
  const settlementList = (ids: string[]) =>
    new Intl.ListFormat(intl.locale === 'en' ? 'en' : undefined, {
      style: 'narrow',
      type: 'conjunction',
    }).format(ids.map((id) => name(id)));
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
          case 'STATION_TIER_LOW':
            return (
              <em className="chip" key={i}>
                🔒 <FormattedMessage id="common.tier" values={{ tier: r.requiredTier }} />
              </em>
            );
          case 'INSUFFICIENT_INPUTS': {
            const heldAt = [...new Set(r.missing.flatMap((m) => m.heldAtSettlementIds))];
            return (
              <em className="chip" key={i}>
                {heldAt.length > 0 ? (
                  <FormattedMessage
                    id="activities.missing-inputs-held"
                    values={{ items: itemList(r.missing), where: settlementList(heldAt) }}
                  />
                ) : (
                  <FormattedMessage
                    id="activities.missing-inputs"
                    values={{ items: itemList(r.missing) }}
                  />
                )}
              </em>
            );
          }
        }
      })}
    </span>
  );
}

/** The shared assignment confirm sheet (crafting design: "shared with Work") —
 *  full input/output/ratio/XP detail one tap deeper than the recipe list. */
function ConfirmSheet({ activity, onClose }: { activity: ActivityView; onClose: () => void }) {
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

/** Recipe/activity list grouped by skill, shared by the Work (gathering) and
 *  Crafting (input-consuming) screens — same confirm sheet and assignment flow,
 *  differing only in which activities are shown. */
export function ActivityGroups({
  activities,
  dataScreen,
  titleId,
}: {
  activities: ActivityView[];
  dataScreen: string;
  titleId: string;
}) {
  const { character, locale } = useAppState();
  const { name } = useNames();
  const [selected, setSelected] = useState<ActivityView | null>(null);

  const bySkill = new Map<string, ActivityView[]>();
  for (const a of activities) {
    bySkill.set(a.skillId, [...(bySkill.get(a.skillId) ?? []), a]);
  }
  const levelOf = (skillId: string) =>
    character?.skills.find((s) => s.skillId === skillId)?.level ?? 1;

  return (
    <main className="screen" data-screen={dataScreen}>
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id={titleId} />
        </h1>
      </header>
      {bySkill.size === 0 ? (
        <p className="hint">
          <FormattedMessage id="common.empty-list" />
        </p>
      ) : null}
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
