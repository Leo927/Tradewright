import { FormattedMessage, useIntl } from 'react-intl';
import { useAppState, navigate, stopActivityAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin, formatDuration } from '../i18n/format.js';

function CurrentWork() {
  const { character, activities, locale } = useAppState();
  const intl = useIntl();
  const { name, itemList } = useNames();
  const assignment = character?.assignment ?? null;

  if (assignment?.haltReason) {
    return (
      <section className="card halted" data-testid="current-work">
        <h2 className="section-label">
          <FormattedMessage id="home.current-work" />
        </h2>
        <p data-testid="current-activity-name">
          <strong>{name(assignment.activityId)}</strong>
        </p>
        <p role="status" data-testid="halt-reason">
          <FormattedMessage
            id="home.halted"
            values={{ reason: intl.formatMessage({ id: `halt.${assignment.haltReason}` }) }}
          />
        </p>
        <button className="primary" data-testid="find-work" onClick={() => navigate('activities')}>
          <FormattedMessage id="home.find-work" />
        </button>
      </section>
    );
  }

  if (!assignment) {
    return (
      <section className="card" data-testid="current-work">
        <h2 className="section-label">
          <FormattedMessage id="home.current-work" />
        </h2>
        <p>
          <FormattedMessage id="home.not-working" />
        </p>
        <button className="primary" data-testid="find-work" onClick={() => navigate('activities')}>
          <FormattedMessage id="home.find-work" />
        </button>
      </section>
    );
  }

  const view = activities.find((a) => a.activityId === assignment.activityId);
  return (
    <section className="card" data-testid="current-work">
      <h2 className="section-label">
        <FormattedMessage id="home.current-work" />
      </h2>
      <p data-testid="current-activity-name">
        <strong>{name(assignment.activityId)}</strong>
      </p>
      {view ? (
        <>
          <div className="progress-track" aria-hidden="true">
            <div
              className="progress-fill progress-anim"
              style={{ animationDuration: `${view.actionSeconds}s` }}
            />
          </div>
          <p className="hint" data-testid="action-time">
            <FormattedMessage
              id="activities.confirm.duration"
              values={{ duration: formatDuration(locale, view.actionSeconds) }}
            />
          </p>
          <p className="hint">
            <FormattedMessage
              id="home.action-yield"
              values={{ yield: itemList(view.outputs), xp: view.xpPerAction }}
            />
          </p>
        </>
      ) : null}
      <button data-testid="stop-work" onClick={() => void stopActivityAction()}>
        <FormattedMessage id="home.stop" />
      </button>
    </section>
  );
}

export function SettlementHomeScreen() {
  const { character, storage, locale, newlyUnlockedSkillIds } = useAppState();
  const { name } = useNames();
  if (!character) return null;
  const settlementId =
    character.locationState.kind === 'at' ? character.locationState.settlementId : null;

  return (
    <main className="screen" data-screen="home">
      <header className="screen-header">
        <h1 data-testid="settlement-name">{settlementId ? name(settlementId) : '…'}</h1>
        <span data-testid="wallet" className="wallet">
          {formatCoin(locale, character.wallet)}
        </span>
      </header>
      <p className="hint" data-player-text data-testid="character-name">
        {character.name}
      </p>
      <CurrentWork />
      <section className="card">
        <h2 className="section-label">
          <FormattedMessage id="home.skills" />
        </h2>
        <ul className="plain-list" data-testid="skill-list">
          {character.skills
            .filter((s) => s.xp > 0)
            .map((s) => (
              <li key={s.skillId} data-testid={`skill-${s.skillId}`}>
                <span>{name(s.skillId)}</span>
                <span>
                  <FormattedMessage id="common.level" values={{ level: s.level }} />
                  {newlyUnlockedSkillIds.includes(s.skillId) ? (
                    <em className="badge" data-testid={`unlock-badge-${s.skillId}`}>
                      {' '}
                      <FormattedMessage id="home.unlocked-badge" />
                    </em>
                  ) : null}
                </span>
              </li>
            ))}
        </ul>
      </section>
      {storage ? (
        <section className="card">
          <h2 className="section-label">
            <FormattedMessage id="home.storage" />
          </h2>
          <p data-testid="storage-capacity">
            <FormattedMessage
              id="storage.capacity"
              values={{ used: storage.capacityUsed, capacity: storage.capacity }}
            />
          </p>
          <ul className="plain-list" data-testid="storage-list">
            {storage.slots.map((s) => (
              <li key={s.itemId} data-testid={`stored-${s.itemId}`}>
                <span>{name(s.itemId)}</span>
                <span>
                  <FormattedMessage id="common.quantity" values={{ qty: s.qty }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
