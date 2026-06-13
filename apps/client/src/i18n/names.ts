import { useIntl } from 'react-intl';

/** Content text lookups (`<defId>.<field>` keys, FR-071) + locale list join. */
export function useNames() {
  const intl = useIntl();
  const name = (defId: string) => intl.formatMessage({ id: `${defId}.name` });
  const description = (defId: string) => intl.formatMessage({ id: `${defId}.description` });
  const itemList = (lines: { itemId: string; qty: number }[]) => {
    const parts = lines.map(
      (l) => `${intl.formatNumber(l.qty)}× ${intl.formatMessage({ id: `${l.itemId}.name` })}`,
    );
    return new Intl.ListFormat(intl.locale === 'en' ? 'en' : undefined, {
      style: 'narrow',
      type: 'conjunction',
    }).format(parts);
  };
  return { name, description, itemList };
}
