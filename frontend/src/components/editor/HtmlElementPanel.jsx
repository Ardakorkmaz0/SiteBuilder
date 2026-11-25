import { useState } from 'react'
import PanelGroup from './PanelGroup.jsx'
import PanelTabs from './PanelTabs.jsx'
import PropertiesHeader from './PropertiesHeader.jsx'
import ContentFields from './ContentFields.jsx'
import MobileOverrideBanner from './MobileOverrideBanner.jsx'
import TypographyFields from './TypographyFields.jsx'
import ColorFields from './ColorFields.jsx'
import BorderFields from './BorderFields.jsx'
import EffectsFields from './EffectsFields.jsx'
import AlignmentFields from './AlignmentFields.jsx'
import SizeFields from './SizeFields.jsx'
import SpacingFields from './SpacingFields.jsx'
import PositionStackFields from './PositionStackFields.jsx'
import FlexLayoutFields from './FlexLayoutFields.jsx'
import MotionFields from './MotionFields.jsx'
import { createHtmlInspectorAdapter } from './inspectorAdapters.js'
import { PROPERTIES_TABS } from './propertiesTabs.js'
import { htmlTagKindIcon } from './elementKindIcons.js'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'

const TAG_LABELS = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4',
  h5: 'Heading 5', h6: 'Heading 6', p: 'Paragraph', a: 'Link',
  button: 'Button', img: 'Image', li: 'List item', ul: 'List', ol: 'List',
  span: 'Text', section: 'Section', header: 'Header', footer: 'Footer',
  nav: 'Navigation', div: 'Block', blockquote: 'Quote', figure: 'Figure',
  label: 'Label', td: 'Table cell', th: 'Table header',
}

// The navigation editor: the whole menu at once, rather than clicking each
// item in turn. A new row is cloned from the last link in the markup, so it
// arrives with the template's own classes and looks like it belongs.
function LinkListEditor({ links, onChange }) {
  const { t } = useLanguage()
  const update = (index, patch) => {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)))
  }
  const move = (index, delta) => {
    const next = [...links]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={index} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-2">
          <div className="flex items-center gap-1.5">
            <input
              value={link.text}
              onChange={(event) => update(index, { text: event.target.value })}
              aria-label={t('Link label')}
              placeholder={t('Link label')}
              className="studio-input min-w-0 flex-1 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={t('Move up')}
              title={t('Move up')}
              className="studio-icon-btn h-7 w-7 shrink-0 disabled:opacity-30"
            >
              <ArrowUpIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === links.length - 1}
              aria-label={t('Move down')}
              title={t('Move down')}
              className="studio-icon-btn h-7 w-7 shrink-0 disabled:opacity-30"
            >
              <ArrowDownIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              aria-label={t('Remove link')}
              title={t('Remove link')}
              className="studio-icon-btn h-7 w-7 shrink-0 text-[var(--studio-danger)]"
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <input
            value={link.href}
            onChange={(event) => update(index, { href: event.target.value })}
            aria-label={t('Link target')}
            placeholder="#section"
            className="studio-input mt-1.5 w-full px-2 py-1.5 font-mono text-[11px]"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { text: t('New link'), href: '#' }])}
        disabled={!links.length}
        title={links.length ? undefined : t('This menu has no link to copy the style from yet.')}
        className="studio-btn studio-btn-secondary w-full px-2 py-1.5 text-xs disabled:opacity-40"
      >
        <PlusIcon size={13} />
        <span>{t('Add link')}</span>
      </button>
    </div>
  )
}

export default function HtmlElementPanel({
  info,
  viewport = 'pc',
  pages = [],
  onChange,
  onSelectParent,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onResetMobile,
  onMotionChange,
  onClose,
}) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('content')
  const [actionsOpen, setActionsOpen] = useState(false)
  if (!info) return null

  const adapter = createHtmlInspectorAdapter({
    info,
    viewport,
    pages,
    onChange,
    onResetMobile,
  })
  const label = t(TAG_LABELS[info.tag] || `<${info.tag}>`)
  const isMobile = viewport === 'mobile'
  const hasContent = adapter.hasAny(['text', 'href', 'src', 'alt'])
  const panelLabel = t(PROPERTIES_TABS.find(([id]) => id === tab)?.[1] || 'Content')

  return (
    <div className="studio-properties-panel flex h-full min-w-0 flex-col overflow-hidden">
      <PropertiesHeader
        icon={htmlTagKindIcon(info.tag)}
        title={label}
        badge={t(isMobile ? 'Mobile' : 'PC')}
        detail={`<${info.tag}>${info.classes ? ` .${info.classes.split(' ').join(' .')}` : ''}`}
        detailTitle={info.classes}
        onDeselect={onClose}
        parentName={info.hasParent ? `<${info.parentTag}>` : null}
        parentTitle={info.hasParent ? t('Select the containing {tag}', { tag: info.parentTag }) : undefined}
        onSelectParent={info.hasParent ? onSelectParent : undefined}
        trail={info.ancestors?.length ? `${info.ancestors.join(' › ')} › ${info.tag}` : null}
      />

      <PanelTabs
        value={tab}
        onChange={setTab}
        tabs={PROPERTIES_TABS.map(([id, tabLabel, Icon]) => [id, t(tabLabel), Icon])}
      />

      <div
        role="tabpanel"
        aria-label={panelLabel}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[var(--studio-panel-muted)] p-2.5"
      >
        {tab === 'content' && (
          <>
            {hasContent && (
              <PanelGroup id="content" title={t('Content')} defaultOpen>
                <ContentFields adapter={adapter} />
              </PanelGroup>
            )}
            {info.links && (
              <PanelGroup id="menu-links" title={t('Menu links')} defaultOpen>
                <LinkListEditor links={info.links} onChange={(links) => onChange({ links })} />
              </PanelGroup>
            )}
            {!hasContent && !info.links && (
              <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-3 text-xs leading-relaxed text-[var(--studio-text-muted)]">
                {t('This element has no editable text, link or image content.')}
              </div>
            )}
            <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] px-3 py-2 text-[11px] leading-relaxed text-[var(--studio-text-faint)]">
              {t('Tip: you can also click into the page and type directly. Style changes here are applied to this element only.')}
            </div>
          </>
        )}

        {tab === 'design' && (
          <>
            {isMobile && (
              <MobileOverrideBanner
                count={adapter.mobileOverrideCount}
                onReset={onResetMobile}
              />
            )}
            <TypographyFields adapter={adapter} />
            <ColorFields adapter={adapter} />
            <BorderFields adapter={adapter} />
            <EffectsFields adapter={adapter} />
          </>
        )}

        {tab === 'layout' && (
          <>
            {isMobile && (
              <MobileOverrideBanner
                count={adapter.mobileOverrideCount}
                onReset={onResetMobile}
              />
            )}
            <AlignmentFields adapter={adapter} />
            <SizeFields adapter={adapter} scopeLabel={t(isMobile ? 'mobile' : 'PC')} />
            <SpacingFields adapter={adapter} />
            <PositionStackFields adapter={adapter} />
            <FlexLayoutFields adapter={adapter} />
          </>
        )}

        {tab === 'motion' && (
          <PanelGroup id="motion" title={t('Motion')} defaultOpen>
            <MotionFields motion={info.motion} onChange={(patch) => onMotionChange?.(patch)} />
          </PanelGroup>
        )}
      </div>

      <div
        role="region"
        aria-label={t('Arrange')}
        className="shrink-0 border-t border-[var(--studio-border)] bg-[var(--studio-panel)] p-2.5 shadow-[0_-10px_28px_color-mix(in_srgb,var(--studio-shell)_72%,transparent)]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
          <button type="button" onClick={onDuplicate} className="studio-btn studio-btn-secondary min-w-0 px-2 text-xs">
            <CopyIcon size={14} className="shrink-0" />
            <span className="truncate">{t('Duplicate')}</span>
          </button>
          <button
            type="button"
            aria-label={t('Delete component')}
            onClick={onDelete}
            className="studio-btn min-w-0 border border-[color-mix(in_srgb,var(--studio-danger)_34%,var(--studio-border))] bg-[var(--studio-danger-soft)] px-2 text-xs text-[var(--studio-danger)] hover:bg-[color-mix(in_srgb,var(--studio-danger)_16%,var(--studio-panel-raised))]"
          >
            <TrashIcon size={14} className="shrink-0" />
            <span className="truncate">{t('Delete')}</span>
          </button>
          <button
            type="button"
            aria-label={t('More actions')}
            title={t('More actions')}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((open) => !open)}
            className={`studio-icon-btn h-9 w-9 border ${
              actionsOpen
                ? 'border-[color-mix(in_srgb,var(--studio-accent)_34%,var(--studio-border))] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]'
                : 'border-[var(--studio-border)] bg-[var(--studio-control)]'
            }`}
          >
            <MoreHorizontalIcon size={16} />
          </button>
        </div>
        {actionsOpen && (
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-2 shadow-[var(--studio-shadow-sm)]">
            <button type="button" onClick={onMoveUp} className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs">
              {t('Move up')}
            </button>
            <button type="button" onClick={onMoveDown} className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs">
              {t('Move down')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
