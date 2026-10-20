'use client';

import { CONTENT_KINDS, FIELD_LABELS, LIMITS, RESOURCE_TYPES } from '../utils/contentSubmissions.js';

// The form for one piece of content (migration 0024): the owner's Add and Edit
// on their dashboard, and the admin's review pane, which is the same form with
// their values in it. Validation is utils/contentSubmissions.js, on the server.

export const inputClass =
  'w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

// The form's fields, per kind, in order: [column, hint, placeholder, type].
const FIELDS = {
  video: [
    ['platform_url', 'youtube.com, youtu.be or a Short. We fill the title in from YouTube.', 'https://www.youtube.com/watch?v=…'],
    ['title', null, ''],
  ],
  book: [
    ['amazon_url', 'The book’s page on Amazon.', 'https://www.amazon.com/dp/…'],
    ['title', null, ''],
    ['author', null, ''],
    ['description', 'Optional.', '', 'textarea'],
  ],
  course: [
    ['title', null, ''],
    ['course_url', 'The full link to its page on your own site.', 'https://…'],
    ['description', null, '', 'textarea'],
    ['price', 'Optional. As you’d write it, e.g. “£120”.', ''],
  ],
  retreat: [
    ['title', null, ''],
    ['course_url', 'The full link to its page on your own site.', 'https://…'],
    ['description', null, '', 'textarea'],
    ['price', 'Optional. As you’d write it, e.g. “£950”.', ''],
    ['start_date', null, '', 'date'],
    ['end_date', null, '', 'date'],
  ],
  membership: [
    ['title', null, ''],
    ['course_url', 'The full link to its page on your own site.', 'https://…'],
    ['description', null, '', 'textarea'],
    ['price', 'Optional. As you’d write it, e.g. “£20/month”.', ''],
  ],
  download: [
    ['title', null, ''],
    ['course_url', 'The full link to its page on your own site.', 'https://…'],
    ['description', null, '', 'textarea'],
    ['price', 'Optional.', ''],
  ],
  free_resource: [
    ['title', null, ''],
    ['resource_url', 'The full link to it.', 'https://…'],
    ['resource_type', null, '', 'resource_type'],
    ['description', null, '', 'textarea'],
  ],
};

export function formFieldsFor(kind) {
  return (FIELDS[kind] || []).map(([column]) => column);
}

function shown(value) {
  if (value === null || value === undefined || value === '') return 'Empty';
  return String(value);
}

export function Field({ id, label, hint, error, was, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-2">{children}</div>
      {was !== undefined && (
        <p className="mt-1 text-xs text-amber-300/80">
          Was: <span className="break-all">{shown(was)}</span>
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// `values` and `onChange(column, value)`: the form's state, kept by the
// parent. `before`: the live row, for an edit; a field that differs from it
// shows what it was. `onLinkBlur`: a video link was entered (to fill the title).
export default function ContentForm({ kind, values, onChange, errors = {}, before = null, onLinkBlur, idPrefix = 'cf' }) {
  const fields = FIELDS[kind] || [];
  return (
    <div className="flex flex-col gap-4">
      {fields.map(([column, hint, placeholder, type]) => {
        const id = `${idPrefix}-${column}`;
        const value = values[column] ?? '';
        const changed = before && String(before[column] ?? '') !== String(value ?? '');
        const props = {
          id,
          value,
          onChange: (e) => onChange(column, e.target.value),
          placeholder,
          className: `${inputClass} ${changed ? 'border-amber-400/60' : ''}`,
        };
        let control;
        if (type === 'textarea') {
          control = <textarea rows={5} maxLength={LIMITS.description} {...props} className={`${props.className} resize-y`} />;
        } else if (type === 'date') {
          control = <input type="date" {...props} />;
        } else if (type === 'resource_type') {
          control = (
            <select {...props}>
              <option value="">Choose…</option>
              {RESOURCE_TYPES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          );
        } else {
          control = (
            <input
              type={column.endsWith('_url') ? 'url' : 'text'}
              maxLength={column === 'price' ? LIMITS.price : LIMITS.title + 100}
              {...props}
              onBlur={column === 'platform_url' && onLinkBlur ? () => onLinkBlur(value) : undefined}
            />
          );
        }
        return (
          <Field
            key={column}
            id={id}
            label={FIELD_LABELS[column] || column}
            hint={hint}
            error={errors[column]}
            was={changed ? before[column] : undefined}
          >
            {control}
          </Field>
        );
      })}
    </div>
  );
}

// 1 to 5 subjects, from the existing list.
export function SubjectPicker({ subjects, chosen, onChange, error, was }) {
  const toggle = (slug) => {
    if (chosen.includes(slug)) onChange(chosen.filter((s) => s !== slug));
    else if (chosen.length < LIMITS.subjects) onChange([...chosen, slug]);
  };
  const names = new Map((subjects || []).map((s) => [s.slug, s.name]));
  return (
    <Field
      id="subjects"
      label="Subjects"
      hint={`Choose 1 to ${LIMITS.subjects}. ${chosen.length} chosen.`}
      error={error}
      was={was ? was.map((s) => names.get(s) || s).join(', ') : undefined}
    >
      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/10 p-3">
        {(subjects || []).map((s) => {
          const on = chosen.includes(s.slug);
          return (
            <button
              key={s.slug}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.slug)}
              disabled={!on && chosen.length >= LIMITS.subjects}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
                on ? 'border-[#7c3aed] bg-[#7c3aed]/30 text-white' : 'border-white/15 text-gray-400 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function kindLabel(kind) {
  return CONTENT_KINDS[kind]?.label || (kind === 'download' ? 'Download' : 'Item');
}
